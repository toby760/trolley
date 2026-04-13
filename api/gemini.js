// Vercel Serverless Function â proxies requests to Gemini API
// Keeps GEMINI_API_KEY hidden from the browser

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { image, mode, store } = req.body;

    if (!image || !mode) {
      return res.status(400).json({ error: 'Missing image or mode' });
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Build the prompt based on mode
    let prompt;
    if (mode === 'product') {
      prompt = `You are a product identification assistant for an Australian household shopping app.

Look at this product photo and identify it. Return a JSON object with:
- "item_name": the product name as you'd write it on a shopping list (e.g. "Vegemite 380g", "Bega Tasty Cheese 500g")
- "brand": the brand name if visible (e.g. "Bega", "Sanitarium"), or "" if unclear
- "suggested_store": either "aldi" or "woolworths" â suggest "aldi" for budget/home-brand items, "woolworths" for branded/specialty items

Return ONLY the JSON object, no other text. Example:
{"item_name": "Vegemite 380g", "brand": "Kraft", "suggested_store": "woolworths"}`;

    } else if (mode === 'receipt') {
      prompt = `You are a receipt parser for an Australian grocery shopping app.

This is a receipt from ${store === 'aldi' ? 'Aldi' : 'Woolworths'} in Australia.

Parse every purchased item from this receipt. Return a JSON object with:
- "items": an array of objects, each with:
  - "item_name": string (the product name, cleaned up and readable)
  - "price": number (the price in AUD, e.g. 4.50)
  - "quantity": number (quantity purchased, default 1 if not shown)
- "total": number (the receipt total in AUD)

Important:
- Skip non-product lines (store info, tax summaries, payment methods, change, etc.)
- Clean up item names: remove internal codes, make them human-readable
- If a price appears negative, it's a discount â skip it or subtract from the previous item
- Prices are in Australian dollars

Return ONLY the JSON object. Example:
{"items": [{"item_name": "Full Cream Milk 2L", "price": 3.29, "quantity": 1}, {"item_name": "Sourdough Bread", "price": 4.49, "quantity": 1}], "total": 47.85}`;

    } else {
      return res.status(400).json({ error: 'Invalid mode. Use "product" or "receipt".' });
    }

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return res.status(502).json({ error: 'Gemini API error', status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();

    // Extract the text response
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      return res.status(502).json({ error: 'No response from Gemini' });
    }

    // Parse the JSON response
    const parsed = JSON.parse(textContent);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Gemini handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
