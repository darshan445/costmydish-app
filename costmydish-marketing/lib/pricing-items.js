import { dishSummary, ingredientLineCost, roundPriceUp } from '@/lib/food-cost';

/**
 * Programmatic "How to price [item]" pages at /pricing/[slug].
 * Recipe rows: [name, price paid, amount bought, buy unit, amount used, use unit, waste %].
 * Example prices are typical retail/wholesale figures; every number on the page is
 * computed from these rows with the app's maths, so copy never drifts from the calculator.
 */

export const PRICING_CATEGORIES = {
  bakery: {
    label: 'Baked goods',
    target: 30,
    range: '25–35%',
    timeNote:
      'Ingredients are only part of the price. For baked goods, your time (mixing, proving, baking, decorating, packing) is often the biggest cost — add an hourly rate on top, plus 10–20% for energy, equipment and fees.',
  },
  cafe: {
    label: 'Café drinks',
    target: 20,
    range: '15–25%',
    timeNote:
      'Drinks carry a low food cost % because the price also pays for the barista’s time, the machine, rent and waste. Count cups, lids and sleeves as ingredients — on a cheap drink they can cost more than the coffee.',
  },
  dishes: {
    label: 'Dishes & meals',
    target: 30,
    range: '28–35%',
    timeNote:
      'Food cost % only covers ingredients. Your menu price also has to pay for kitchen labour, rent, energy, card and delivery-app fees — which is why most restaurants keep food cost around 28–35%.',
  },
};

