// Vercel Serverless Function — Open Food Facts proxy for Trolley autocomplete.
// Direct browser fetches to openfoodfacts.org are intermittently blocked by
// CORS / CDN flakiness, causing the Add Item search to return no suggestions.
// Calling it server-to-server here is reliable and we can also cache briefly.

export default async function handler(req, res) {
  // Accept GET ?q=... (browser-friendly)
  const q = (req.query?.q || '').toString().trim();

  if (!q || q.length < 2) {
    return res.status(200).json({ products: [] });
  }

  // Hard 9.5s cap — Vercel hobby serverless limit is 10s
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9500);

  const endpoints = [
    `https://au.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name`
  ];

  let lastError = null;
  for (const url of endpoints) {
    try {
      const offRes = await fetch(url, {
        signal: controller.signal,
        headers: {
          // OFF appreciates a real UA so it doesn't throttle / block us
          'User-Agent': 'Trolley/1.0 (https://trolley-puce.vercel.app)',
          'Accept': 'application/json'
        }
      });
      if (!offRes.ok) {
        lastError = `OFF non-200: ${offRes.status}`;
        continue;
      }
      const data = await offRes.json();
      clearTimeout(timer);

      const products = (data?.products || [])
        .filter(p => p && p.product_name && typeof p.product_name === 'string')
        .map(p => ({ product_name: p.product_name }))
        .slice(0, 8);

      // Small CDN cache so repeat typers don't keep hammering OFF
      res.setHeader(
        'Cache-Control',
        'public, s-maxage=3600, stale-while-revalidate=86400'
      );
      return res.status(200).json({ products });
    } catch (err) {
      if (err.name === 'AbortError') {
        clearTimeout(timer);
        return res.status(200).json({ products: [], timeout: true });
      }
      lastError = err.message || String(err);
    }
  }

  clearTimeout(timer);
  // Never 5xx for a best-effort autocomplete — the UI should just fall back
  // to the custom / history suggestions.
  return res.status(200).json({ products: [], error: lastError || 'unavailable' });
}
