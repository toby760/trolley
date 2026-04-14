// ============================================
// GATEKEEPER - price lookup with credit protection
// --------------------------------------------
// SerpApi has a hard monthly cap (~250 lookups). Every call we can avoid
// saves Toby a credit, so the Gatekeeper is aggressive about reusing
// prices we already know.
//
// Row tagging (no schema change):
//   purchase_count > 0  -> row came from a scanned RECEIPT (ground truth)
//   purchase_count == 0 -> row came from a SerpApi call (cached estimate)
//
// Lookup tiers:
//   T1. Receipt row for THIS store  -> ground truth for this store, use it
//   T2. Receipt row for ANY store   -> receipt is still ground truth even
//                                       if bought elsewhere, use it
//   T3. SerpApi-cached row (any store) -> previously-paid estimate, reuse
//   T4. Call SerpApi (1 credit), then cache at purchase_count=0
//
// Mode gating:
//   mode === 'typed' (default): T1 -> T2 -> T3, then return null so the
//     caller falls back to the estimate system. NO live SerpApi call.
//   mode === 'photo': T1 -> T2 -> T3 -> T4. Only a Smart Photo with
//     extracted brand + size is specific enough to justify a live call.
// ============================================

import { supabase } from './supabase';

/**
 * @param {object} params
 * @param {string} params.name - product name (e.g. "Campos King St Coffee 250g")
 * @param {string} params.householdId - uuid of the current household
 * @param {'typed'|'photo'} [params.mode='typed'] - entry path
 * @param {string} [params.store] - 'aldi' | 'woolworths'
 * @param {string} [params.brand] - e.g. "Campos" (used for SerpApi query)
 * @param {string} [params.weight] - e.g. "250g" (used for SerpApi query)
 * @returns {Promise<{price:number, source:string}|null>}
 */
export async function getPriceWithGatekeeper(params = {}) {
  const {
    name,
    householdId,
    mode = 'typed',
    store = null,
    brand = '',
    weight = ''
  } = params || {};

  if (!name || !householdId) return null;

  // Tiered lookup against price_memory (free).
  try {
    const { data: rows } = await supabase
      .from('price_memory')
      .select('*')
      .eq('household_id', householdId)
      .ilike('product_name', name);

    if (rows && rows.length > 0) {
      // T1 + T2: prefer any receipt-sourced row (purchase_count > 0).
      // Tiebreak on current store so per-store pricing wins when we have it.
      const receiptRows = rows.filter(r => (r.purchase_count || 0) > 0);
      if (receiptRows.length > 0) {
        const sameStore = store && receiptRows.find(r => r.store === store);
        const picked = sameStore || receiptRows[0];
        return {
          price: picked.last_known_price,
          source: 'receipt-memory'
        };
      }
      // T3: fall back to any SerpApi-cached row.
      const serpRows = rows.filter(r => (r.purchase_count || 0) === 0);
      if (serpRows.length > 0) {
        return {
          price: serpRows[0].last_known_price,
          source: 'serpapi-memory'
        };
      }
    }
  } catch (memErr) {
    console.error('price_memory lookup failed', memErr);
  }

  // T4 is gated. Typed items stop here and let the caller estimate.
  if (mode !== 'photo') {
    return null;
  }

  // T4: live SerpApi call - COSTS 1 CREDIT. Only for photo-identified
  // products with brand + size extracted, which is specific enough to
  // get a meaningful price back.
  let price = null;
  try {
    const res = await fetch('/api/serpapi-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, brand, weight, store })
    });
    if (!res.ok) return null;
    const data = await res.json();
    price = typeof data?.price === 'number' ? data.price : null;
  } catch (e) {
    console.error('SerpApi proxy call failed', e);
    return null;
  }

  if (price == null) return null;

  // Cache the SerpApi result tagged with purchase_count=0.
  // A later receipt scan for the same (household, product, store) will
  // overwrite this estimate with the real receipt price via upsert.
  try {
    await supabase.from('price_memory').upsert({
      household_id: householdId,
      product_name: name,
      store: store || 'woolworths',
      last_known_price: price,
      purchase_count: 0,
      updated_at: new Date().toISOString()
    }, { onConflict: 'household_id,product_name,store' });
  } catch (cacheErr) {
    // Non-fatal - we still return the price we paid for.
    console.error('Could not persist new price into price_memory', cacheErr);
  }

  return { price, source: 'serpapi-fresh' };
}
