/**
 * SEO pages served at /[slug].
 * kind 'tool'  — calculator-first landing pages (target "… calculator" searches)
 * kind 'guide' — how-to articles with an embedded calculator (target "how to …" searches)
 */
export const SEO_LANDING_PAGES = [
  {
    kind: 'tool',
    slug: 'food-cost-calculator',
    eyebrow: 'Free food cost calculator',
    navLabel: 'Food cost calculator',
    h1: 'Free food cost calculator',
    subtitle:
      'Add your ingredients with what you paid, and see the cost per serving, a suggested selling price, your food cost % and profit — right here, no sign-up.',
    metaTitle: 'Free Food Cost Calculator — Cost Per Serving, Food Cost % & Price',
    metaDescription:
      'Free online food cost calculator. Enter what you paid for each ingredient and how much you use — get cost per serving, suggested price, food cost % and profit instantly. Any currency.',
    calculator: { mode: 'recipe', preset: 'pasta' },
    bulletsTitle: 'Want to keep your numbers? The free CostMyDish app also:',
    bullets: [
      'Saves every ingredient price to your Library — reuse it in any dish',
      'Updates every dish automatically when a buy price changes',
      'Lets you sell one recipe several ways (by the slice and whole) with profit for each',
      'Flags dishes that drift over your target food cost %',
      'Free plan: 5 dishes and 20 ingredients — no credit card',
    ],
    faqs: [
      {
        q: 'How does this food cost calculator work?',
        a: 'For each ingredient it divides what you paid by the amount you bought, converts units (kg to g, litres to ml, cups to ml and so on), multiplies by the amount you use, and adds waste. It adds the lines up, divides by how many servings the recipe makes, and divides that by your target food cost % to suggest a price.',
      },
      {
        q: 'What is a good food cost percentage?',
        a: 'Most restaurants aim for 28–35%. Bakeries and cafés often aim for 25–35%, and drinks are usually lower. Set your own target in the calculator — the suggested price updates instantly.',
      },
      {
        q: 'Why does waste % make the cost go up?',
        a: 'If 10% of a chicken breast is trimmed off, only 90% of what you paid for ends up on the plate. The calculator divides by the usable share (cost ÷ 0.9), which is the same method professional kitchens use.',
      },
      {
        q: 'Is this the same maths as the CostMyDish app?',
        a: 'Yes. The calculator uses the same unit conversions, waste formula and price rounding as the app, so a dish costed here shows the same numbers in the app.',
      },
    ],
  },
  {
    kind: 'tool',
    slug: 'recipe-cost-calculator',
    eyebrow: 'Recipe cost calculator',
    navLabel: 'Recipe cost calculator',
    h1: 'Recipe cost calculator — cost per serving in 2 minutes',
    subtitle:
      'Work out exactly what a recipe costs to make, what each serving costs, and what to charge. Try it with the example cookies or clear it and cost your own recipe.',
    metaTitle: 'Recipe Cost Calculator (Free) — Cost Per Serving & Selling Price',
    metaDescription:
      'Free recipe cost calculator: enter ingredient prices and quantities in any unit, get total recipe cost, cost per serving and a suggested selling price. Works for bakers, cafés and restaurants.',
    calculator: { mode: 'recipe', preset: 'cookies' },
    bulletsTitle: 'Cost recipes on your phone with the free app:',
    bullets: [
      'Type what you’re making, add ingredients, and see the cost live as you go',
      'Ingredients you add are saved to your Library for the next recipe',
      'Per-ingredient breakdown shows which ingredient eats your margin',
      'Mix kg, g, oz, lb, ml, cups and spoons — conversions are automatic',
      'Any currency: $, £, €, ₹, A$, C$ and more',
    ],
    faqs: [
      {
        q: 'How do I calculate the cost of a recipe?',
        a: 'For each ingredient: (price paid ÷ amount bought) × amount used. Add every ingredient together for the recipe cost, then divide by the number of servings for the cost per serving. The calculator above does all of this, including unit conversion.',
      },
      {
        q: 'How is recipe cost different from food cost %?',
        a: 'Recipe cost is what the ingredients cost you. Food cost % compares that to the selling price: cost per serving ÷ price × 100. A $0.60 cookie sold for $2.00 has a 30% food cost.',
      },
      {
        q: 'Can I cost a recipe that uses cups but I buy flour by the kg?',
        a: 'Volume and weight can’t be converted without knowing the ingredient’s density, so buy and use in the same kind of unit (for example kg and g). For flour, weigh a cup once — about 120–130 g — and use grams.',
      },
      {
        q: 'Who uses a recipe cost calculator?',
        a: 'Home bakers selling cakes and cookies, cafés, food trucks, caterers, meal-prep businesses and independent restaurants — anyone who needs to price food so it makes a profit.',
      },
    ],
  },
  {
    kind: 'tool',
    slug: 'bakery-pricing-calculator',
    eyebrow: 'Bakery pricing calculator',
    navLabel: 'Bakery pricing calculator',
    h1: 'Bakery pricing calculator for cakes, cookies & pastries',
    subtitle:
      'Find what each slice, cookie or whole cake really costs you, and the price that hits your target margin. Try the example cake or enter your own recipe.',
    metaTitle: 'Bakery Pricing Calculator (Free) — Price Cakes, Cookies & Bread',
    metaDescription:
      'Free bakery pricing calculator for home bakers and bakeries. Cost your recipe, get cost per slice or per cookie, and a suggested price. Sell by the slice and whole cake in the free app.',
    calculator: { mode: 'recipe', preset: 'cake' },
    bulletsTitle: 'Bakers use the free CostMyDish app to:',
    bullets: [
      'Price the same cake by the slice and as a whole cake, with profit for each',
      'Add boxes, boards and cupcake liners as ingredients so packaging is counted',
      'Update the price of butter or eggs once — every bake recalculates',
      'See which bakes are over your target food cost %',
      'Start free — upgrade only when your menu grows',
    ],
    faqs: [
      {
        q: 'What food cost % should a bakery aim for?',
        a: 'Many bakeries aim for 25–35% ingredient cost. Home bakers who sell custom cakes often land well below that, because their time is the biggest cost. See our guide on how to price cakes for including labour.',
      },
      {
        q: 'How do I price a cake by the slice?',
        a: 'Set “It makes” to the number of slices (for example 12) and enter your price per slice. The calculator shows cost per slice, profit per slice and the suggested slice price.',
      },
      {
        q: 'Is this only for professional bakeries?',
        a: 'No. Home bakers selling at markets, online or to friends use it to stop undercharging. The free app plan covers 5 bakes and 20 ingredients.',
      },
    ],
  },
  {
    kind: 'tool',
    slug: 'restaurant-menu-costing',
    eyebrow: 'Restaurant menu costing',
    navLabel: 'Restaurant menu costing',
    h1: 'Restaurant menu costing — know the margin on every dish',
    subtitle:
      'Cost a menu item from your supplier prices, including trim and waste, and see the plate cost, food cost % and the price that hits your target.',
    metaTitle: 'Restaurant Menu Costing Calculator — Plate Cost & Food Cost % (Free)',
    metaDescription:
      'Free menu costing calculator for restaurants, cafés and food trucks. Get plate cost with waste, food cost % and suggested menu price. Keep every dish on target with the free app.',
    calculator: { mode: 'recipe', preset: 'pasta' },
    bulletsTitle: 'Keep your whole menu on target with the free app:',
    bullets: [
      'Home screen highlights dishes that are over your target food cost %',
      'Filter dishes by On target and Over target',
      'Update a supplier price once — every dish that uses it recalculates',
      'No POS or inventory system needed — works on its own',
      'A fraction of the price of meez or xtraCHEF',
    ],
    faqs: [
      {
        q: 'How does CostMyDish compare to meez or xtraCHEF?',
        a: 'Tools like meez and xtraCHEF are built for multi-location groups with invoice scanning and integrations, often $75+ a month. CostMyDish is a focused phone app for recipe costing and margins: free to start and fast to learn.',
      },
      {
        q: 'How do I include waste and trim?',
        a: 'Enter a waste % on the ingredient — for example 10% for chicken trim. The cost is divided by the usable share, so the plate cost reflects what you actually paid for.',
      },
      {
        q: 'What about food trucks and caterers?',
        a: 'Same calculator and app. Cost combos, catering trays and single items, and add more than one way to sell the same recipe.',
      },
    ],
  },

  {
    kind: 'guide',
    slug: 'food-cost-percentage',
    eyebrow: 'Guide · Food cost %',
    navLabel: 'Food cost percentage',
    h1: 'Food cost percentage: formula, calculator and good targets',
    subtitle:
      'What food cost % means, how to calculate it, what a healthy number looks like, and how to set a menu price from it — with a free calculator.',
    metaTitle: 'Food Cost Percentage: Formula, Calculator & Ideal Targets (2026)',
    metaDescription:
      'Food cost percentage = ingredient cost ÷ selling price × 100. Learn the formula, see examples, check good targets for restaurants, cafés and bakeries, and use the free calculator.',
    calculator: { mode: 'quick', title: 'Food cost % calculator' },
    secondCalculator: { mode: 'recipe', preset: 'pasta', title: 'Don’t know your plate cost? Work it out here' },
    sections: [
      {
        h2: 'What is food cost percentage?',
        body: [
          'Food cost percentage is the share of a dish’s selling price that goes on ingredients. If a plate sells for $12 and its ingredients cost $3.20, about 27% of every sale pays for food. The rest has to cover staff, rent, energy, packaging and your profit.',
          'It is the single most useful number for pricing food, because it lets you compare a $4 cookie and a $28 steak on the same scale.',
        ],
      },
      {
        h2: 'The food cost percentage formula',
        formula: 'Food cost % = ingredient cost per serving ÷ selling price × 100',
        body: [
          'Example: a pasta dish costs $3.20 in ingredients and sells for $12.00. $3.20 ÷ $12.00 × 100 = 26.7% food cost, leaving $8.80 gross profit per plate.',
          'To find a price from a target, flip the formula: selling price = ingredient cost ÷ target %. For a 30% target: $3.20 ÷ 0.30 = $10.67.',
        ],
      },
      {
        h2: 'What is a good food cost percentage?',
        list: [
          'Full-service restaurants: usually 28–35%',
          'Quick service and food trucks: around 25–32%',
          'Cafés and coffee shops: drinks often 15–25%, food 28–35%',
          'Bakeries: often 25–35%; custom cakes much lower, because labour is the main cost',
          'Fine dining and premium cuts: can run 35–40% when prices carry it',
        ],
        body: [
          'There is no single right number. A higher food cost % can work for a dish that sells in volume or needs little prep; a lower one is needed when labour, rent or delivery fees are high. Pick a target, then keep every dish close to it.',
        ],
      },
      {
        h2: 'Menu-level vs. per-dish food cost',
        body: [
          'Your overall (actual) food cost for a period is: (opening stock + purchases − closing stock) ÷ food sales × 100. That tells you how the business did, including waste and over-portioning.',
          'Per-dish (theoretical) food cost is what this page calculates: what each dish should cost when it is made to the recipe. If your actual number is well above the theoretical one, look for waste, portion sizes or prices that have gone up.',
        ],
      },
      {
        h2: 'How to lower your food cost percentage',
        list: [
          'Re-cost dishes when supplier prices change — most margin loss comes from old prices',
          'Account for trim and waste on meat, fish and vegetables',
          'Standardise portions with scoops, scales and recipe cards',
          'Raise the price of dishes that are over target, or swap one expensive ingredient',
          'Promote dishes with a low food cost % and high profit per plate',
        ],
      },
    ],
    bulletsTitle: 'Track food cost % for every dish with the free app:',
    bullets: [
      'Live food cost % and profit while you build a dish',
      'Green, yellow and red status against your own target',
      'Update an ingredient price once — every dish recalculates',
    ],
    faqs: [
      {
        q: 'How do I calculate food cost percentage?',
        a: 'Divide the ingredient cost of one serving by its selling price and multiply by 100. $3.20 ÷ $12.00 × 100 = 26.7%.',
      },
      {
        q: 'What is the ideal food cost percentage for a restaurant?',
        a: 'Most restaurants aim for 28–35%. The right target depends on your labour, rent and price level.',
      },
      {
        q: 'How do I price a dish from food cost percentage?',
        a: 'Divide the cost per serving by your target as a decimal. A $3.00 plate at a 30% target should sell for at least $10.00.',
      },
      {
        q: 'Should food cost % include packaging?',
        a: 'For takeaway, delivery and bakery boxes, yes — include packaging so the price covers it. In the CostMyDish app you can add packaging as an ingredient.',
      },
    ],
  },
  {
    kind: 'guide',
    slug: 'how-to-calculate-food-cost',
    eyebrow: 'Guide · Food costing',
    navLabel: 'How to calculate food cost',
    h1: 'How to calculate food cost (step by step, with examples)',
    subtitle:
      'Work out what any dish costs to make — including unit conversions and waste — then turn it into a menu price. Follow along with the free calculator.',
    metaTitle: 'How to Calculate Food Cost: Step-by-Step Formula + Free Calculator',
    metaDescription:
      'Learn how to calculate food cost per plate in 5 steps: ingredient cost, unit conversion, waste, cost per serving and selling price. Worked example and free food cost calculator.',
    calculator: { mode: 'recipe', preset: 'pasta', title: 'Follow along: chicken alfredo, 4 plates' },
    calculatorAfterSection: 1,
    sections: [
      {
        h2: 'The short version',
        formula: 'Ingredient cost = (price paid ÷ amount bought) × amount used ÷ (1 − waste %)',
        body: [
          'Add up every ingredient, divide by the number of servings, and you have the cost per plate. Divide that by your target food cost % (for example 0.30) to get the minimum price.',
        ],
      },
      {
        h2: 'Step 1: write down what you paid',
        body: [
          'For each ingredient, note the price and the pack size from your receipt or supplier invoice: fettuccine $3.00 for 500 g, chicken breast $9.00 per kg, cream $4.50 per litre. Use the price you actually pay now, not last year’s.',
        ],
      },
      {
        h2: 'Step 2: write down how much the recipe uses',
        body: [
          'Measure the amount that goes into one batch: 400 g pasta, 500 g chicken, 300 ml cream, 80 g parmesan, 40 g butter, 15 g garlic. Weigh where you can — it is more accurate than cups.',
        ],
      },
      {
        h2: 'Step 3: convert units and work out each line',
        body: [
          'Convert the pack size into the same unit as the recipe. Cream: $4.50 per 1,000 ml, and you use 300 ml → 300 ÷ 1,000 × $4.50 = $1.35. Pasta: 400 ÷ 500 × $3.00 = $2.40.',
          'Weight converts to weight and volume to volume. You can’t convert grams to cups without knowing the ingredient’s density, so buy and use in the same kind of unit.',
        ],
      },
      {
        h2: 'Step 4: add waste and trim',
        body: [
          'If you lose 10% of the chicken to trim, you pay for 100% but only use 90%. Divide by the usable share: $4.50 ÷ 0.90 = $5.00. Garlic at 15% waste: $0.09 ÷ 0.85 ≈ $0.11.',
        ],
      },
      {
        h2: 'Step 5: cost per serving and price',
        body: [
          'Add the lines: $2.40 + $5.00 + $1.35 + $1.76 + $0.32 + $0.11 ≈ $10.94 for the batch. The recipe makes 4 plates, so each costs about $2.73.',
          'At a 30% target food cost: $2.734 ÷ 0.30 = $9.12 minimum price (rounded up to the cent). Sell at $14.00 and your food cost is about 19.6% with $11.27 gross profit per plate.',
        ],
      },
      {
        h2: 'Common mistakes',
        list: [
          'Using old prices — re-cost when a supplier price changes',
          'Forgetting oil, salt, garnish and sauces — small items add up across a menu',
          'Ignoring waste on meat, fish and fresh produce',
          'Mixing weight and volume (grams of flour vs cups of flour)',
          'Costing one batch but selling a different portion size',
        ],
      },
    ],
    bulletsTitle: 'Stop re-doing this in spreadsheets:',
    bullets: [
      'CostMyDish saves each ingredient price once and reuses it in every dish',
      'Change a price and every dish recalculates',
      'Free plan: 5 dishes and 20 ingredients',
    ],
    faqs: [
      {
        q: 'What is the formula for food cost?',
        a: 'Per ingredient: (price paid ÷ amount bought) × amount used, divided by (1 − waste %). Add the ingredients and divide by servings for the cost per plate.',
      },
      {
        q: 'How do I calculate food cost per plate?',
        a: 'Cost the whole recipe, then divide by the number of plates it makes. A $10.94 batch that makes 4 plates costs $2.73 per plate.',
      },
      {
        q: 'How often should I recalculate food cost?',
        a: 'Whenever a key supplier price changes, and at least every few months. An app that stores your prices makes this a one-minute job.',
      },
    ],
  },
  {
    kind: 'guide',
    slug: 'recipe-costing',
    eyebrow: 'Guide · Recipe costing',
    navLabel: 'Recipe costing guide',
    h1: 'Recipe costing: how to cost a recipe step by step',
    subtitle:
      'A practical recipe costing method for bakers, cafés and restaurants — what to record, how to handle units and yield, and how to keep costs up to date.',
    metaTitle: 'Recipe Costing: How to Cost a Recipe Step by Step (+ Free Template)',
    metaDescription:
      'How to cost a recipe: list ingredients, record purchase prices, convert units, set the yield and calculate cost per portion. Free recipe costing calculator and worked example.',
    calculator: { mode: 'recipe', preset: 'cookies', title: 'Worked example: 24 chocolate chip cookies' },
    calculatorAfterSection: 2,
    sections: [
      {
        h2: 'What is recipe costing?',
        body: [
          'Recipe costing means working out exactly what one batch of a recipe — and one portion of it — costs in ingredients. It is the starting point for pricing, spotting dishes that lose money, and noticing when supplier price rises eat your margin.',
        ],
      },
      {
        h2: 'What you need for each recipe',
        list: [
          'Every ingredient, including small ones (salt, oil, vanilla, garnish)',
          'The price you paid and the pack size for each ingredient',
          'The amount used in one batch, in a weight, volume or count unit',
          'Waste or trim % where it applies (meat, fish, fruit, vegetables)',
          'The yield: how many portions, slices or pieces the batch makes',
        ],
      },
      {
        h2: 'Worked example: chocolate chip cookies',
        body: [
          'Flour at $2.50/kg, 250 g used → $0.63. Butter $8.00/kg, 150 g → $1.20. 2 eggs at $0.30 → $0.60. Sugar $1.80/kg, 100 g → $0.18. Chocolate chips $12.00/kg, 150 g → $1.80. Vanilla $15.00/L, 5 ml → $0.08. Baking powder and salt add a few cents.',
          'The batch costs about $4.51 and makes 24 cookies, so each cookie costs about $0.19. At a 30% target food cost the minimum price is $0.63 per cookie.',
        ],
      },
      {
        h2: 'Yield: the step most people skip',
        body: [
          'Cost is only useful per portion. Count what the batch actually produces after baking or cooking — not what the recipe card promises. If a cake is cut into 10 slices instead of 12, every slice costs 20% more.',
          'If you sell the same recipe in different ways — by the slice and as a whole cake, or a single item and a combo — work out the price for each one.',
        ],
      },
      {
        h2: 'Keep your recipe costs up to date',
        body: [
          'A recipe costing sheet is out of date the day an ingredient price changes. Keep one list of ingredient prices and have every recipe read from it, so one update fixes every recipe. That is exactly how the CostMyDish app works.',
        ],
      },
      {
        h2: 'Recipe costing template vs. an app',
        body: [
          'A spreadsheet template works for a handful of recipes, but formulas break when units mix and you have to update prices in many places. A recipe costing app stores your prices once, converts units for you and recalculates every recipe when a price changes.',
        ],
      },
    ],
    bulletsTitle: 'Cost recipes on your phone with the free app:',
    bullets: [
      'Type what you’re making and add ingredients — cost updates live',
      'Ingredients are saved to your Library and reused across recipes',
      'Per-ingredient breakdown, cost per portion and suggested price',
    ],
    faqs: [
      {
        q: 'How do you cost a recipe?',
        a: 'List every ingredient with the price you paid and pack size, work out the cost of the amount used, add them up, and divide by the number of portions.',
      },
      {
        q: 'What is the difference between recipe cost and plate cost?',
        a: 'Recipe cost is the whole batch; plate (portion) cost is the batch divided by the number of portions it makes.',
      },
      {
        q: 'Is there a free recipe costing template?',
        a: 'The calculator on this page works like a template with the maths done for you. To save recipes and update prices in one place, use the free CostMyDish app.',
      },
    ],
  },
  {
    kind: 'guide',
    slug: 'how-to-price-cakes',
    eyebrow: 'Guide · Cake pricing',
    navLabel: 'How to price cakes',
    h1: 'How to price cakes (including your time)',
    subtitle:
      'A simple cake pricing formula for home bakers and bakeries: ingredients, packaging, your time, overheads and profit — with a free cake cost calculator.',
    metaTitle: 'How to Price Cakes: Simple Cake Pricing Formula + Free Calculator',
    metaDescription:
      'How much to charge for a cake: cost your ingredients, add packaging, pay yourself per hour, cover overheads and add profit. Worked example and free cake cost calculator for home bakers.',
    calculator: { mode: 'recipe', preset: 'cake', title: 'Step 1: what your cake costs in ingredients' },
    calculatorAfterSection: 1,
    sections: [
      {
        h2: 'The cake pricing formula',
        formula: 'Cake price = (ingredients + packaging + your time + overheads) × (1 + profit %)',
        body: [
          'Most home bakers undercharge because they only count ingredients. Ingredients are usually the smallest part of a custom cake’s price — your hours are the biggest.',
        ],
      },
      {
        h2: 'Step 1: cost the ingredients',
        body: [
          'Use the calculator to cost the cake and frosting from what you paid. In the example, a 12-slice vanilla layer cake with cream cheese frosting costs about $7.54 in ingredients — about $0.63 a slice.',
        ],
      },
      {
        h2: 'Step 2: add packaging',
        body: [
          'Cake box, board, dowels, toppers, ribbon, cupcake liners. A box and board might be $2.50 per cake. In the CostMyDish app you can add these as ingredients (for example “Cake box, 10 for $12, use 1”) so they are always counted.',
        ],
      },
      {
        h2: 'Step 3: pay yourself',
        body: [
          'Track the real time: baking, cooling, filling, decorating, cleaning and talking to the customer. If a cake takes 3 hours and you pay yourself $15 an hour, that is $45 — already six times the ingredient cost.',
        ],
      },
      {
        h2: 'Step 4: cover overheads and add profit',
        body: [
          'Overheads are electricity, gas, equipment wear, card fees, delivery fuel and marketplace fees. Many home bakers add 10–20% for these. Then add profit on top so the business can grow — 15–30% is common.',
          'Example: $7.54 ingredients + $2.50 packaging + $45 time = $55.04. Add 15% overheads → $63.30. Add 20% profit → about $76. Ingredients are then roughly 10% of the price.',
        ],
      },
      {
        h2: 'Pricing by the slice vs. whole cake',
        body: [
          'Slices take more handling and packaging, so they usually carry a higher price per portion. For a café, cost per slice is often priced at 25–35% food cost; a 12-slice cake costing $0.63 a slice suggests at least $2.10 a slice for ingredients alone at 30%, before labour.',
          'In the app you can add both ways to sell the same cake — by the slice and whole — and see the profit on each.',
        ],
      },
      {
        h2: 'Checklist before you quote',
        list: [
          'Did you use today’s ingredient prices (butter and eggs change often)?',
          'Did you include frosting, fillings and decorations?',
          'Did you count packaging and delivery?',
          'Did you pay yourself for every hour, not just baking time?',
          'Would you still be happy at this price after 20 orders?',
        ],
      },
    ],
    bulletsTitle: 'Bakers use the free CostMyDish app to:',
    bullets: [
      'Keep ingredient prices in one place and re-cost every bake in seconds',
      'Price by the slice and whole cake from one recipe',
      'Add packaging as an ingredient so it is never forgotten',
    ],
    faqs: [
      {
        q: 'How much should I charge for a homemade cake?',
        a: 'Add ingredients, packaging, your hours at a fair hourly rate and 10–20% for overheads, then add 15–30% profit. Ingredients alone are rarely more than a quarter of a fair custom-cake price.',
      },
      {
        q: 'How do I calculate the cost of a cake?',
        a: 'Cost each ingredient from what you paid: (price ÷ pack size) × amount used. Add the cake, filling and frosting together, then divide by slices for cost per slice.',
      },
      {
        q: 'Should I charge for my time when baking at home?',
        a: 'Yes. If you don’t, you are paying customers to take your cakes. Track your real hours for a few orders and set an hourly rate you would accept for any other job.',
      },
    ],
  },
];

export function getLandingPage(slug) {
  return SEO_LANDING_PAGES.find((page) => page.slug === slug) ?? null;
}