export const PRICING_ITEMS = [
  {
    slug: 'cupcakes',
    name: 'cupcakes',
    category: 'bakery',
    recipe: {
      dishName: 'Vanilla cupcakes with buttercream',
      makes: 12,
      unitWord: 'cupcake',
      rows: [
        ['All-purpose flour', '2.50', '1', 'kg', '190', 'g'],
        ['Sugar', '1.80', '1', 'kg', '200', 'g'],
        ['Butter (cake)', '8.00', '1', 'kg', '115', 'g'],
        ['Eggs', '3.60', '1', 'dozen', '2', 'each'],
        ['Milk', '1.20', '1', 'l', '120', 'ml'],
        ['Vanilla extract', '15.00', '1', 'l', '5', 'ml'],
        ['Baking powder', '5.00', '1', 'kg', '6', 'g'],
        ['Butter (frosting)', '8.00', '1', 'kg', '225', 'g'],
        ['Icing sugar', '2.20', '1', 'kg', '375', 'g'],
        ['Cupcake liners', '3.00', '100', 'piece', '12', 'piece'],
      ],
    },
    intro:
      'Cupcakes look cheap to make, but buttercream, liners and boxes add up fast. Cost the sponge and the frosting together, then price per cupcake and per box.',
    drivers: [
      'Frosting — buttercream often costs more than the cake itself',
      'Butter and eggs, which change price often',
      'Liners, toppers and individual boxes or inserts',
    ],
    tips: [
      'Price boxes of 6 and 12 so larger orders still cover packaging and time',
      'Charge extra for custom colours, piped designs and toppers',
      'Re-check butter and egg prices every month — they move the most',
    ],
    sellWays: 'Sell singles, boxes of 6 and boxes of 12. Add each as a way to sell in the app to see profit on each box.',
    faqs: [
      { q: 'How much should I charge for a dozen cupcakes?', a: 'Multiply your price per cupcake by 12, then add the box and any decoration time. Many bakers give a small discount on a dozen but never go below cost plus their hourly rate.' },
      { q: 'Should frosting be included in the cupcake cost?', a: 'Yes. Cost the frosting as ingredients in the same recipe — it is often half the ingredient cost.' },
    ],
  },
  {
    slug: 'cookies',
    name: 'cookies',
    category: 'bakery',
    recipe: {
      dishName: 'Chocolate chip cookies',
      makes: 24,
      unitWord: 'cookie',
      rows: [
        ['All-purpose flour', '2.50', '1', 'kg', '250', 'g'],
        ['Butter', '8.00', '1', 'kg', '150', 'g'],
        ['Eggs', '0.30', '1', 'each', '2', 'each'],
        ['Sugar', '1.80', '1', 'kg', '100', 'g'],
        ['Chocolate chips', '12.00', '1', 'kg', '150', 'g'],
        ['Vanilla extract', '15.00', '1', 'l', '5', 'ml'],
        ['Baking powder', '5.00', '1', 'kg', '5', 'g'],
        ['Salt', '1.00', '1', 'kg', '3', 'g'],
      ],
    },
    intro:
      'Cookies have a low ingredient cost per piece, so the real question is how many you get from a batch and how you pack them. Weigh your dough balls so every cookie costs the same.',
    drivers: [
      'Chocolate, nuts and mix-ins — usually the most expensive line',
      'Cookie size: a 60 g cookie costs twice a 30 g one',
      'Bags, labels and boxes for gifting',
    ],
    tips: [
      'Weigh dough balls and set “It makes” to the real count after baking',
      'Price by the dozen and half-dozen as well as singles',
      'Premium mix-ins (brown butter, sea salt, couverture) justify a higher price',
    ],
    sellWays: 'Sell singles, half-dozens and dozens, or gift boxes. Each pack size gets its own price and profit in the app.',
    faqs: [
      { q: 'How much should I sell homemade cookies for?', a: 'Start from the cost per cookie, divide by your target food cost (e.g. 0.30), then add packaging and your time per dozen.' },
      { q: 'How do I price big bakery-style cookies?', a: 'Use the same recipe but change “It makes” to the smaller count — each cookie’s cost rises in proportion to its size.' },
    ],
  },
  {
    slug: 'brownies',
    name: 'brownies',
    category: 'bakery',
    recipe: {
      dishName: 'Fudgy chocolate brownies (9×13 pan)',
      makes: 24,
      unitWord: 'brownie',
      rows: [
        ['Butter', '8.00', '1', 'kg', '225', 'g'],
        ['Sugar', '1.80', '1', 'kg', '400', 'g'],
        ['Eggs', '3.60', '1', 'dozen', '4', 'each'],
        ['Dark chocolate', '14.00', '1', 'kg', '170', 'g'],
        ['Cocoa powder', '12.00', '1', 'kg', '85', 'g'],
        ['All-purpose flour', '2.50', '1', 'kg', '125', 'g'],
        ['Vanilla extract', '15.00', '1', 'l', '10', 'ml'],
        ['Salt', '1.00', '1', 'kg', '3', 'g'],
      ],
    },
    intro:
      'Brownies are one of the most profitable bakes — one pan, simple ingredients, and you choose the cut size. The cut decides your price.',
    drivers: [
      'Chocolate and cocoa quality',
      'How many pieces you cut (16 large vs 24 standard vs 48 bites)',
      'Toppings such as nuts, caramel or cheesecake swirl',
    ],
    tips: [
      'Decide the cut before you price — change “It makes” to compare 16 vs 24 pieces',
      'Offer bites in boxes for events; they sell at a higher price per gram',
      'Trim edges count as waste unless you sell them as “edge pieces”',
    ],
    sellWays: 'Sell single squares, boxes of 4 or 9, or whole trays for events.',
    faqs: [
      { q: 'How much do brownies cost to make?', a: 'With the example prices, a 9×13 pan costs about $7–8 in ingredients. Divide by the number of pieces you cut to get cost per brownie.' },
      { q: 'What size should I cut brownies to sell?', a: 'Pick a size that hits your price point: larger squares for cafés, bites for boxes and events. The calculator shows cost per piece for any count.' },
    ],
  },
  {
    slug: 'banana-bread',
    name: 'banana bread',
    category: 'bakery',
    recipe: {
      dishName: 'Walnut banana bread (1 loaf)',
      makes: 10,
      unitWord: 'slice',
      rows: [
        ['Bananas', '0.25', '1', 'each', '3', 'each'],
        ['All-purpose flour', '2.50', '1', 'kg', '250', 'g'],
        ['Sugar', '1.80', '1', 'kg', '150', 'g'],
        ['Butter', '8.00', '1', 'kg', '115', 'g'],
        ['Eggs', '3.60', '1', 'dozen', '2', 'each'],
        ['Baking soda', '3.00', '1', 'kg', '5', 'g'],
        ['Walnuts', '16.00', '1', 'kg', '60', 'g'],
      ],
    },
    intro:
      'Banana bread uses cheap, often overripe ingredients, which makes it a high-margin loaf. Price both by the slice and by the whole loaf.',
    drivers: ['Nuts and chocolate chips', 'Butter vs oil', 'Loaf liners and bags for whole loaves'],
    tips: [
      'Use overripe bananas you would otherwise waste — they cost you almost nothing',
      'A whole loaf should cost less per slice than buying slices separately',
      'Add-ins like chocolate chips or streusel justify a premium version',
    ],
    sellWays: 'Sell by the slice in a café or market, and whole loaves for pre-order.',
    faqs: [
      { q: 'How much should I charge for a loaf of banana bread?', a: 'Take the cost per slice × slices, divide by your target food cost, then add the bag and your time per loaf.' },
      { q: 'How many slices are in a banana bread loaf?', a: 'A standard 9×5 loaf usually gives 8–12 slices. Set “It makes” to the number you actually cut.' },
    ],
  },
  {
    slug: 'sourdough-bread',
    name: 'sourdough bread',
    category: 'bakery',
    recipe: {
      dishName: 'Country sourdough loaf',
      makes: 1,
      unitWord: 'loaf',
      rows: [
        ['Bread flour', '3.20', '1', 'kg', '550', 'g'],
        ['Whole wheat flour', '3.80', '1', 'kg', '50', 'g'],
        ['Salt', '1.00', '1', 'kg', '10', 'g'],
        ['Rice flour (for dusting)', '4.00', '1', 'kg', '10', 'g'],
        ['Bread bag', '12.00', '50', 'piece', '1', 'piece'],
      ],
    },
    intro:
      'Sourdough has very low ingredient cost — flour, water and salt — but takes two days and a hot oven. Your price is mostly time and energy, not flour.',
    drivers: ['Flour quality (organic or heritage grains cost 2–3× more)', 'Oven energy for long, hot bakes', 'Bags, labels and failed loaves'],
    tips: [
      'Bake in batches — energy per loaf drops a lot when the oven is full',
      'Add a small waste % to flour to cover failed or misshapen loaves',
      'Inclusions (olives, seeds, cheese) make premium loaves worth more',
    ],
    sellWays: 'Sell whole loaves, half loaves and weekly subscriptions.',
    faqs: [
      { q: 'Why is sourdough so expensive if the ingredients are cheap?', a: 'Because the price pays for 24–48 hours of fermentation, shaping skill and oven energy. Ingredients are often under 15% of a sourdough price.' },
      { q: 'How much should I charge for a sourdough loaf?', a: 'Cost the flour and salt, then add energy, packaging and your time per loaf. Check the suggested price as a floor, not a target.' },
    ],
  },
  {
    slug: 'cinnamon-rolls',
    name: 'cinnamon rolls',
    category: 'bakery',
    recipe: {
      dishName: 'Cinnamon rolls with cream cheese icing',
      makes: 12,
      unitWord: 'roll',
      rows: [
        ['All-purpose flour', '2.50', '1', 'kg', '500', 'g'],
        ['Milk', '1.20', '1', 'l', '240', 'ml'],
        ['Butter', '8.00', '1', 'kg', '170', 'g'],
        ['Sugar', '1.80', '1', 'kg', '100', 'g'],
        ['Brown sugar', '2.40', '1', 'kg', '200', 'g'],
        ['Instant yeast', '25.00', '1', 'kg', '7', 'g'],
        ['Ground cinnamon', '20.00', '1', 'kg', '15', 'g'],
        ['Eggs', '3.60', '1', 'dozen', '2', 'each'],
        ['Cream cheese', '9.00', '1', 'kg', '115', 'g'],
        ['Icing sugar', '2.20', '1', 'kg', '120', 'g'],
      ],
    },
    intro:
      'Cinnamon rolls sell at a premium because they are rich and best fresh. Butter and the icing are where the cost goes.',
    drivers: ['Butter in the dough and filling', 'Cream cheese icing', 'Roll size — jumbo rolls use far more dough'],
    tips: [
      'Price jumbo rolls separately — they can use 1.5–2× the dough',
      'Sell take-and-bake trays for weekends at a higher total price',
      'Cost the icing in the same recipe so it is never forgotten',
    ],
    sellWays: 'Sell single rolls, boxes of 4 and 6, and take-and-bake pans.',
    faqs: [
      { q: 'How much should I sell cinnamon rolls for?', a: 'Divide the cost per roll by your target food cost and add packaging and labour. Jumbo or gourmet rolls justify a premium.' },
      { q: 'How many cinnamon rolls does one batch make?', a: 'A 500 g flour dough makes about 12 standard rolls. Set “It makes” to what you actually cut.' },
    ],
  },
  {
    slug: 'cheesecake',
    name: 'cheesecake',
    category: 'bakery',
    recipe: {
      dishName: 'New York cheesecake (9-inch)',
      makes: 12,
      unitWord: 'slice',
      rows: [
        ['Cream cheese', '9.00', '1', 'kg', '900', 'g'],
        ['Sugar', '1.80', '1', 'kg', '200', 'g'],
        ['Eggs', '3.60', '1', 'dozen', '4', 'each'],
        ['Sour cream', '3.50', '450', 'g', '240', 'g'],
        ['Graham crackers', '4.50', '400', 'g', '200', 'g'],
        ['Butter', '8.00', '1', 'kg', '85', 'g'],
        ['Vanilla extract', '15.00', '1', 'l', '10', 'ml'],
      ],
    },
    intro:
      'Cheesecake is ingredient-heavy — almost a kilo of cream cheese in one cake — so it has a higher food cost than most bakes. Price it carefully.',
    drivers: ['Cream cheese (the bulk of the cost)', 'Toppings like fruit compote or caramel', 'Cake boards and boxes'],
    tips: [
      'Cream cheese prices vary a lot between brands and stores — compare per kg',
      'Price toppings as extras or premium flavours',
      'Slices carry more handling and packaging than whole cakes; price them higher per portion',
    ],
    sellWays: 'Sell whole cheesecakes, slices, and mini cheesecakes for events.',
    faqs: [
      { q: 'How much should I charge for a whole cheesecake?', a: 'Multiply the cost per slice by the number of slices, divide by your target food cost, then add the board, box and your time.' },
      { q: 'Why does cheesecake cost more to make than other cakes?', a: 'It uses a lot of cream cheese and eggs, which are expensive per kg compared with flour and sugar.' },
    ],
  },
  {
    slug: 'macarons',
    name: 'macarons',
    category: 'bakery',
    recipe: {
      dishName: 'French macarons with buttercream',
      makes: 24,
      unitWord: 'macaron',
      rows: [
        ['Almond flour', '18.00', '1', 'kg', '100', 'g', '10'],
        ['Icing sugar', '2.20', '1', 'kg', '350', 'g'],
        ['Eggs (whites)', '3.60', '1', 'dozen', '3', 'each'],
        ['Caster sugar', '2.00', '1', 'kg', '100', 'g'],
        ['Butter (filling)', '8.00', '1', 'kg', '115', 'g'],
        ['Macaron box (6)', '15.00', '25', 'piece', '4', 'piece'],
      ],
    },
    intro:
      'Macarons are cheap in ingredients but expensive in skill and failure rate. Cracked or hollow shells are waste — build that into the price.',
    drivers: ['Almond flour', 'Failed shells and uneven batches', 'Presentation boxes'],
    tips: [
      'Add 10–20% waste to almond flour (or reduce “It makes”) to cover failed shells',
      'Sell in boxes of 6 or 12 — singles rarely cover the handling',
      'Seasonal flavours and custom colours justify premium pricing',
    ],
    sellWays: 'Sell boxes of 6, 12 and 24, and towers for weddings.',
    faqs: [
      { q: 'Why are macarons so expensive?', a: 'They need precise technique, have a high failure rate and are packed by hand. Ingredients are a small part of the price.' },
      { q: 'How do I account for failed macaron shells?', a: 'Either add a waste % to the shell ingredients or set “It makes” to the number of good macarons you usually get.' },
    ],
  },
  {
    slug: 'muffins',
    name: 'muffins',
    category: 'bakery',
    recipe: {
      dishName: 'Blueberry muffins',
      makes: 12,
      unitWord: 'muffin',
      rows: [
        ['All-purpose flour', '2.50', '1', 'kg', '250', 'g'],
        ['Sugar', '1.80', '1', 'kg', '150', 'g'],
        ['Butter', '8.00', '1', 'kg', '115', 'g'],
        ['Eggs', '3.60', '1', 'dozen', '2', 'each'],
        ['Milk', '1.20', '1', 'l', '120', 'ml'],
        ['Blueberries', '8.00', '1', 'kg', '200', 'g'],
        ['Baking powder', '5.00', '1', 'kg', '8', 'g'],
        ['Muffin liners', '3.00', '100', 'piece', '12', 'piece'],
      ],
    },
    intro:
      'Muffins are a café staple with an easy margin. Fruit and the muffin size decide the cost.',
    drivers: ['Fruit (fresh berries cost far more than frozen)', 'Jumbo vs standard tins', 'Liners and tulip wraps'],
    tips: [
      'Frozen berries cut cost and waste with little difference in a baked muffin',
      'Price jumbo muffins separately — they use about twice the batter',
      'Streusel tops and fillings support a higher price',
    ],
    sellWays: 'Sell singles, 4-packs and 6-packs, or mini muffins by the dozen.',
    faqs: [
      { q: 'How much should a café charge for a muffin?', a: 'Divide the cost per muffin by your target food cost (cafés often use 25–35% for food) and round to a menu-friendly price.' },
      { q: 'Does muffin size change the price?', a: 'Yes — cost rises with batter weight. Set “It makes” to your actual count per batch.' },
    ],
  },
  {
    slug: 'croissants',
    name: 'croissants',
    category: 'bakery',
    recipe: {
      dishName: 'Butter croissants',
      makes: 12,
      unitWord: 'croissant',
      rows: [
        ['All-purpose flour', '2.50', '1', 'kg', '500', 'g'],
        ['Laminating butter', '12.00', '1', 'kg', '280', 'g'],
        ['Milk', '1.20', '1', 'l', '140', 'ml'],
        ['Sugar', '1.80', '1', 'kg', '55', 'g'],
        ['Instant yeast', '25.00', '1', 'kg', '10', 'g'],
        ['Salt', '1.00', '1', 'kg', '10', 'g'],
        ['Eggs (egg wash)', '3.60', '1', 'dozen', '1', 'each'],
      ],
    },
    intro:
      'Croissants are mostly butter and labour. Laminated dough takes hours, so ingredient cost is a small part of a fair price.',
    drivers: ['Laminating butter (high-fat butter costs more)', 'Trim from cutting triangles', 'Filled versions (almond, chocolate, ham & cheese)'],
    tips: [
      'Use offcuts for pain suisse or cruffins instead of counting them as waste',
      'Cost filled croissants as separate recipes — the filling changes the price a lot',
      'Freeze shaped croissants to bake to demand and cut waste',
    ],
    sellWays: 'Sell plain and filled croissants, and frozen bake-at-home packs.',
    faqs: [
      { q: 'How much does it cost to make a croissant?', a: 'With the example prices, a butter croissant costs well under a dollar in ingredients. The price mainly pays for lamination time.' },
      { q: 'How should I price almond or chocolate croissants?', a: 'Cost them as their own recipe with the filling included, then price from that cost.' },
    ],
  },
  {
    slug: 'cake-pops',
    name: 'cake pops',
    category: 'bakery',
    recipe: {
      dishName: 'Cake pops',
      makes: 24,
      unitWord: 'cake pop',
      rows: [
        ['Cake mix', '2.00', '1', 'piece', '1', 'piece'],
        ['Eggs', '3.60', '1', 'dozen', '3', 'each'],
        ['Vegetable oil', '6.00', '1', 'l', '120', 'ml'],
        ['Frosting (tub)', '2.50', '1', 'piece', '0.5', 'piece'],
        ['Candy melts', '13.50', '1', 'kg', '450', 'g'],
        ['Lollipop sticks', '4.00', '100', 'piece', '24', 'piece'],
        ['Sprinkles', '30.00', '1', 'kg', '30', 'g'],
      ],
    },
    intro:
      'Cake pops are cheap per piece but slow to make. Dipping and decorating time matters far more than the cake.',
    drivers: ['Candy melts or chocolate coating', 'Decorating time per pop', 'Stands, bags and ribbons for gifting'],
    tips: [
      'Price by the dozen with a minimum order — singles rarely pay for your time',
      'Charge more for custom designs, characters and colour matching',
      'Count bags and ribbons as ingredients if every pop is wrapped',
    ],
    sellWays: 'Sell by the dozen, as party packs, or as display stands for events.',
    faqs: [
      { q: 'How much should I charge for cake pops?', a: 'Work out the cost per pop, then add your decorating time per dozen. Custom designs should cost noticeably more than plain dipped pops.' },
      { q: 'Can I use a fraction of a tub of frosting?', a: 'Yes — enter 0.5 piece if you use half a tub. The calculator costs the fraction.' },
    ],
  },
  {
    slug: 'donuts',
    name: 'donuts',
    category: 'bakery',
    recipe: {
      dishName: 'Glazed yeast donuts',
      makes: 12,
      unitWord: 'donut',
      rows: [
        ['All-purpose flour', '2.50', '1', 'kg', '450', 'g'],
        ['Milk', '1.20', '1', 'l', '240', 'ml'],
        ['Sugar', '1.80', '1', 'kg', '60', 'g'],
        ['Butter', '8.00', '1', 'kg', '55', 'g'],
        ['Eggs', '3.60', '1', 'dozen', '2', 'each'],
        ['Instant yeast', '25.00', '1', 'kg', '7', 'g'],
        ['Frying oil (used up)', '6.00', '1', 'l', '500', 'ml'],
        ['Icing sugar (glaze)', '2.20', '1', 'kg', '250', 'g'],
      ],
    },
    intro:
      'Donuts have cheap dough but frying oil is a real cost. Count the oil you use up (absorbed and discarded), not the whole fryer.',
    drivers: ['Frying oil absorbed and replaced', 'Glazes, fillings and toppings', 'Boxes for dozens'],
    tips: [
      'Track how much oil you top up per batch and enter that as the amount used',
      'Price filled and topped donuts as premium versions',
      'Holes and offcuts can be sold as bites instead of wasted',
    ],
    sellWays: 'Sell singles, half-dozens and dozens; filled and topped versions at a premium.',
    faqs: [
      { q: 'How do I include frying oil in donut cost?', a: 'Enter the oil you actually use up per batch (topped up or discarded) as an ingredient. Spread over 12 donuts it is often a significant line.' },
      { q: 'How much should I charge for a dozen donuts?', a: 'Cost per donut × 12, divided by your target food cost, plus the box and labour.' },
    ],
  },
  {
    slug: 'apple-pie',
    name: 'apple pie',
    category: 'bakery',
    recipe: {
      dishName: 'Double-crust apple pie (9-inch)',
      makes: 8,
      unitWord: 'slice',
      rows: [
        ['All-purpose flour', '2.50', '1', 'kg', '300', 'g'],
        ['Butter', '8.00', '1', 'kg', '225', 'g'],
        ['Apples', '3.30', '1', 'kg', '1.2', 'kg', '20'],
        ['Sugar', '1.80', '1', 'kg', '150', 'g'],
        ['Ground cinnamon', '20.00', '1', 'kg', '5', 'g'],
        ['Lemon', '0.50', '1', 'each', '1', 'each'],
        ['Eggs (egg wash)', '3.60', '1', 'dozen', '1', 'each'],
        ['Foil pie tin', '10.00', '20', 'piece', '1', 'piece'],
      ],
    },
    intro:
      'Pies are a strong seasonal seller. Fruit prep waste — cores and peel — is real, so add a waste % to the fruit.',
    drivers: ['Fruit, including peel and core waste', 'All-butter crust vs shortening', 'Pie tins and boxes'],
    tips: [
      'Add 15–25% waste to apples for peel and cores',
      'Holiday pre-orders let you buy fruit in bulk at a lower price',
      'Sell whole pies at a better price per slice than individual slices',
    ],
    sellWays: 'Sell whole pies, slices, and hand pies.',
    faqs: [
      { q: 'How much should I charge for a homemade apple pie?', a: 'Cost the crust and filling (with fruit waste), divide by your target food cost, then add the tin, box and your time.' },
      { q: 'Why add waste to apples?', a: 'You pay for the whole apple but peel and core it. A 20% waste setting means the calculator costs only the usable fruit correctly.' },
    ],
  },
  {
    slug: 'scones',
    name: 'scones',
    category: 'bakery',
    recipe: {
      dishName: 'Scones with jam and cream',
      makes: 8,
      unitWord: 'scone',
      rows: [
        ['Self-raising flour', '2.50', '1', 'kg', '350', 'g'],
        ['Butter', '8.00', '1', 'kg', '85', 'g'],
        ['Sugar', '1.80', '1', 'kg', '50', 'g'],
        ['Milk', '1.20', '1', 'l', '175', 'ml'],
        ['Baking powder', '5.00', '1', 'kg', '15', 'g'],
        ['Eggs', '3.60', '1', 'dozen', '1', 'each'],
        ['Strawberry jam', '4.00', '450', 'g', '160', 'g'],
        ['Clotted or whipped cream', '4.50', '1', 'l', '160', 'ml'],
      ],
    },
    intro:
      'Scones are cheap to bake — the jam and cream served with them can cost more than the scone. Cost them together if you serve them as a set.',
    drivers: ['Jam and cream served on the side', 'Butter', 'Cutter size and re-rolled dough'],
    tips: [
      'Price “scone with jam and cream” as its own way to sell',
      'Re-roll offcuts once; after that they bake tough',
      'Cream tea sets (scones + drink) lift the average order',
    ],
    sellWays: 'Sell plain scones, scones with jam and cream, and cream tea sets.',
    faqs: [
      { q: 'How much should a café charge for a scone with jam and cream?', a: 'Cost the scone plus one portion of jam and cream, then divide by your food cost target.' },
      { q: 'How many scones does a batch make?', a: 'About 8 with a 2.5-inch cutter from 350 g flour. Set “It makes” to your real count.' },
    ],
  },
  {
    slug: 'latte',
    name: 'a latte',
    category: 'cafe',
    recipe: {
      dishName: 'Latte (12 oz)',
      makes: 1,
      unitWord: 'cup',
      rows: [
        ['Espresso beans', '22.00', '1', 'kg', '18', 'g'],
        ['Milk', '1.20', '1', 'l', '240', 'ml', '10'],
        ['Takeaway cup', '12.00', '100', 'piece', '1', 'piece'],
        ['Lid', '5.00', '100', 'piece', '1', 'piece'],
      ],
    },
    intro:
      'A latte costs under a dollar in ingredients. Milk is usually the biggest line — and cups and lids can cost as much as the coffee.',
    drivers: ['Milk (and alternative milks, which can cost 2–3× more)', 'Coffee beans and dose size', 'Cups, lids and sleeves'],
    tips: [
      'Add 5–10% waste to milk for steaming leftovers',
      'Charge extra for oat, almond and other alternative milks',
      'Cost dine-in and takeaway separately — takeaway adds cup and lid',
    ],
    sellWays: 'Sell small, medium and large sizes; add oat milk and extra shots as upgrades.',
    faqs: [
      { q: 'How much does a latte cost to make?', a: 'With the example prices, a 12 oz takeaway latte costs just under a dollar including cup and lid. Use your own bean and milk prices for an exact figure.' },
      { q: 'What food cost % should a coffee shop aim for?', a: 'Drinks are usually priced at 15–25% cost, so the price also covers labour, equipment and rent.' },
    ],
  },
  {
    slug: 'cold-brew',
    name: 'cold brew',
    category: 'cafe',
    recipe: {
      dishName: 'Cold brew (batch, 16 oz serves)',
      makes: 8,
      unitWord: 'cup',
      rows: [
        ['Coffee beans (coarse)', '18.00', '1', 'kg', '250', 'g'],
        ['Clear cups (16 oz)', '15.00', '100', 'piece', '8', 'piece'],
        ['Lids', '6.00', '100', 'piece', '8', 'piece'],
        ['Straws', '4.00', '100', 'piece', '8', 'piece'],
      ],
    },
    intro:
      'Cold brew uses a lot of coffee per batch but almost no labour once it is steeping. Cost the batch, then divide by servings.',
    drivers: ['Coffee-to-water ratio (stronger brews use more beans)', 'Ice displacing liquid in the cup', 'Clear cups, lids and straws'],
    tips: [
      'Measure servings with ice in the cup — it changes how many cups a batch makes',
      'Sell concentrate in bottles at a higher price per serve',
      'Add sweet cream or syrups as paid upgrades',
    ],
    sellWays: 'Sell by the cup in two sizes, and bottled concentrate to take home.',
    faqs: [
      { q: 'How much does cold brew cost per cup?', a: 'Divide the batch cost by the number of cups it fills. With the example prices it is a small fraction of a typical menu price.' },
      { q: 'Should I count ice?', a: 'Ice is usually negligible in cost, but it reduces how much cold brew goes into each cup — so set “It makes” to the real number of servings.' },
    ],
  },
  {
    slug: 'smoothies',
    name: 'smoothies',
    category: 'cafe',
    target: 30,
    range: '25–35%',
    targetLabel: 'smoothies',
    recipe: {
      dishName: 'Strawberry banana smoothie (16 oz)',
      makes: 1,
      unitWord: 'cup',
      rows: [
        ['Banana', '0.25', '1', 'each', '1', 'each'],
        ['Frozen strawberries', '7.00', '1', 'kg', '150', 'g'],
        ['Greek yogurt', '4.00', '1', 'kg', '120', 'g'],
        ['Almond milk', '3.50', '1', 'l', '120', 'ml'],
        ['Honey', '12.00', '1', 'kg', '15', 'g'],
        ['Cup, lid & straw', '20.00', '100', 'piece', '1', 'piece'],
      ],
    },
    intro:
      'Smoothies have a higher ingredient cost than coffee drinks — fruit and yogurt add up. Price them to stay around your drinks target.',
    drivers: ['Fruit (frozen is cheaper and wastes less)', 'Protein powder and superfood add-ins', 'Cups, lids and straws'],
    tips: [
      'Use frozen fruit — consistent price and almost no spoilage',
      'Charge for add-ins (protein, peanut butter, spirulina) separately',
      'Standardise with measuring cups so every smoothie costs the same',
    ],
    sellWays: 'Sell regular and large sizes, with paid add-ins.',
    faqs: [
      { q: 'How much does it cost to make a smoothie to sell?', a: 'Add up fruit, base and packaging per cup. With the example prices it lands around $2.50 — your fruit prices decide it.' },
      { q: 'What should a smoothie sell for?', a: 'Divide the cost per cup by your target (often 25–35% for smoothies) and round to a clean menu price.' },
    ],
  },
  {
    slug: 'lemonade',
    name: 'lemonade',
    category: 'cafe',
    recipe: {
      dishName: 'Fresh lemonade (12 oz cups)',
      makes: 10,
      unitWord: 'cup',
      rows: [
        ['Lemons', '0.50', '1', 'each', '10', 'each'],
        ['Sugar', '1.80', '1', 'kg', '300', 'g'],
        ['Ice', '3.00', '10', 'lb', '5', 'lb'],
        ['Cups', '10.00', '100', 'piece', '10', 'piece'],
      ],
    },
    intro:
      'Fresh lemonade is a classic market and event drink. Lemons are the main cost; cups are next.',
    drivers: ['Lemon prices (they swing seasonally)', 'Cups and ice', 'Flavour add-ins like berries or mint'],
    tips: [
      'Buy lemons by the case when prices are low',
      'Offer a larger size — it costs little more and sells at a higher price',
      'Flavoured versions (strawberry, mint) justify a premium',
    ],
    sellWays: 'Sell by the cup in two sizes, plus jugs for events.',
    faqs: [
      { q: 'How much does lemonade cost to make per cup?', a: 'Divide the batch cost (lemons, sugar, ice, cups) by the number of cups. With the example prices it is about 80 cents per cup.' },
      { q: 'How much should I charge for lemonade at a market?', a: 'Start from cost per cup ÷ your target (20% for drinks) and round up to an easy cash price.' },
    ],
  },
  {
    slug: 'pizza',
    name: 'pizza',
    category: 'dishes',
    recipe: {
      dishName: 'Margherita pizza (12-inch)',
      makes: 1,
      unitWord: 'pizza',
      rows: [
        ['Bread flour', '2.50', '1', 'kg', '250', 'g'],
        ['Instant yeast', '25.00', '1', 'kg', '3', 'g'],
        ['Olive oil', '10.00', '1', 'l', '15', 'ml'],
        ['Crushed tomatoes', '2.50', '800', 'g', '120', 'g'],
        ['Mozzarella', '10.00', '1', 'kg', '200', 'g'],
        ['Fresh basil', '2.50', '30', 'g', '5', 'g', '10'],
        ['Pizza box', '30.00', '50', 'piece', '1', 'piece'],
      ],
    },
    intro:
      'Pizza is one of the highest-margin foods to sell. Cheese is almost always the biggest cost, followed by toppings and the box.',
    drivers: ['Cheese — weigh it, don’t eyeball it', 'Premium toppings (meats, burrata, truffle)', 'Boxes for takeaway and delivery'],
    tips: [
      'Weigh cheese and toppings per size — over-portioning is the biggest margin leak',
      'Cost each topping as a priced extra',
      'Sell by the slice and whole pie — slices usually earn more per pizza',
    ],
    sellWays: 'Sell whole pizzas in sizes, by the slice, and toppings as extras.',
    faqs: [
      { q: 'How much does it cost to make a pizza?', a: 'With the example prices, a 12-inch margherita costs a few dollars including the box. Your cheese price matters most.' },
      { q: 'What food cost % should a pizzeria target?', a: 'Many pizzerias aim for 25–30%. Pizza’s low dough cost makes it easier to hit than most dishes.' },
    ],
  },
  {
    slug: 'burgers',
    name: 'burgers',
    category: 'dishes',
    recipe: {
      dishName: 'Cheeseburger (150 g patty)',
      makes: 4,
      unitWord: 'burger',
      rows: [
        ['Ground beef', '11.00', '1', 'kg', '600', 'g'],
        ['Burger buns', '3.50', '8', 'piece', '4', 'piece'],
        ['Cheddar slices', '9.00', '1', 'kg', '80', 'g'],
        ['Lettuce (head)', '2.00', '1', 'piece', '0.25', 'piece'],
        ['Tomato', '4.00', '1', 'kg', '150', 'g', '10'],
        ['Onion', '2.00', '1', 'kg', '80', 'g', '10'],
        ['Burger sauce', '4.00', '1', 'l', '60', 'ml'],
      ],
    },
    intro:
      'Burgers live or die on beef cost. Cost the burger alone first, then add fries and drinks as separate items or a combo.',
    drivers: ['Beef blend and patty weight', 'Buns (brioche costs more)', 'Cheese, bacon and premium toppings'],
    tips: [
      'Weigh patties — 10 g extra per burger adds up over a week',
      'Cost combos (burger + fries + drink) as their own way to sell',
      'Price bacon, extra patties and cheese as add-ons',
    ],
    sellWays: 'Sell the burger alone, as a combo, and with paid add-ons.',
    faqs: [
      { q: 'How much does it cost to make a burger?', a: 'With the example prices, a cheeseburger costs a few dollars before fries. Beef is most of it.' },
      { q: 'How do I price a burger combo?', a: 'Cost the burger, fries and drink separately, add them up, then price the combo so its food cost stays near your target.' },
    ],
  },
  {
    slug: 'tacos',
    name: 'tacos',
    category: 'dishes',
    recipe: {
      dishName: 'Chicken tacos',
      makes: 12,
      unitWord: 'taco',
      rows: [
        ['Corn tortillas', '3.00', '30', 'piece', '12', 'piece'],
        ['Chicken thighs', '7.00', '1', 'kg', '700', 'g', '10'],
        ['Onion', '2.00', '1', 'kg', '100', 'g', '10'],
        ['Cilantro (bunch)', '1.00', '1', 'piece', '0.5', 'piece'],
        ['Limes', '0.30', '1', 'each', '3', 'each'],
        ['Salsa', '4.00', '500', 'g', '200', 'g'],
        ['Taco seasoning', '15.00', '1', 'kg', '15', 'g'],
        ['Cotija cheese', '12.00', '1', 'kg', '100', 'g'],
      ],
    },
    intro:
      'Tacos are a food-truck favourite because tortillas are cheap and portions are easy to control. Protein is the main cost.',
    drivers: ['Protein (beef, fish and shrimp cost more than chicken)', 'Cheese, guacamole and sour cream', 'Trim and cooking loss on meat'],
    tips: [
      'Add waste to meat for trim and cooking loss',
      'Price premium proteins higher — don’t use one price for all tacos',
      'Charge for guac and extra cheese',
    ],
    sellWays: 'Sell single tacos, plates of 3, and family packs.',
    faqs: [
      { q: 'How much does it cost to make a taco?', a: 'With the example prices, a chicken taco costs just under a dollar. Steak and shrimp cost more.' },
      { q: 'How should a food truck price tacos?', a: 'Cost each protein separately, then price plates of 2–3 so the food cost stays around 25–32%.' },
    ],
  },
  {
    slug: 'biryani',
    name: 'biryani',
    category: 'dishes',
    currency: '₹',
    recipe: {
      dishName: 'Chicken biryani',
      makes: 6,
      unitWord: 'plate',
      rows: [
        ['Basmati rice', '120', '1', 'kg', '500', 'g'],
        ['Chicken (curry cut)', '260', '1', 'kg', '1', 'kg', '5'],
        ['Onions', '40', '1', 'kg', '400', 'g', '10'],
        ['Curd (yogurt)', '120', '1', 'kg', '250', 'g'],
        ['Ghee', '650', '1', 'kg', '60', 'g'],
        ['Cooking oil', '180', '1', 'l', '60', 'ml'],
        ['Biryani masala', '1000', '1', 'kg', '30', 'g'],
        ['Tomatoes', '40', '1', 'kg', '200', 'g'],
        ['Mint & coriander', '20', '1', 'piece', '1', 'piece'],
      ],
    },
    intro:
      'Biryani is a top seller for cloud kitchens and caterers in India. Chicken and rice are most of the cost, and ghee and fried onions add up quickly.',
    drivers: ['Chicken or mutton (mutton can cost 2–3× chicken)', 'Basmati rice grade', 'Ghee, saffron and fried onions'],
    tips: [
      'Price mutton and chicken biryani separately — never one price',
      'Include containers and delivery-app commission in your price',
      'Cost a “half” and “full” portion as separate ways to sell',
    ],
    sellWays: 'Sell half and full plates, family packs, and catering by the kg.',
    faqs: [
      { q: 'How much does it cost to make one plate of biryani?', a: 'With the example prices, one plate of chicken biryani costs a little over ₹80 in ingredients. Use your local prices for an exact figure.' },
      { q: 'How should cloud kitchens price biryani on Swiggy or Zomato?', a: 'Start from cost per plate, then add packaging and the app’s commission before applying your food cost target.' },
    ],
  },
  {
    slug: 'pasta',
    name: 'pasta',
    category: 'dishes',
    recipe: {
      dishName: 'Spaghetti bolognese',
      makes: 5,
      unitWord: 'plate',
      rows: [
        ['Spaghetti', '2.00', '500', 'g', '500', 'g'],
        ['Ground beef', '11.00', '1', 'kg', '450', 'g'],
        ['Crushed tomatoes', '2.50', '800', 'g', '800', 'g'],
        ['Onion', '2.00', '1', 'kg', '150', 'g', '10'],
        ['Garlic', '6.00', '1', 'kg', '15', 'g', '15'],
        ['Olive oil', '10.00', '1', 'l', '30', 'ml'],
        ['Parmesan', '22.00', '1', 'kg', '40', 'g'],
      ],
    },
    intro:
      'Pasta is one of the best-margin dishes on any menu — dried pasta is cheap, and sauces can be batch-cooked.',
    drivers: ['Protein in the sauce', 'Cheese (parmesan is expensive per kg)', 'Fresh vs dried pasta'],
    tips: [
      'Batch-cook sauces and cost them per portion',
      'Weigh pasta portions (dry weight) for consistency',
      'Fresh or filled pasta justifies a higher price',
    ],
    sellWays: 'Sell regular and large plates, and family trays for takeaway.',
    faqs: [
      { q: 'How much does a plate of pasta cost to make?', a: 'With the example prices, spaghetti bolognese costs a couple of dollars per plate. Meat and cheese are most of it.' },
      { q: 'What is a good food cost for pasta dishes?', a: 'Pasta often runs below 25%, which helps balance higher-cost dishes like steak or seafood.' },
    ],
  },
  {
    slug: 'sandwiches',
    name: 'sandwiches',
    category: 'dishes',
    recipe: {
      dishName: 'Turkey & cheese sandwich',
      makes: 4,
      unitWord: 'sandwich',
      rows: [
        ['Sliced bread (20 slices)', '4.00', '20', 'piece', '8', 'piece'],
        ['Turkey breast (deli)', '14.00', '1', 'kg', '340', 'g'],
        ['Cheddar', '9.00', '1', 'kg', '110', 'g'],
        ['Lettuce (head)', '2.00', '1', 'piece', '0.25', 'piece'],
        ['Tomato', '4.00', '1', 'kg', '150', 'g', '10'],
        ['Mayonnaise', '5.00', '1', 'l', '40', 'ml'],
        ['Sandwich wrap / box', '8.00', '100', 'piece', '4', 'piece'],
      ],
    },
    intro:
      'Sandwiches are quick to make and easy to cost. Fillings decide the price — deli meat and cheese are most of it.',
    drivers: ['Deli meats and cheese', 'Artisan bread vs sliced loaf', 'Wraps, boxes and labels for grab-and-go'],
    tips: [
      'Weigh fillings per sandwich so the cost stays consistent',
      'Price grab-and-go higher than made-to-order to cover packaging and waste',
      'Meal deals (sandwich + drink + snack) raise the average order',
    ],
    sellWays: 'Sell singles, meal deals, and platters for catering.',
    faqs: [
      { q: 'How much does it cost to make a sandwich to sell?', a: 'With the example prices, a turkey and cheese sandwich costs a couple of dollars including packaging.' },
      { q: 'How do I price sandwich platters?', a: 'Cost one sandwich, multiply by the number on the platter, add the platter, then apply your target food cost.' },
    ],
  },
  {
    slug: 'meal-prep',
    name: 'meal prep',
    category: 'dishes',
    recipe: {
      dishName: 'Chicken, rice & broccoli meal prep',
      makes: 5,
      unitWord: 'meal',
      rows: [
        ['Chicken breast', '9.00', '1', 'kg', '750', 'g', '10'],
        ['Rice', '2.50', '1', 'kg', '375', 'g'],
        ['Broccoli', '4.40', '1', 'kg', '500', 'g', '25'],
        ['Olive oil', '10.00', '1', 'l', '30', 'ml'],
        ['Seasoning', '15.00', '1', 'kg', '15', 'g'],
        ['Meal prep containers', '25.00', '50', 'piece', '5', 'piece'],
      ],
    },
    intro:
      'Meal prep businesses sell volume, so a few cents per meal matters. Protein and containers are the biggest costs.',
    drivers: ['Protein portion size', 'Vegetable trim waste (broccoli stalks, peel)', 'Containers, labels and delivery'],
    tips: [
      'Add waste to vegetables for stalks and trim',
      'Offer weekly bundles of 5, 10 and 15 meals at tiered prices',
      'Include delivery and containers in the price — they are part of every meal',
    ],
    sellWays: 'Sell single meals and weekly bundles (5, 10, 15) at tiered prices.',
    faqs: [
      { q: 'How much does a meal prep meal cost to make?', a: 'With the example prices, a chicken, rice and broccoli meal costs just under $3 including the container.' },
      { q: 'How should I price meal prep bundles?', a: 'Cost one meal, then set bundle prices that give a small discount while keeping food cost near your target.' },
    ],
  },
];

