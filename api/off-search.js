// Vercel Serverless Function — Open Food Facts proxy for Trolley autocomplete.
// Direct browser fetches to openfoodfacts.org are intermittently blocked by
// CORS / CDN flakiness, causing the Add Item search to return no suggestions.
// Calling it server-to-server here is reliable.
//
// We return up to 50 products with product_name + brands + quantity +
// categories_tags so the client can apply its own relevance filter (every
// search term must appear in the product name).
//
// Strategy: OFF v2's `search_terms` biases popularity but does NOT text-filter,
// so typing "milk" otherwise returns Weet-Bix/Vegemite. Category filters DO
// actually filter — so we try category=<term>s then category=<term> first for
// generic food words. For brand-ish queries (vegemite, tim tam) categories
// return nothing, so we fall back to CGI text search which does filter by
// name, then the v2 popularity endpoints as a last resort.

export default async function handler(req, res) {
  const q = (req.query?.q || '').toString().trim();
  if (!q || q.length < 2) {
    return res.status(200).json({ products: [] });
  }
  // Hard 9.5s cap — Vercel hobby serverless limit is 10s
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9500);
  const enc = encodeURIComponent(q);
  const fields = 'product_name,brands,quantity,categories_tags';
  // Order matters: category filters give the most relevant AU results for
  // generic food words; CGI text search handles brand queries; v2 popularity
  // endpoints are the fallback when nothing else works.
  const endpoints = [
    `https://world.openfoodfacts.org/api/v2/search?categories_tags_en=${enc}s&countries_tags_en=australia&sort_by=popularity_key&fields=${fields}&page_size=50`,
    `https://world.openfoodfacts.org/api/v2/search?categories_tags_en=${enc}&countries_tags_en=australia&sort_by=popularity_key&fields=${fields}&page_size=50`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=50&fields=${fields}`,
    `https://world.openfoodfacts.org/api/v2/search?search_terms=${enc}&countries_tags_en=australia&sort_by=popularity_key&fields=${fields}&page_size=50`,
    `https://au.openfoodfacts.org/api/v2/search?search_terms=${enc}&sort_by=popularity_key&fields=${fields}&page_size=50`
  ];
  let lastError = null;
  for (const url of endpoints) {
    try {
      const offRes = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Trolley/1.0 (https://trolley-puce.vercel.app)',
          'Accept': 'application/json'
        }
      });
      if (!offRes.ok) { lastError = `OFF ${offRes.status} on ${hostOf(url)}`; continue; }
      const data = await offRes.json();
      const products = (data?.products || [])
        .filter(p => p && p.product_name && typeof p.product_name === 'string')
        .map(p => ({
          product_name: p.product_name,
          brands: p.brands || '',
          quantity: p.quantity || '',
          categories_tags: p.categories_tags || []
        }))
        .slice(0, 50);
      if (products.length === 0) { lastError = `OFF 0-results on ${hostOf(url)}`; continue; }
      clearTimeout(timer);
      // Short CDN cache so repeated typing doesn't keep hammering OFF
      res.setHeader(
        'Cache-Control',
        'public, s-maxage=3600, stale-while-revalidate=86400'
      );
      return res.status(200).json({ products, source: hostOf(url) });
    } catch (err) {
      if (err.name === 'AbortError') {
        clearTimeout(timer);
        return res.status(200).json({ products: [], timeout: true });
      }
      lastError = `${err.message || err} on ${hostOf(url)}`;
    }
  }
  clearTimeout(timer);
  // Never 5xx for a best-effort autocomplete — the UI falls back gracefully.
  return res.status(200).json({ products: [], error: lastError || 'unavailable' });
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return 'unknown'; }
}
