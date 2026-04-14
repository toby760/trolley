// Vercel Serverless Function - proxies requests to SerpApi (google_shopping engine)
// Keeps SERPAPI_API_KEY hidden from the browser.
// Called only on price_memory cache miss to preserve the monthly search budget.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'SERPAPI_API_KEY not configured' });
  }

  const { brand, name, weight, store } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  // Build lean query: [Brand] [Name] [Weight] - gl=au handles geo, post-sort handles store preference
  const storeName =
    store === 'aldi' ? 'Aldi' :
    store === 'woolworths' ? 'Woolworths' : '';

  const parts = [];
  if (brand) parts.push(brand);
  parts.push(name);
  if (weight) parts.push(weight);
  const query = parts.join(' ');

  try {
    const url = 'https://serpapi.com/search.json?engine=google_shopping'
      + '&q=' + encodeURIComponent(query)
      + '&gl=au&hl=en&api_key=' + encodeURIComponent(apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error('SerpApi returned ' + response.status);
    }

    const data = await response.json();
    const results = data.shopping_results || [];

    if (results.length === 0) {
      return res.status(200).json({ price: null, query, source: 'serpapi-no-results' });
    }

    // Prefer results whose source/seller matches the requested store
    const storeLower = storeName.toLowerCase();
    const ranked = [...results].sort((a, b) => {
      const aSrc = (a.source || a.seller || '').toLowerCase();
      const bSrc = (b.source || b.seller || '').toLowerCase();
      const aMatch = storeLower && aSrc.includes(storeLower) ? 1 : 0;
      const bMatch = storeLower && bSrc.includes(storeLower) ? 1 : 0;
      return bMatch - aMatch;
    });

    const prices = ranked
      .map(r => {
        if (typeof r.extracted_price === 'number') return r.extracted_price;
        if (typeof r.price === 'string') {
          const m = r.price.match(/\d+(?:\.\d+)?/);
          return m ? parseFloat(m[0]) : null;
        }
        return null;
      })
      .filter(p => p !== null && p > 0 && p < 500);

    if (prices.length === 0) {
      return res.status(200).json({ price: null, query, source: 'serpapi-no-prices' });
    }

    // Use median to dampen outliers
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return res.status(200).json({
      price: Number(median.toFixed(2)),
      query,
      source: 'serpapi',
      sample_count: prices.length
    });
  } catch (error) {
    console.error('SerpApi error:', error.message);
    return res.status(500).json({ error: 'Price lookup failed', detail: error.message });
  }
}
