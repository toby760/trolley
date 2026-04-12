// ============================================
// Default Australian grocery prices (AUD)
// Used when no receipt data is available yet
// ============================================

export const DEFAULT_PRICES = {
  // Dairy
  'milk': 3.50, 'full cream milk': 3.50, 'skim milk': 3.50, 'oat milk': 4.50,
  'almond milk': 4.00, 'soy milk': 3.00, 'butter': 5.00, 'margarine': 3.50,
  'cream': 3.00, 'sour cream': 3.00, 'cream cheese': 4.00,
  'yoghurt': 5.00, 'greek yoghurt': 6.00, 'cheese': 6.00, 'cheddar': 6.00,
  'mozzarella': 5.50, 'parmesan': 7.00, 'tasty cheese': 6.00, 'brie': 6.00,
  'eggs': 5.50, 'free range eggs': 6.50, 'dozen eggs': 6.50,

  // Bread & Bakery
  'bread': 3.50, 'white bread': 3.00, 'wholemeal bread': 3.50, 'sourdough': 5.00,
  'wraps': 4.00, 'pita bread': 3.50, 'rolls': 3.50, 'burger buns': 3.50,
  'crumpets': 3.00, 'english muffins': 3.50, 'bagels': 4.50,

  // Fruit & Veg
  'bananas': 3.50, 'apples': 4.50, 'oranges': 4.00, 'strawberries': 5.00,
  'blueberries': 5.00, 'avocado': 2.50, 'avocados': 2.50, 'lemons': 1.00,
  'limes': 1.00, 'grapes': 5.00, 'watermelon': 6.00, 'mango': 3.00,
  'tomatoes': 4.00, 'potatoes': 4.50, 'onions': 3.00, 'garlic': 2.00,
  'carrots': 2.50, 'broccoli': 3.50, 'capsicum': 3.00, 'mushrooms': 4.00,
  'spinach': 3.50, 'baby spinach': 4.00, 'lettuce': 3.00, 'cucumber': 2.00,
  'zucchini': 3.00, 'sweet potato': 4.00, 'corn': 3.00, 'beans': 3.00,
  'peas': 3.00, 'celery': 3.50, 'spring onions': 2.00,

  // Meat & Protein
  'chicken breast': 10.00, 'chicken thigh': 8.00, 'whole chicken': 9.00,
  'beef mince': 9.00, 'lamb chops': 14.00, 'pork chops': 10.00,
  'sausages': 7.00, 'bacon': 6.00, 'ham': 5.00, 'salami': 5.00,
  'salmon': 12.00, 'fish': 10.00, 'prawns': 15.00, 'tuna': 3.00,
  'tofu': 4.00, 'chicken': 10.00, 'mince': 9.00, 'steak': 15.00,

  // Pantry
  'rice': 4.00, 'pasta': 2.50, 'spaghetti': 2.50, 'noodles': 3.00,
  'flour': 2.50, 'sugar': 3.00, 'salt': 1.50, 'pepper': 3.00,
  'olive oil': 8.00, 'vegetable oil': 5.00, 'coconut oil': 6.00,
  'vinegar': 3.00, 'soy sauce': 3.50, 'tomato sauce': 3.00,
  'tomato paste': 2.00, 'tinned tomatoes': 1.50, 'baked beans': 2.00,
  'chickpeas': 1.50, 'lentils': 2.00, 'coconut milk': 2.50,
  'stock': 3.00, 'chicken stock': 3.00, 'peanut butter': 5.00,
  'jam': 4.00, 'honey': 7.00, 'vegemite': 5.00, 'nutella': 6.00,
  'cereal': 5.00, 'oats': 3.50, 'muesli': 5.00, 'weetbix': 4.50,

  // Snacks
  'chips': 4.00, 'biscuits': 3.50, 'chocolate': 4.50, 'crackers': 3.50,
  'nuts': 6.00, 'popcorn': 4.00, 'muesli bar': 4.50, 'muesli bars': 4.50,
  'tim tams': 3.65, 'shapes': 3.00, 'rice crackers': 3.00,

  // Drinks
  'coffee': 8.00, 'tea': 5.00, 'juice': 4.00, 'orange juice': 4.50,
  'apple juice': 4.00, 'sparkling water': 2.00, 'soft drink': 3.00,
  'coke': 3.50, 'beer': 18.00, 'wine': 12.00,

  // Frozen
  'ice cream': 7.00, 'frozen peas': 3.00, 'frozen chips': 4.00,
  'frozen pizza': 5.00, 'fish fingers': 5.00, 'frozen vegetables': 3.00,

  // Household
  'toilet paper': 8.00, 'paper towel': 4.00, 'tissues': 3.00,
  'dishwashing liquid': 4.00, 'laundry detergent': 10.00,
  'bin bags': 5.00, 'cling wrap': 3.50, 'alfoil': 4.00,
  'sponges': 3.00, 'cleaning spray': 4.00,

  // Baby
  'nappies': 15.00, 'wipes': 5.00, 'baby wipes': 5.00, 'baby food': 3.00,
  'formula': 25.00, 'baby formula': 25.00,

  // Condiments & Sauces
  'mayonnaise': 4.00, 'mustard': 3.00, 'bbq sauce': 3.50,
  'sweet chilli sauce': 3.50, 'hot sauce': 4.00, 'worcestershire': 4.00,
  'taco sauce': 3.50, 'taco shells': 4.00, 'taco mix': 2.50,
  'curry paste': 4.00, 'salsa': 4.00,
};

