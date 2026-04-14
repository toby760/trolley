// ============================================
// GATEKEEPER — price lookup with credit protection
// --------------------------------------------
// SerpApi has a hard monthly cap (~250 lookups). Every call we can avoid
// saves Toby a credit, so the Gatekeeper is aggressive about reusing
// prices we already know.
//
// Row tagging (no schema change):
//   purchase_count >  0  →  row came from a scanned RECEIPT (ground truth)
//   purchase_count == 0  →  row came from a SerpApi call    (cached estimate)
//
// Lookup tiers (all free):
//   T1. Receipt row for THIS store       → ground truth for this store, use it
//   T2. Receipt row for ANY store        → receipt is still ground truth even if
//                                           we bought it elsewhere — use it
//   T3. SerpApi-cached row for ANY store → previously-paid estimate, reuse it
//                                           rather than burn another credit
//   T4. Call SerpApi (1 credit), then cache the result at purchase_count=0 so
//       future photos of the same product are free. When a receipt later
//       lands for this product the upsert in ReceiptScanner.jsx will
//       overwrite the SerpApi estimate with the real receipt price.
// ============================================

import { supabase } from './supabase';

/**
 * @param {string} productName - e.g. "Campos King St Coffee 250g"
 * @param {string} householdId - uuid of the current household
 * @param {object} [opts]
 * @param {string} [opts.store]  - 'aldi' | 'woolworths'
 * @param {string} [opts.brand]  - e.g. "Campos"  (used for SerpApi query)
 * @param {string} [opts.weight] - e.g. "250g"    (used for SerpApi query)
 * @returns {Promise<number|null>} resolved price in AUD, or null if nothing found
 */
export async function getPriceWithGatekeeper(productName, householdId, opts = {}) {
  if (!productName || !householdId) return null;

  const { store = null, brand = '', weight = '' } = opts;

  // Tiered lookup against price_memory (free).
  try {
    const { data: rows } = await supabase
      .from('price_memory')
      .select('*')
      .eq('household_id', householdId)
      .ilike('product_name', productName);

    if (rows && rows.length > 0) {
      // T1 + T2: prefer any receipt-sourced row (purchase_count > 0), with a
      // tiebreak for the current store so per-store pricing wins when we have it.
      const receiptRows = rows.filter(r => (r.purchase_count || 0) > 0);
      if (receiptRows.length > 0) {
        const sameStore = store && receiptRows.find(r => r.store === store);
        return (sameStore || receiptRows[0]).last_known_price;
      }

      // T3: fall back to any SerpApi-cached row — avoids burning a second credit
      // on a product we already paid SerpApi to price once before.
      const serpRows = rows.filter(r => (r.purchase_count || 0) === 0);
      if (serpRows.length > 0) {
        return serpRows[0].last_known_price;
      }
    }
  } catch (memErr) {
    console.error('price_memory lookup failed, continuing to SerpApi', memErr);
  }

  // T4: SerpApi call — COSTS 1 CREDIT of the monthly 250.
  let price = null;
  try {
    const res = await fetch('/api/serpapi-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, brand, weight })
    });
    if (!res.ok) return null;
    const data = await res.json();
    price = typeof data?.price === 'number' ? data.price : null;
  } catch (e) {
    console.error('SerpApi proxy call failed', e);
    return null;
  }

  if (price == null) return null;

  // Cache the SerpApi result tagged with purchase_count=0 so we can tell it
  // apart from receipt-sourced rows. Use upsert with the existing unique
  // constraint so that a later receipt scan for the same (household, product,
  // store) overwrites this estimate with the real receipt price.
  try {
    await supabase.from('price_memory').upsert({
      household_id: householdId,
      product_name: productName,
      store: store || 'woolworths',
      last_known_price: price,
      purchase_count: 0,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'household_id,product_name,store'
    });
  } catch (cacheErr) {
    // Non-fatal — we still return the price we paid for.
    console.error('Could not persist new price into price_memory', cacheErr);
  }

  return price;
}
