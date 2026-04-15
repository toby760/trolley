// Token-based fuzzy matching for reconciling shopping list items with receipt lines.
// Splits names on whitespace and non-alphanumeric chars, compares token sets (Jaccard-like).

const STOPWORDS = new Set([
  'the','a','an','of','and','or','with','for','in','on','at','by','to','from',
  'pk','pack','kg','g','gm','grams','ml','l','lt','ltr','litre','liter',
  'ea','each','x','approx','approximately'
]);

export function tokenize(s) {
  if (!s) return [];
  return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(t => t && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

export function similarity(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  const denom = Math.max(ta.size, tb.size);
  return denom ? common / denom : 0;
}

// Greedy best-first matching. listItems and receiptItems are arrays of
// objects with a .name property. Returns matched pairs + unmatched lists.
export function matchItems(listItems, receiptItems, threshold = 0.3) {
  const pairs = [];
  for (let i = 0; i < listItems.length; i++) {
    for (let j = 0; j < receiptItems.length; j++) {
      const s = similarity(listItems[i].name, receiptItems[j].name);
      if (s >= threshold) pairs.push({ i, j, s });
    }
  }
  pairs.sort((a, b) => b.s - a.s);
  const usedI = new Set();
  const usedJ = new Set();
  const matched = [];
  for (const p of pairs) {
    if (usedI.has(p.i) || usedJ.has(p.j)) continue;
    usedI.add(p.i);
    usedJ.add(p.j);
    matched.push({ item: listItems[p.i], receipt: receiptItems[p.j], score: p.s });
  }
  const unmatchedList = listItems.filter((_, i) => !usedI.has(i));
  const unmatchedReceipt = receiptItems.filter((_, j) => !usedJ.has(j));
  return { matched, unmatchedList, unmatchedReceipt };
}
