import React, { useRef, useState } from 'react';
import { IconX, IconCamera } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { useHousehold } from '../hooks/useHousehold';

export default function ReceiptScanner({ open, onClose, store, onComplete }) {
  const { household, currentWeek } = useHousehold();
  const fileInputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
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
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Parse receipt text
      const parsed = parseReceipt(text, store);
      setResult(parsed);

      // Save to Supabase
      if (household && currentWeek) {
        await supabase.from('receipts').insert({
          household_id: household.id,
          week_id: currentWeek.id,
          store: store,
          total: parsed.total,
          items_json: parsed.items,
          raw_ocr_text: text
        });

        // Update week actual spend
        const field = store === 'aldi' ? 'aldi_actual' : 'woolworths_actual';
        await supabase
          .from('weeks')
          .update({ [field]: parsed.total })
          .eq('id', currentWeek.id);

        // Update price memory for recognised items
        for (const item of parsed.items) {
          if (item.name && item.price) {
            await supabase.from('price_memory').upsert({
              household_id: household.id,
              product_name: item.name,
              store: store,
              last_known_price: item.price,
              purchase_count: 1,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'household_id,product_name,store'
            });
          }
        }
      }
    } catch (e) {
      console.error('Receipt OCR error:', e);
      setError('Failed to read receipt. Try taking a clearer photo.');
    }
    setProcessing(false);
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
          {store === 'aldi' ? 'Aldi' : 'Woolworths'} receipt — take a photo or choose from gallery
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
            <p style={{ fontWeight: 700 }}>Reading your receipt...</p>
            <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>This may take a moment</p>
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

            {result.items.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                {result.items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: 14
                  }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--green-300)' }}>
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={() => { onComplete?.(result); onClose(); }}
            >
              Save Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple receipt parser
function parseReceipt(text, store) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const items = [];
  let total = 0;

  // Look for price patterns like "Item Name    $4.50" or "Item Name    4.50"
  const priceRegex = /^(.+?)\s+\$?(\d+\.\d{2})\s*$/;
  const totalRegex = /(?:total|subtotal|amount|due)\s*:?\s*\$?(\d+\.\d{2})/i;

  for (const line of lines) {
    // Check for total
    const totalMatch = line.match(totalRegex);
    if (totalMatch) {
      total = parseFloat(totalMatch[1]);
      continue;
    }

    // Check for item + price
    const itemMatch = line.match(priceRegex);
    if (itemMatch) {
      const name = itemMatch[1].replace(/[^a-zA-Z0-9\s'-]/g, '').trim();
      const price = parseFloat(itemMatch[2]);
      if (name.length > 1 && price > 0 && price < 200) {
        items.push({ name, price });
      }
    }
  }

  // If no total found, sum items
  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, i) => sum + i.price, 0);
  }

  return { items, total, rawText: text };
}
