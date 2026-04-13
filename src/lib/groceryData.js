// Curated Australian grocery product database for instant suggestions
// Organized by category with common variants
// This powers the local-first suggestion engine â no API needed for common items

const GROCERY_DATABASE = [
  // === DAIRY ===
  'Full Cream Milk 2L', 'Full Cream Milk 1L', 'Full Cream Milk 3L',
  'Skim Milk 2L', 'Skim Milk 1L', 'Lite Milk 2L',
  'Oat Milk 1L', 'Almond Milk 1L', 'Soy Milk 1L', 'Coconut Milk 1L',
  'A2 Milk 2L', 'Lactose Free Milk 1L',
  'Thickened Cream 300ml', 'Sour Cream 300g', 'Cream Cheese 250g',
  'Tasty Cheese Block 500g', 'Tasty Cheese Slices 500g',
  'Mozzarella Cheese 250g', 'Parmesan Cheese 250g',
  'Cheddar Cheese 500g', 'Brie Cheese 200g', 'Feta Cheese 200g',
  'Halloumi 200g', 'Cottage Cheese 500g', 'Ricotta 500g',
  'Greek Yoghurt 1kg', 'Greek Yoghurt 500g', 'Natural Yoghurt 1kg',
  'Chobani Yoghurt', 'YoPro Yoghurt', 'Kids Yoghurt Pouch',
  'Butter 500g', 'Butter 250g', 'Unsalted Butter 250g',
  'Margarine 500g', 'Eggs Free Range 12pk', 'Eggs Free Range 6pk',
  'Eggs Cage Free 12pk', 'Eggs Dozen',

  // === BREAD & BAKERY ===
  'White Bread Loaf', 'Wholemeal Bread Loaf', 'Multigrain Bread Loaf',
  'Sourdough Bread', 'Sourdough Loaf', 'Rye Bread',
  'Wraps 8pk', 'Wraps Wholemeal 8pk', 'Mountain Bread',
  'Pita Bread 5pk', 'Naan Bread 4pk', 'Turkish Bread',
  'Crumpets 6pk', 'English Muffins 6pk', 'Bagels 4pk',
  'Croissants 4pk', 'Hot Cross Buns 6pk',
  'Bread Rolls 6pk', 'Burger Buns 6pk', 'Hot Dog Rolls 6pk',
  'Banana Bread', 'Fruit Loaf',

  // === MEAT & PROTEIN ===
  'Chicken Breast 500g', 'Chicken Breast 1kg', 'Chicken Thigh 500g',
  'Chicken Drumsticks 1kg', 'Chicken Wings 1kg', 'Whole Chicken',
  'Beef Mince 500g', 'Beef Mince 1kg', 'Lean Beef Mince 500g',
  'Beef Steak', 'Scotch Fillet Steak', 'Rump Steak',
  'Beef Sausages 500g', 'Lamb Sausages', 'Pork Sausages',
  'Lamb Chops', 'Lamb Cutlets', 'Lamb Leg',
  'Pork Chops', 'Pork Belly', 'Pork Mince 500g',
  'Bacon 200g', 'Bacon 500g', 'Shortcut Bacon 250g',
  'Ham Sliced 200g', 'Turkey Breast Sliced 100g',
  'Salmon Fillets 200g', 'Salmon Fillets 400g',
  'Barramundi Fillets', 'Fish Fillets', 'Prawns 500g',
  'Tuna Steaks', 'Tofu Firm 300g', 'Tofu Silken',

  // === FRUIT ===
  'Bananas 1kg', 'Bananas', 'Apples Royal Gala 1kg', 'Apples Pink Lady 1kg',
  'Apples Granny Smith 1kg', 'Oranges 3kg Bag', 'Oranges Navel',
  'Mandarins 1kg', 'Lemons', 'Limes',
  'Strawberries 250g', 'Blueberries 125g', 'Raspberries 125g',
  'Grapes 500g', 'Grapes Red', 'Grapes Green',
  'Watermelon', 'Watermelon Half', 'Rockmelon',
  'Mango', 'Mangoes', 'Pineapple', 'Kiwi Fruit',
  'Avocado', 'Avocados 3pk', 'Pears', 'Peaches', 'Nectarines',
  'Plums', 'Cherries 500g', 'Passionfruit',

  // === VEGETABLES ===
  'Potatoes 2kg', 'Potatoes 1kg', 'Sweet Potato',
  'Onions Brown 1kg', 'Red Onion', 'Spring Onions',
  'Garlic', 'Ginger', 'Chilli',
  'Tomatoes', 'Cherry Tomatoes 250g', 'Roma Tomatoes',
  'Capsicum Red', 'Capsicum Green', 'Capsicum Mixed 3pk',
  'Cucumber', 'Lebanese Cucumber',
  'Lettuce Iceberg', 'Baby Spinach 120g', 'Rocket 120g', 'Mixed Salad 120g',
  'Kale Bunch', 'Broccolini',
  'Broccoli', 'Cauliflower', 'Zucchini',
  'Carrots 1kg', 'Carrots Baby', 'Celery',
  'Mushrooms 200g', 'Mushrooms Cup 200g', 'Mushrooms Sliced',
  'Corn Cobs 4pk', 'Green Beans 250g', 'Snow Peas 200g',
  'Pumpkin', 'Butternut Pumpkin', 'Eggplant',
  'Asparagus Bunch', 'Beetroot', 'Cabbage',

  // === PANTRY STAPLES ===
  'Rice White 1kg', 'Rice Basmati 1kg', 'Rice Brown 1kg', 'Rice Jasmine 1kg',
  'Pasta Spaghetti 500g', 'Pasta Penne 500g', 'Pasta Fusilli 500g',
  'Pasta Linguine', 'Egg Noodles', 'Rice Noodles', 'Ramen Noodles',
  'Canned Tomatoes 400g', 'Diced Tomatoes 400g', 'Crushed Tomatoes 400g',
  'Tomato Paste', 'Passata 500ml',
  'Olive Oil 500ml', 'Olive Oil Extra Virgin', 'Vegetable Oil 1L',
  'Coconut Oil', 'Sesame Oil',
  'Soy Sauce 500ml', 'Fish Sauce', 'Oyster Sauce',
  'Worcestershire Sauce', 'Hot Sauce', 'Sriracha',
  'Tomato Sauce 500ml', 'BBQ Sauce', 'Sweet Chilli Sauce',
  'Mayonnaise', 'Mustard', 'Dijon Mustard',
  'Baked Beans 420g', 'Chickpeas 400g', 'Kidney Beans 400g',
  'Lentils 400g', 'Four Bean Mix 400g', 'Corn Kernels 420g',
  'Tuna in Spring Water 95g', 'Tuna in Oil 95g', 'Tuna 425g',
  'Sardines', 'Salmon Canned 210g',
  'Flour Plain 1kg', 'Flour Self Raising 1kg', 'Cornflour',
  'Sugar White 1kg', 'Sugar Brown 500g', 'Caster Sugar 500g',
  'Icing Sugar', 'Honey 500g', 'Maple Syrup',
  'Salt', 'Pepper Ground', 'Mixed Herbs', 'Paprika',
  'Cumin Ground', 'Turmeric', 'Curry Powder',
  'Chicken Stock 1L', 'Beef Stock 1L', 'Vegetable Stock 1L',
  'Coconut Milk 400ml', 'Coconut Cream 400ml',
  'Peanut Butter 375g', 'Nutella 400g', 'Vegemite 380g', 'Vegemite 150g',
  'Jam Strawberry', 'Jam Raspberry', 'Marmalade',
  'Vinegar White', 'Balsamic Vinegar', 'Apple Cider Vinegar',

  // === CEREAL & BREAKFAST ===
  'Weet-Bix', 'Weet-Bix 575g', 'Corn Flakes',
  'Oats Rolled 1kg', 'Oats Quick 500g', 'Granola',
  'Muesli', 'Muesli Toasted', 'Up&Go 3pk',
  'Coco Pops', 'Nutri-Grain', 'Special K',

  // === SNACKS ===
  'Tim Tams Original', 'Tim Tams Double Coat', 'Tim Tams Caramel',
  'Shapes BBQ', 'Shapes Pizza', 'Shapes Chicken Crimpy',
  'Doritos', 'CC\'s Original', 'Smith\'s Original Chips',
  'Smith\'s Salt & Vinegar', 'Kettle Chips', 'Red Rock Deli Chips',
  'Rice Crackers', 'Vita-Weat', 'Cruskits',
  'Almonds 200g', 'Cashews 200g', 'Mixed Nuts 200g',
  'Trail Mix', 'Dried Cranberries', 'Dried Apricots',
  'Popcorn', 'Pretzels', 'Twisties',
  'Chocolate Block', 'Cadbury Dairy Milk', 'Lindt Chocolate',
  'Dark Chocolate', 'Freddo Frogs',
  'Muesli Bars', 'Protein Bars', 'Fruit Bars',
  'Biscuits Digestive', 'Biscuits Monte Carlo', 'Arnott\'s Assorted',
  'Crackers Water', 'Crackers Jatz', 'Crackers Savoy',

  // === DRINKS ===
  'Coca-Cola 1.25L', 'Coca-Cola Zero 1.25L', 'Pepsi 1.25L',
  'Sprite 1.25L', 'Fanta 1.25L', 'Solo 1.25L',
  'Sparkling Water 1L', 'Mineral Water 1L', 'Spring Water 1.5L',
  'Orange Juice 2L', 'Orange Juice 1L', 'Apple Juice 2L',
  'Cranberry Juice', 'Kombucha',
  'Iced Tea', 'Iced Coffee', 'Dare Iced Coffee',
  'Coconut Water', 'Gatorade', 'Powerade',
  'Tonic Water', 'Soda Water',

  // === COFFEE & TEA ===
  'Instant Coffee 200g', 'Nescafe Blend 43', 'Moccona Coffee',
  'Coffee Beans 1kg', 'Coffee Beans 500g', 'Coffee Ground 250g',
  'Coffee Pods Nespresso', 'Coffee Pods Dolce Gusto',
  'Tea Bags English Breakfast', 'Tea Bags Earl Grey', 'Tea Bags Green Tea',
  'Tea Bags Chamomile', 'Tea Bags Peppermint',
  'T2 Tea', 'Twinings Tea',

  // === FROZEN ===
  'Frozen Peas 500g', 'Frozen Corn 500g', 'Frozen Mixed Vegetables',
  'Frozen Chips 1kg', 'Frozen Chips Straight Cut',
  'Frozen Berries 500g', 'Frozen Mango',
  'Fish Fingers', 'Chicken Nuggets', 'Chicken Tenders',
  'Frozen Pizza', 'Frozen Pies', 'Frozen Sausage Rolls',
  'Ice Cream 1L', 'Ice Cream Vanilla 2L', 'Ice Cream Tub',
  'Magnum Ice Cream', 'Drumstick Ice Cream', 'Paddle Pop',
  'Frozen Prawns 500g', 'Frozen Fish Fillets',
  'Frozen Dumplings', 'Frozen Spring Rolls',
  'Frozen Pastry Sheets', 'Frozen Puff Pastry',

  // === HOUSEHOLD ===
  'Toilet Paper 12pk', 'Toilet Paper 24pk',
  'Paper Towels 4pk', 'Paper Towels 2pk',
  'Tissues Box', 'Tissues 3pk',
  'Dishwashing Liquid', 'Dishwasher Tablets',
  'Laundry Liquid 2L', 'Laundry Powder 1kg',
  'Fabric Softener', 'Stain Remover',
  'All Purpose Cleaner', 'Spray & Wipe', 'Glass Cleaner',
  'Bleach', 'Disinfectant', 'Floor Cleaner',
  'Sponges 5pk', 'Scrubbers', 'Chux Cloths',
  'Glad Wrap', 'Alfoil', 'Baking Paper',
  'Zip Lock Bags', 'Bin Liners 50pk', 'Bin Liners 20pk',

  // === BABY ===
  'Baby Wipes 80pk', 'Nappies Newborn', 'Nappies Size 3',
  'Nappies Size 4', 'Nappies Size 5',
  'Baby Formula', 'Baby Food Pouch',
  'Baby Snacks', 'Baby Cereal',

  // === PET ===
  'Cat Food Tin', 'Cat Food Dry 1kg', 'Cat Litter',
  'Dog Food Tin', 'Dog Food Dry 3kg', 'Dog Treats',

  // === PERSONAL CARE ===
  'Shampoo', 'Conditioner', 'Body Wash',
  'Deodorant', 'Toothpaste', 'Toothbrush',
  'Razor Refills', 'Sunscreen SPF50',
  'Hand Soap', 'Hand Sanitiser',
  'Cotton Pads', 'Cotton Buds',
];

