// Vercel Serverless Function — proxies requests to Gemini API
// Keeps GEMINI_API_KEY hidden from the browser
// Enhanced with Open Food Facts text search fallback

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
      // Enhanced Australian Grocery Assistant prompt
      prompt = `You are an Australian Grocery Assistant. Analyze the image and return a JSON object.

CRITICAL INSTRUCTIONS:
1. Be extremely specific with the product name — include the brand, variant, and weight/volume.
   Examples: "Campos Superior Coffee Beans 500g", "Coca-Cola Zero Sugar 375ml", "Bega Tasty Cheese Slices 500g"
2. Read ALL text visible on the packaging — brand name, product name, flavour, size/weight.
3. If you can see a barcode number, include it in the response.
4. For store suggestion:
   - Generic/home brands (Great Scot, Hillview, Dairy Dale, Remano, Westacre, Lyttos, Belmont, Goldenvale, Farmdale, Cowbella, Millgate, Just Organic, Forresters) → "aldi"
   - Common staples and budget items → "aldi"
   - Premium, specialty, or name brands (Campos, T2, Vittoria, Lindt, Bega, Sanitarium, Kelloggs, Arnott's) → "woolworths"

Return ONLY valid JSON with these fields:
{
  "item_name": "Full product name with brand and size",
  "brand": "Brand name or empty string",
  "category": "dairy|bread|meat|fruit|vegetable|snacks|pantry|frozen|drinks|household|baby|general",
  "suggested_store": "aldi or woolworths",
  "confidence": "high|medium|low"
}`;
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
- If a price appears negative, it's a discount — skip it or subtract from the previous item
- Prices are in Australian dollars

Return ONLY the JSON object.
Example: {"items": [{"item_name": "Full Cream Milk 2L", "price": 3.29, "quantity": 1}], "total": 47.85}`;
    } else {
      return res.status(400).json({ error: 'Invalid mode. Use "product" or "receipt".' });
    }

    // Call Gemini API with system instruction for product mode
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    };

    // Add system instruction for product mode
    if (mode === 'product') {
      requestBody.systemInstruction = {
        parts: [{
          text: 'You are an Australian Grocery Assistant. You identify products from photos taken in Australian supermarkets. Always include brand, variant, and package size. Be specific — never return generic names like "coffee" when you can see "Campos Superior Blend Coffee Beans 500g" on the label.'
        }]
      };
    }

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return res.status(502).json({ error: 'Gemini API error', status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();

    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      return res.status(502).json({ error: 'No response from Gemini' });
    }

    const parsed = JSON.parse(textContent);

    // For product mode, try Open Food Facts text search for extra data
    if (mode === 'product' && parsed.item_name) {
      try {
        const searchName = parsed.item_name.replace(/\d+[gG]$|\d+[mM][lL]$|\d+[kK][gG]$|\d+[lL]$/, '').trim();
        const offRes = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchName)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,brands,categories_tags,image_url`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData.products && offData.products.length > 0) {
            const bestMatch = offData.products[0];
            parsed.off_match = {
              name: bestMatch.product_name || null,
              brand: bestMatch.brands || null,
              categories: bestMatch.categories_tags?.slice(0, 3) || []
            };
            // Use OFF brand if Gemini didn't detect one
            if (!parsed.brand && bestMatch.brands) {
              parsed.brand = bestMatch.brands.split(',')[0].trim();
            }
          }
        }
      } catch (offErr) {
        // Open Food Facts unavailable — continue without it
        console.log('OFF search skipped:', offErr.message);
      }
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Gemini handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