export function getPricingItem(slug) {
  return PRICING_ITEMS.find((item) => item.slug === slug) ?? null;
}

function toRowObject([name, buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent = '']) {
  return { name, buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent };
}

/** Worked-example numbers for an item, computed with the same maths as the calculator. */
export function computePricingExample(item) {
  const category = PRICING_CATEGORIES[item.category];
  const lines = item.recipe.rows.map((row) => {
    const parsed = toRowObject(row);
    return { ...parsed, cost: ingredientLineCost(parsed).cost ?? 0 };
  });
  const totalCost = lines.reduce((sum, line) => sum + line.cost, 0);
  const target = item.target ?? category.target;
  const range = item.range ?? category.range;
  const summary = dishSummary({ totalCost, quantityMade: item.recipe.makes, targetPercent: target });
  const [low, high] = range.split('–').map((n) => parseFloat(n));
  return {
    lines: [...lines].sort((a, b) => b.cost - a.cost),
    totalCost,
    costPerUnit: summary.costPerUnit,
    suggestedPrice: summary.suggestedPrice,
    priceAtLowFoodCost: roundPriceUp(summary.costPerUnit / (low / 100)),
    priceAtHighFoodCost: roundPriceUp(summary.costPerUnit / (high / 100)),
    target,
    range,
    targetLabel: item.targetLabel ?? category.label.toLowerCase(),
    lowPercent: low,
    highPercent: high,
  };
}