// Build a search index with lowercase versions for fast matching
const SEARCH_INDEX = GROCERY_DATABASE.map(name => ({
  name,
  lower: name.toLowerCase(),
  // Extract words for multi-word matching
  words: name.toLowerCase().split(/\s+/),
}));

/**
 * Smart fuzzy search through the grocery database
 * Matches items where ALL search words appear in the product name
 * Returns results sorted by relevance
 */
export function searchGroceryDatabase(query, limit = 10) {
  if (!query || query.length < 1) return [];

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);

  const scored = [];

  for (const item of SEARCH_INDEX) {
    // Check if all query words match
    const allMatch = queryWords.every(qw => item.lower.includes(qw));
    if (!allMatch) continue;

    // Score: prefer starts-with, then exact word match, then contains
    let score = 0;
    if (item.lower.startsWith(queryLower)) score += 100;
    if (item.lower === queryLower) score += 200;
    // Bonus if first word matches
    if (item.words[0].startsWith(queryWords[0])) score += 50;
    // Shorter names are usually more relevant
    score -= item.name.length * 0.5;

    scored.push({ name: item.name, score, source: 'database' });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Get category-specific suggestions when user types a category word
 * e.g., "milk" â all milk variants, "cheese" â all cheese variants
 */
export function getCategorySuggestions(query) {
  return searchGroceryDatabase(query, 15);
}

export default GROCERY_DATABASE;