// Categories that are typically cheaper at Aldi
export const ALDI_PREFERRED_CATEGORIES = [
  'dairy', 'snacks', 'pantry', 'frozen', 'bread', 'cleaning', 'household'
];

// Simple category detection
export function categoriseProduct(name) {
  const lower = name.toLowerCase();
  if (/milk|butter|cheese|yoghurt|cream|eggs/.test(lower)) return 'dairy';
  if (/bread|rolls|wraps|pita|sourdough|crumpets|bagels|muffin/.test(lower)) return 'bread';
  if (/chicken|beef|lamb|pork|mince|steak|sausage|bacon|ham|fish|salmon|prawn|tofu/.test(lower)) return 'meat';
  if (/banana|apple|orange|strawberr|blueberr|grape|mango|avocado|lemon|lime|watermelon/.test(lower)) return 'fruit';
  if (/tomato|potato|onion|garlic|carrot|broccoli|capsicum|mushroom|spinach|lettuce|cucumber|zucchini|celery|corn|bean|pea/.test(lower)) return 'vegetable';
  if (/chip|biscuit|chocolate|cracker|nut|popcorn|muesli bar|tim tam|shapes/.test(lower)) return 'snacks';
  if (/rice|pasta|spaghetti|noodle|flour|sugar|oil|vinegar|sauce|stock|tin|can|lentil|chickpea/.test(lower)) return 'pantry';
  if (/frozen|ice cream|fish finger/.test(lower)) return 'frozen';
  if (/coffee|tea|juice|water|soft drink|coke|beer|wine/.test(lower)) return 'drinks';
  if (/toilet|paper towel|tissue|dish|laundry|bin bag|sponge|clean|cling|alfoil/.test(lower)) return 'household';
  if (/nappy|nappies|wipe|formula|baby/.test(lower)) return 'baby';
  return 'general';
}

export function suggestStore(productName, priceMemory = []) {
  // Check price memory first
  const memories = priceMemory.filter(m =>
    m.product_name.toLowerCase() === productName.toLowerCase()
  );
  if (memories.length > 0) {
    // Pick the store with the lowest price
    const cheapest = memories.reduce((a, b) =>
      a.last_known_price < b.last_known_price ? a : b
    );
    return cheapest.store || 'aldi';
  }

  // Fall back to category-based suggestion
  const category = categoriseProduct(productName);
  return ALDI_PREFERRED_CATEGORIES.includes(category) ? 'aldi' : 'woolworths';
}

export function estimatePrice(productName, store, priceMemory = []) {
  // Check price memory first
  const memory = priceMemory.find(m =>
    m.product_name.toLowerCase() === productName.toLowerCase() &&
    m.store === store
  );
  if (memory) return memory.last_known_price;

  // Check default prices
  const lower = productName.toLowerCase();
  if (DEFAULT_PRICES[lower]) return DEFAULT_PRICES[lower];

  // Partial match
  for (const [key, price] of Object.entries(DEFAULT_PRICES)) {
    if (lower.includes(key) || key.includes(lower)) return price;
  }

  // Default fallback
  return 4.00;
}
