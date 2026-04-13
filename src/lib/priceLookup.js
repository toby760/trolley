// Gatekeeper price lookup.
// Checks Supabase price_memory first so we only spend SerpApi credits on
// genuinely new items. ~250 searches per month -> keep this disciplined.
import { supabase } from './supabase';

function normalize(name) {
  return (name || '').trim().toLowerCase();
}

export async function getPriceWithGatekeeper({ name, brand, weight, store, householdId }) {
  if (!name || !householdId) {
    return { price: null, source: 'missing-input' };
  }

  const normalized = normalize(name);

  // STEP 1 - Check this household's price_memory for an existing match
  try {
    const { data } = await supabase
      .from('price_memory')
      .select('product_name, last_known_price, updated_at')
      .eq('household_id', householdId)
      .ilike('product_name', normalized)
      .maybeSingle();

    if (data && data.last_known_price) {
      return {
        price: Number(data.last_known_price),
        source: 'cache',
        cached_at: data.updated_at
      };
    }
  } catch (err) {
    console.warn('price_memory lookup failed:', err && err.message);
  }

  // STEP 2 - Cache miss: ask the server to query SerpApi
  let serpResult = null;
  try {
    const response = await fetch('/api/serpapi-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, brand, weight, store })
    });

    if (response.ok) {
      serpResult = await response.json();
    }
  } catch (err) {
    console.error('SerpApi fetch failed:', err && err.message);
  }

  if (!serpResult || !serpResult.price || serpResult.price <= 0) {
    return { price: null, source: 'serpapi-no-match' };
  }

  // STEP 3 - Save the fresh price so future adds of this item are free
  try {
    await supabase
      .from('price_memory')
      .upsert(
        {
          household_id: householdId,
          product_name: name.trim(),
          last_known_price: serpResult.price,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'household_id,product_name' }
      );
  } catch (err) {
    console.warn('price_memory upsert failed:', err && err.message);
  }

  return { price: serpResult.price, source: 'serpapi-fresh' };
}
