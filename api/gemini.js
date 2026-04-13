// Vercel Serverless Function - proxies requests to Gemini API.
// Keeps GEMINI_API_KEY hidden from the browser.
// Product mode returns highly-specific identification so the SerpApi
// price gatekeeper (see /src/lib/priceLookup.js) can match accurately.

export default async function handler(req, res) {
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

    let prompt;
    if (mode === 'product') {
      prompt = `You are an Australian Grocery Assistant. Analyze the image and return a JSON object.

CRITICAL INSTRUCTIONS:
1. Identify the product as specifically as possible. High specificity is required for accurate price lookups.
   GOOD: "Bulla Thickened Cream 300ml", "Campos Superior Coffee Beans 500g", "Coca-Cola Zero Sugar 375ml"
   BAD: "Cream", "Coffee", "Soft drink"
2. Read ALL text visible on the packaging - brand name, product name, flavour/variant, size/weight.
3. If the image has glare, is blurry, or the package is crushed, use visual branding cues
   (logo colour, typography, shape, layout) to infer the product. Do not refuse - make a best guess
   and lower the confidence score accordingly.
4. Split the identification into separate fields so the price lookup can match on them:
   - "item_name": the full human-readable name with brand + variant + size
   - "brand": just the brand (e.g. "Bulla")
   - "volume_weight": just the size (e.g. "300ml", "500g", "1kg", "2L")
5. If you can see a barcode number, include it in the response.
6. For "estimated_price_aud": estimate the typical Australian retail price in AUD. Be realistic -
   specialty coffee beans are $15-45, not $3.
7. For store suggestion:
   - Generic/home brands (Great Scot, Hillview, Dairy Dale, Remano, Westacre, Lyttos, Belmont,
     Goldenvale, Farmdale, Cowbella, Millgate, Just Organic, Forresters) -> "aldi"
   - Common staples and budget items -> "aldi"
   - Premium, specialty, or name brands (Campos, T2, Vittoria, Lindt, Bega, Sanitarium, Kelloggs,
     Arnott's) -> "woolworths"

Return ONLY valid JSON with these fields:
{
  "item_name": "Full product name with brand and size",
  "brand": "Brand name or empty string",
  "volume_weight": "Size/weight or empty string",
  "category": "dairy|bread|meat|fruit|vegetable|snacks|pantry|frozen|drinks|household|baby|general",
  "suggested_store": "aldi or woolworths",
  "confidence": "high|medium|low",
  "estimated_price_aud": 0.00
}`;
    } else if (mode === 'receipt') {
      prompt = `You are a receipt parser for an Australian grocery shopping app. This is a receipt from ${store === 'aldi' ? 'Aldi' : 'Woolworths'} in Australia.

Parse every purchased item from this receipt. Return a JSON object with:
- "items": an array of objects, each with:
  - "item_name": string (the product name, cleaned up and readable)
  - "price": number (the price in AUD, e.g. 4.50)
  - "quantity": number (quantity purchased, default 1 if not shown)
- "total": number (the receipt total in AUD)

Important:
- Skip non-product lines (store info, tax summaries, payment methods, change, etc.)
- Clean up item names: remove internal codes, make them human-readable
- If a price appears negative, it's a discount - skip it or subtract from the previous item
- Prices are in Australian dollars

Return ONLY the JSON object.
Example: {"items": [{"item_name": "Full Cream Milk 2L", "price": 3.29, "quantity": 1}], "total": 47.85}`;
    } else {
      return res.status(400).json({ error: 'Invalid mode. Use "product" or "receipt".' });
    }

    // Build request body
    const requestBody = {
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
    };

    // Add system instruction for product mode - emphasise specificity and damaged-package reasoning
    if (mode === 'product') {
      requestBody.systemInstruction = {
        parts: [{
          text: 'You are an Australian Grocery Assistant. You identify products from photos taken in Australian supermarkets. Identify the product as specifically as possible (e.g. "Bulla Thickened Cream 300ml" instead of just "Cream"). High specificity is required for accurate price lookups. Always include brand, variant, and package size. If the package is crushed, has glare, or is partially obscured, use visual branding cues (logo colour, typography, shape) to infer the product rather than refusing. Always estimate a realistic Australian retail price.'
        }]
      };
    }

    // Models to try in order - fallback if primary is overloaded
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    let lastError = null;

    for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // Retry up to 2 times per model for transient errors
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textContent) {
              lastError = { error: 'No response from Gemini', model };
              break;
            }

            const parsed = JSON.parse(textContent);
            return res.status(200).json(parsed);
          }

          const status = geminiRes.status;
          const errText = await geminiRes.text();

          // Retry on transient errors (429, 503)
          if ((status === 429 || status === 503) && attempt < 1) {
            console.log(`Gemini ${model} returned ${status}, retrying in 1s (attempt ${attempt + 1})...`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }

          lastError = { status, details: errText.substring(0, 500), model };
          console.error(`Gemini ${model} error:`, status, errText.substring(0, 200));
          break;
        } catch (fetchErr) {
          lastError = { error: fetchErr.message, model };
          console.error(`Gemini ${model} fetch error:`, fetchErr.message);
          break;
        }
      }
    }

    return res.status(502).json({ error: 'Gemini API unavailable', details: lastError });
  } catch (err) {
    console.error('Gemini handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
