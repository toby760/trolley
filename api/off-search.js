// Vercel Serverless Function — Open Food Facts proxy for Trolley autocomplete.
// Direct browser fetches to openfoodfacts.org are intermittently blocked by
// CORS / CDN flakiness, causing the Add Item search to return no suggestions.
// Calling it server-to-server here is reliable, and we try multiple endpoints
// (v2 API first, CGI fallback) and multiple hosts (AU first for relevance,
// world as a fallback) so one 503 from OFF doesn't kill the dropdown.

export default async function handler(req, res) {
  const q = (req.query?.q || '').toString().trim();

  if (!q || q.length < 2) {
    return res.status(200).json({ products: [] });
  }

  // Hard 9.5s cap — Vercel hobby serverless limit is 10s
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9500);

  const enc = encodeURIComponent(q);

  // Try v2 API first — it's faster and more reliable than legacy CGI.
  // AU host gives AU-relevant products; world with country filter is the
  // fallback; CGI is last-resort because it 503s heavily.
  const endpoints = [
    `https://au.openfoodfacts.org/api/v2/search?search_terms=${enc}&fields=product_name&page_size=8&sort_by=popularity_key`,
    `https://world.openfoodfacts.org/api/v2/search?search_terms=${enc}&fields=product_name&page_size=8&countries_tags_en=australia&sort_by=popularity_key`,
    `https://world.openfoodfacts.org/api/v2/search?search_terms=${enc}&fields=product_name&page_size=8&sort_by=popularity_key`,
    `https://au.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=8&fields=product_name`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=8&fields=product_name`
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
      if (!offRes.ok) {
        lastError = `OFF ${offRes.status} on ${hostOf(url)}`;
        continue;
      }
      const data = await offRes.json();
      const products = (data?.products || [])
        .filter(p => p && p.product_name && typeof p.product_name === 'string')
        .map(p => ({ product_name: p.product_name }))
        .slice(0, 8);

      if (products.length === 0) {
        lastError = `OFF 0-results on ${hostOf(url)}`;
        continue;
      }

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
