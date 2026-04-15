import React, { useRef, useState } from 'react';
import { IconX, IconCamera } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../hooks/useHousehold';
import { matchItems } from '../lib/matcher';

export default function ReceiptScanner({ open, onClose, store, onComplete }) {
  const { household, currentWeek } = useHousehold();
  const fileInputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImage(file);
  };

  const processImage = async (file) => {
    setProcessing(true);
    setError('');
    setResult(null);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mode: 'receipt', store })
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      if (!data.items || !Array.isArray(data.items)) throw new Error('Invalid response');

      const items = data.items.map(item => ({
        name: item.item_name || item.name || 'Unknown item',
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
        quantity: item.quantity || 1
      }));

      const total = typeof data.total === 'number'
        ? data.total
        : items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

      setResult({ items, total, raw: data });
    } catch (e) {
      console.error('Receipt scan error:', e);
      setError('Failed to read receipt. Try taking a clearer photo with good lighting.');
    }
    setProcessing(false);
  };
  const handleSave = async () => {
    if (!result) { onClose(); return; }
    if (!household || !currentWeek) { onComplete?.(result); onClose(); return; }
    setSaving(true);
    try {
      // 1. Find pending shop trip for this store/week
      const { data: trips } = await supabase
        .from('shop_trips')
        .select('id')
        .eq('household_id', household.id)
        .eq('week_id', currentWeek.id)
        .eq('store', store)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      const trip = trips && trips[0];

      // 2. Fetch items attached to this trip
      let tripItems = [];
      if (trip) {
        const { data: ti } = await supabase
          .from('items')
          .select('id, name')
          .eq('trip_id', trip.id);
        tripItems = ti || [];
      }

      // 3. Fuzzy-match list items vs receipt lines
      const { matched, unmatchedReceipt } = matchItems(tripItems, result.items, 0.3);

      // 4. Save receipt row (linked to trip if present)
      const { data: rReceipt } = await supabase.from('receipts').insert({
        household_id: household.id,
        week_id: currentWeek.id,
        trip_id: trip ? trip.id : null,
        store: store,
        total: result.total,
        items_json: result.items,
        raw_ocr_text: JSON.stringify(result.raw || {})
      }).select().single();

      // 5. Matched items: set actual_price, receipt_name, write alias + price_memory
      for (const m of matched) {
        await supabase
          .from('items')
          .update({ actual_price: m.receipt.price, receipt_name: m.receipt.name })
          .eq('id', m.item.id);

        await supabase.from('product_aliases').upsert({
          household_id: household.id,
          alias: m.item.name,
          receipt_name: m.receipt.name,
          store: store,
          last_price: m.receipt.price,
          match_count: 1,
          last_seen_at: new Date().toISOString()
        }, { onConflict: 'household_id,alias,receipt_name,store' });

        // Seed price_memory under BOTH the user's name and the receipt name
        await supabase.from('price_memory').upsert({
          household_id: household.id,
          product_name: m.item.name,
          store: store,
          last_known_price: m.receipt.price,
          purchase_count: 1,
          updated_at: new Date().toISOString()
        }, { onConflict: 'household_id,product_name,store' });

        await supabase.from('price_memory').upsert({
          household_id: household.id,
          product_name: m.receipt.name,
          store: store,
          last_known_price: m.receipt.price,
          purchase_count: 1,
          updated_at: new Date().toISOString()
        }, { onConflict: 'household_id,product_name,store' });
      }

      // 6. Unmatched receipt lines: still index into price_memory
      for (const r of unmatchedReceipt) {
        if (r.name && r.price > 0) {
          await supabase.from('price_memory').upsert({
            household_id: household.id,
            product_name: r.name,
            store: store,
            last_known_price: r.price,
            purchase_count: 1,
            updated_at: new Date().toISOString()
          }, { onConflict: 'household_id,product_name,store' });
        }
      }

      // 7. Mark the trip reconciled
      if (trip && rReceipt) {
        await supabase
          .from('shop_trips')
          .update({ status: 'reconciled', reconciled_at: new Date().toISOString(), receipt_id: rReceipt.id })
          .eq('id', trip.id);
      }

      // 8. Update week actual spend
      const field = store === 'aldi' ? 'aldi_actual' : 'woolworths_actual';
      await supabase
        .from('weeks')
        .update({ [field]: result.total })
        .eq('id', currentWeek.id);

      onComplete?.(result);
      onClose();
    } catch (e) {
      console.error('Receipt save error:', e);
      setError('Failed to save receipt. Please try again.');
    }
    setSaving(false);
  };
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Scan Receipt</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-300)', cursor: 'pointer', padding: 8 }}>
            <IconX size={24} />
          </button>
        </div>

        <p style={{ color: 'var(--gray-300)', marginBottom: 16, fontSize: 14 }}>
          {store === 'aldi' ? 'Aldi' : 'Woolworths'} receipt — snap a photo and Gemini AI will read every item
        </p>

        {!result && !processing && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-primary btn-full"
              style={{ marginBottom: 12 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconCamera size={20} />
              Take Photo of Receipt
            </button>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = e.target.files?.[0];
                  if (file) processImage(file);
                };
                input.click();
              }}
            >
              Choose from Gallery
            </button>
            <button
              className="btn btn-secondary btn-full"
              style={{ marginTop: 8, color: 'var(--gray-400)' }}
              onClick={onClose}
            >
              Skip for Now
            </button>
          </>
        )}

        {processing && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 700 }}>Gemini is reading your receipt...</p>
            <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>
              Identifying every item and price
            </p>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--red-500)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            textAlign: 'center',
            marginBottom: 16
          }}>
            <p style={{ fontWeight: 700, color: 'var(--red-400)' }}>{error}</p>
            <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setError('')}>
              Try Again
            </button>
          </div>
        )}
        {result && (
          <div className="animate-slide-up">
            <div style={{
              background: 'var(--green-700)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-300)', marginBottom: 8 }}>
                    Receipt Total
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--green-300)' }}>
                    ${result.total.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>
                    {result.items.length} items detected
                  </div>
                </div>
                <div style={{
                  background: 'var(--green-600)',
                  borderRadius: 12,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--green-200)'
                }}>
                  AI PARSED
                </div>
              </div>
            </div>

            {result.items.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                {result.items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: 14
                  }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      {item.quantity > 1 && (
                        <span style={{ color: 'var(--gray-400)', fontSize: 12, marginLeft: 6 }}>
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--green-300)' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Receipt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
