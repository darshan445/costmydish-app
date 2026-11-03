import { BASE_CURRENCY, moneyFor } from '@/lib/currency';
import { cakePrice, dishSummary, formatPercent, roundPriceUp } from '@/lib/food-cost';
import { CAKE_EXTRAS, presetExample } from '@/lib/presets';

/** "30.0%" → "30%" for prose. */
const pct = (value) => formatPercent(value).replace(/\.0%$/, '%');

/** Plate example used across the guides: $3.20 plate cost, $12 selling price, 30% target. */
function plateExample(c) {
  const cost = c.p(3.2);
  const sell = c.p(12);
  return { cost, sell, percent: (cost / sell) * 100, profit: sell - cost, minimum: roundPriceUp(cost / 0.3) };
}

function cookieExample(c) {
  const cookies = presetExample('cookies', c.code);
  const perCookie = cookies.totalCost / Number(cookies.makes);
  return { ...cookies, perCookie, minimum: roundPriceUp(perCookie / 0.3) };
}

function cakeExample(c) {
  const cake = presetExample('cake', c.code);
  const packaging = c.p(CAKE_EXTRAS.packaging);
  const hourlyRate = c.p(CAKE_EXTRAS.hourlyRate);
  const hours = Number(CAKE_EXTRAS.hours);
  const result = cakePrice({
    ingredientCost: cake.totalCost,
    packaging,
    hours,
    hourlyRate,
    overheadPercent: CAKE_EXTRAS.overheadPercent,
    profitPercent: CAKE_EXTRAS.profitPercent,
    portions: cake.makes,
  });
  const perSlice = cake.totalCost / Number(cake.makes);
  return {
    ...result,
    ingredients: cake.totalCost,
    perSlice,
    packaging,
    hourlyRate,
    hours,
    direct: cake.totalCost + packaging + result.labour,
    sliceAt30: roundPriceUp(perSlice / 0.3),
  };
}

function pastaExample(c) {
  const pasta = presetExample('pasta', c.code);
  const fettuccine = pasta.line('Fettuccine');
  const chicken = pasta.line('Chicken breast');
  const cream = pasta.line('Heavy cream');
  const garlic = pasta.line('Garlic');
  const perPlate = pasta.totalCost / Number(pasta.makes);
  const summary = dishSummary({ totalCost: pasta.totalCost, quantityMade: pasta.makes, targetPercent: 30, sellingPrice: String(c.p(14)) });
  return {
    ...pasta,
    fettuccine,
    chicken,
    cream,
    garlic,
    chickenBeforeWaste: chicken.price * 0.5,
    garlicBeforeWaste: garlic.price * 0.015,
    perPlate,
    sellAt: c.p(14),
    summary,
  };
}

/** Resolves copy that depends on the visitor's currency: plain strings pass through, functions get money helpers. */
export function resolveCopy(value, code = BASE_CURRENCY) {
  return typeof value === 'function' ? value(moneyFor(code)) : value;
}

export function resolveFaqs(faqs, code = BASE_CURRENCY) {
  return faqs.map((faq) => ({ q: faq.q, a: resolveCopy(faq.a, code) }));
}

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
        a: (c) => {
          const cost = c.p(0.6);
          const price = c.p(2);
          return `Recipe cost is what the ingredients cost you. Food cost % compares that to the selling price: cost per serving ÷ price × 100. A ${c.m(cost)} cookie sold for ${c.m(price)} has a ${pct((cost / price) * 100)} food cost.`;
        },
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
    h1: 'How to price baked goods — free bakery pricing calculator',
    subtitle:
      'A baking cost calculator for home bakers and bakeries: find what each slice, cookie or loaf really costs you, then the price that covers your time and hits your margin.',
    metaTitle: 'How to Price Baked Goods: Free Bakery Pricing Calculator',
    metaDescription:
      'How to price baked goods: cost your recipe with this free baking cost calculator, get cost per slice or cookie, add packaging and your time, and set a price that makes a profit.',
    calculator: { mode: 'recipe', preset: 'cake' },
    sections: [
      {
        h2: 'How to price baked goods in 4 steps',
        list: [
          'Cost the recipe: every ingredient from what you paid, including frosting, fillings and toppings',
          'Divide by what the batch makes to get the cost per slice, cookie, cupcake or loaf',
          'Add packaging (boxes, liners, bags, labels) per item',
          'Set the price: either cost per item ÷ 25–35% target, or ingredients + packaging + your time + 10–20% overheads, plus profit',
        ],
        body: [
          'Home bakers selling custom orders should use the second method — time is usually the biggest cost. Shops selling at volume often start from the food cost % method. Our cake pricing calculator does the time-based version for you.',
        ],
      },
      {
        h2: 'What a baking cost calculator should include',
        list: [
          'Ingredients at today’s prices — butter, eggs and chocolate move the most',
          'Small items: vanilla, baking powder, salt, sprinkles',
          'Waste: trimmed cake tops, broken cookies, test bakes',
          'Packaging per item, not per pack',
          'Your hours and an hourly rate, plus energy and fees',
        ],
      },
    ],
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
    slug: 'menu-pricing-calculator',
    eyebrow: 'Menu pricing calculator',
    navLabel: 'Menu pricing calculator',
    h1: 'Menu pricing calculator: how to price menu items for profit',
    subtitle:
      'Cost a menu item from your supplier prices, including trim and waste, and get the menu price that hits your target food cost %. Built for restaurants, cafés and food trucks.',
    metaTitle: 'Menu Pricing Calculator (Free): How to Price Menu Items',
    metaDescription:
      'Free menu price calculator for restaurants, cafés and food trucks. Get plate cost with waste, food cost % and the right menu price for every item — plus simple restaurant menu pricing strategies.',
    calculator: { mode: 'recipe', preset: 'pasta' },
    sections: [
      {
        h2: 'How to price menu items in 4 steps',
        list: (c) => {
          const plate = plateExample(c);
          return [
            'Cost the plate: add up every ingredient from your current supplier prices, including trim and waste',
            'Pick a target food cost % — most restaurants use 28–35%',
            `Divide the plate cost by the target: ${c.m(plate.cost)} ÷ 0.30 = ${c.m(plate.minimum)} minimum menu price`,
            `Round up to a menu-friendly price (${c.$(10.95)} or ${c.$(11.5)}) and check it against what nearby places charge`,
          ];
        },
      },
      {
        h2: 'Restaurant menu pricing strategies',
        list: [
          'Food cost % pricing — price = plate cost ÷ target %. Simple and the most common starting point',
          'Gross profit pricing — make sure each plate earns enough cash (price − plate cost), not just a good percentage',
          'Competitor pricing — check what similar places charge, then confirm your margin still works',
          'Menu engineering — promote dishes with high profit and high sales; fix or remove low-profit, low-sales ones',
          'Charm pricing — a price just under a round number, or a clean round number, reads as cheaper than an awkward one in between',
        ],
        body: [
          'Whatever strategy you use, re-cost your menu whenever supplier prices change. Most lost margin comes from menu prices set on last year’s ingredient costs.',
        ],
      },
    ],
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
        q: 'How do you calculate a menu price?',
        a: (c) => {
          const plate = plateExample(c);
          return `Divide the cost of one plate by your target food cost % as a decimal. A plate costing ${c.m(plate.cost)} at a 30% target should be on the menu for at least ${c.m(plate.minimum)}.`;
        },
      },
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
    eyebrow: 'Guide · Food cost formula',
    navLabel: 'Food cost formula & percentage',
    h1: 'Food cost formula and food cost percentage (with calculator)',
    subtitle:
      'The food cost formula, how to calculate food cost percentage step by step, the ideal food cost percentage for your type of business, and how to set a menu price from it — with a free calculator.',
    metaTitle: 'Food Cost Formula & Food Cost Percentage: Calculator + Ideal %',
    metaDescription:
      'Food cost formula: food cost % = ingredient cost ÷ selling price × 100. See worked examples, how to calculate food cost percentage, the ideal food cost % for restaurants, cafés and bakeries, and a free calculator.',
    calculator: { mode: 'quick', title: 'Food cost % calculator' },
    secondCalculator: { mode: 'recipe', preset: 'pasta', title: 'Don’t know your plate cost? Work it out here' },
    sections: [
      {
        h2: 'What is food cost percentage?',
        body: (c) => {
          const plate = plateExample(c);
          return [
            `Food cost percentage is the share of a dish’s selling price that goes on ingredients. If a plate sells for ${c.w(plate.sell)} and its ingredients cost ${c.m(plate.cost)}, about ${Math.round(plate.percent)}% of every sale pays for food. The rest has to cover staff, rent, energy, packaging and your profit.`,
            `It is the single most useful number for pricing food, because it lets you compare a ${c.$w(4)} cookie and a ${c.$w(28)} steak on the same scale.`,
          ];
        },
      },
      {
        h2: 'The food cost formula',
        formula: 'Food cost % = ingredient cost per serving ÷ selling price × 100',
        body: (c) => {
          const plate = plateExample(c);
          return [
            `This is the food cost percentage formula used for a single dish. Example: a pasta dish costs ${c.m(plate.cost)} in ingredients and sells for ${c.m(plate.sell)}. ${c.m(plate.cost)} ÷ ${c.m(plate.sell)} × 100 = ${formatPercent(plate.percent)} food cost, leaving ${c.m(plate.profit)} gross profit per plate.`,
            `To find a price from a target, flip the formula: selling price = ingredient cost ÷ target %. For a 30% target: ${c.m(plate.cost)} ÷ 0.30 = ${c.m(plate.minimum)}.`,
            'For a whole restaurant over a week or month, the food cost formula uses stock and purchases instead: (opening stock + purchases − closing stock) ÷ food sales × 100. Both are explained below.',
          ];
        },
      },
      {
        h2: 'How to calculate food cost percentage, step by step',
        list: [
          'Cost one batch of the recipe: for each ingredient, (price paid ÷ amount bought) × amount used',
          'Divide the batch cost by the number of portions to get the cost per serving',
          'Divide the cost per serving by the selling price',
          'Multiply by 100 — that is your food cost percentage',
          'Compare it with your target (for example 30%) and adjust the price or recipe if it is over',
        ],
        body: (c) => {
          const cookies = cookieExample(c);
          const price = c.p(1);
          return [
            `Example: a batch of ${cookies.makes} cookies costs ${c.m(cookies.totalCost)}, so each cookie costs about ${c.m(cookies.perCookie)}. Sold at ${c.m(price)}, the food cost percentage is ${c.m(cookies.perCookie)} ÷ ${c.m(price)} × 100 ≈ ${pct((cookies.perCookie / price) * 100)}.`,
          ];
        },
      },
      {
        h2: 'What is the ideal food cost percentage?',
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
        q: 'What is the food cost formula?',
        a: 'Food cost % = ingredient cost per serving ÷ selling price × 100. For a whole business over a period: (opening stock + purchases − closing stock) ÷ food sales × 100.',
      },
      {
        q: 'How do I calculate food cost percentage?',
        a: (c) => {
          const plate = plateExample(c);
          return `Divide the ingredient cost of one serving by its selling price and multiply by 100. ${c.m(plate.cost)} ÷ ${c.m(plate.sell)} × 100 = ${formatPercent(plate.percent)}.`;
        },
      },
      {
        q: 'What is the ideal food cost percentage for a restaurant?',
        a: 'Most restaurants aim for 28–35%. The right target depends on your labour, rent and price level.',
      },
      {
        q: 'How do I price a dish from food cost percentage?',
        a: (c) => {
          const cost = c.p(3);
          return `Divide the cost per serving by your target as a decimal. A ${c.m(cost)} plate at a 30% target should sell for at least ${c.m(roundPriceUp(cost / 0.3))}.`;
        },
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
        body: (c) => {
          const pasta = pastaExample(c);
          return [
            `For each ingredient, note the price and the pack size from your receipt or supplier invoice: fettuccine ${c.m(pasta.fettuccine.price)} for 500 g, chicken breast ${c.m(pasta.chicken.price)} per kg, cream ${c.m(pasta.cream.price)} per litre. Use the price you actually pay now, not last year’s.`,
          ];
        },
      },
      {
        h2: 'Step 2: write down how much the recipe uses',
        body: [
          'Measure the amount that goes into one batch: 400 g pasta, 500 g chicken, 300 ml cream, 80 g parmesan, 40 g butter, 15 g garlic. Weigh where you can — it is more accurate than cups.',
        ],
      },
      {
        h2: 'Step 3: convert units and work out each line',
        body: (c) => {
          const pasta = pastaExample(c);
          return [
            `Convert the pack size into the same unit as the recipe. Cream: ${c.m(pasta.cream.price)} per 1,000 ml, and you use 300 ml → 300 ÷ 1,000 × ${c.m(pasta.cream.price)} = ${c.m(pasta.cream.cost)}. Pasta: 400 ÷ 500 × ${c.m(pasta.fettuccine.price)} = ${c.m(pasta.fettuccine.cost)}.`,
            'Weight converts to weight and volume to volume. You can’t convert grams to cups without knowing the ingredient’s density, so buy and use in the same kind of unit.',
          ];
        },
      },
      {
        h2: 'Step 4: add waste and trim',
        body: (c) => {
          const pasta = pastaExample(c);
          return [
            `If you lose 10% of the chicken to trim, you pay for 100% but only use 90%. Divide by the usable share: ${c.m(pasta.chickenBeforeWaste)} ÷ 0.90 = ${c.m(pasta.chicken.cost)}. Garlic at 15% waste: ${c.m(pasta.garlicBeforeWaste)} ÷ 0.85 ≈ ${c.m(pasta.garlic.cost)}.`,
          ];
        },
      },
      {
        h2: 'Step 5: cost per serving and price',
        body: (c) => {
          const pasta = pastaExample(c);
          return [
            `Add the lines: ${pasta.lines.map((line) => c.m(line.cost)).join(' + ')} ≈ ${c.m(pasta.totalCost)} for the batch. The recipe makes ${pasta.makes} plates, so each costs about ${c.m(pasta.perPlate)}.`,
            `At a 30% target food cost: ${c.symbol}${pasta.perPlate.toFixed(3)} ÷ 0.30 = ${c.m(pasta.summary.suggestedPrice)} minimum price (rounded up). Sell at ${c.m(pasta.sellAt)} and your food cost is about ${formatPercent(pasta.summary.foodCostPercent)} with ${c.m(pasta.summary.profit)} gross profit per plate.`,
          ];
        },
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
        a: (c) => {
          const pasta = pastaExample(c);
          return `Cost the whole recipe, then divide by the number of plates it makes. A ${c.m(pasta.totalCost)} batch that makes ${pasta.makes} plates costs ${c.m(pasta.perPlate)} per plate.`;
        },
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
    metaTitle: 'Recipe Costing: How to Cost a Recipe Step by Step (Worked Example)',
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
        body: (c) => {
          const cookies = cookieExample(c);
          const line = (name) => cookies.line(name);
          const smalls = line('Baking powder').cost + line('Salt').cost;
          return [
            `Flour at ${c.m(line('All-purpose flour').price)}/kg, 250 g used → ${c.m(line('All-purpose flour').cost)}. Butter ${c.m(line('Butter').price)}/kg, 150 g → ${c.m(line('Butter').cost)}. 2 eggs at ${c.m(line('Eggs').price)} → ${c.m(line('Eggs').cost)}. Sugar ${c.m(line('Sugar').price)}/kg, 100 g → ${c.m(line('Sugar').cost)}. Chocolate chips ${c.m(line('Chocolate chips').price)}/kg, 150 g → ${c.m(line('Chocolate chips').cost)}. Vanilla ${c.m(line('Vanilla extract').price)}/L, 5 ml → ${c.m(line('Vanilla extract').cost)}. Baking powder and salt add ${c.m(smalls)}.`,
            `The batch costs about ${c.m(cookies.totalCost)} and makes ${cookies.makes} cookies, so each cookie costs about ${c.m(cookies.perCookie)}. At a 30% target food cost the minimum price is ${c.m(cookies.minimum)} per cookie.`,
          ];
        },
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
        link: { href: '/recipe-costing-template', label: 'Download our free recipe costing template (Excel & Google Sheets) →' },
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
        a: 'Yes — download our free recipe costing template for Excel or Google Sheets from the recipe costing template page. It converts units, adds waste and works out cost per portion and a suggested price. To save recipes and update prices in one place, use the free CostMyDish app.',
      },
    ],
  },
  {
    kind: 'tool',
    slug: 'cake-pricing-calculator',
    eyebrow: 'Free tool · Cake pricing',
    navLabel: 'Cake pricing calculator',
    h1: 'Cake pricing calculator — what to charge for a cake',
    subtitle:
      'Add your ingredients, packaging and hours. The calculator adds overheads and profit and gives you a price for the whole cake and per slice — free, no sign-up.',
    metaTitle: 'Cake Pricing Calculator (Free): How Much to Charge for a Cake',
    metaDescription:
      'Free cake pricing calculator for home bakers and bakeries. Cost your ingredients, add packaging, your time, overheads and profit, and get a price for the whole cake and per slice.',
    calculator: { mode: 'recipe', preset: 'cake', pricing: 'cake', title: 'Cake pricing calculator' },
    sections: [
      {
        h2: 'How the cake pricing calculator works',
        formula: 'Cake price = (ingredients + packaging + hours × hourly rate) × (1 + overheads %) × (1 + profit %)',
        body: (c) => {
          const cake = cakeExample(c);
          return [
            `The example is a 12-slice vanilla layer cake with cream cheese frosting: ${c.m(cake.ingredients)} ingredients + ${c.m(cake.packaging)} box and board + ${cake.hours} hours at ${c.w(cake.hourlyRate)} = ${c.m(cake.direct)}. Add ${CAKE_EXTRAS.overheadPercent}% overheads → ${c.m(cake.totalCost)}. Add ${CAKE_EXTRAS.profitPercent}% profit → ${c.m(cake.price)}, or ${c.m(cake.pricePerPortion)} a slice.`,
            `Ingredients end up around ${Math.round(cake.ingredientShare)}% of a fair custom-cake price. If your price is close to your ingredient cost, you are working for free.`,
          ];
        },
      },
      {
        h2: 'What to put in each box',
        list: (c) => [
          'Ingredients: everything in the cake, filling, frosting and decorations, costed from what you paid',
          'Packaging: cake box, board, dowels, toppers, ribbon',
          'Hours: baking, cooling, filling, decorating, clean-up and messaging the customer — not just oven time',
          `Hourly rate: what you would accept for any other job; ${c.$w(15)}–${c.$w(25)} is common for home bakers`,
          'Overheads: electricity, gas, equipment wear, card and marketplace fees, delivery — usually 10–20%',
          'Profit: on top of paying yourself, so the business can grow — usually 15–30%',
        ],
      },
      {
        h2: 'Cake pricing by the slice',
        body: [
          'Divide the whole-cake price by the number of slices for a per-slice price. Cafés selling single slices usually charge more per slice than the whole-cake price works out to, because each slice needs its own handling and packaging.',
        ],
        link: { href: '/how-to-price-cakes', label: 'Read the full guide: how to price cakes →' },
      },
    ],
    bulletsTitle: 'Bakers use the free CostMyDish app to:',
    bullets: [
      'Save ingredient prices once and re-cost every cake in seconds',
      'Price the same cake by the slice and whole',
      'Add boxes and boards as ingredients so packaging is never forgotten',
      'See every cake update when butter or eggs go up',
    ],
    faqs: [
      {
        q: 'How much should I charge for a cake?',
        a: (c) => {
          const cake = cakeExample(c);
          return `Add ingredients, packaging and your hours at a fair rate, then add 10–20% for overheads and 15–30% profit. A 12-slice layer cake that costs ${c.m(cake.ingredients)} in ingredients and takes ${cake.hours} hours comes to about ${c.w(Math.round(cake.price))} at ${c.w(cake.hourlyRate)} an hour.`;
        },
      },
      {
        q: 'How do I calculate the cost of making a cake?',
        a: 'For each ingredient: (price paid ÷ pack size) × amount used. Add them all together for the ingredient cost, then add packaging. The calculator converts units (kg to g, litres to ml, dozen to each) for you.',
      },
      {
        q: 'Should I charge for my time?',
        a: 'Yes. Your time is usually the biggest cost in a custom cake. Leaving it out means you are paying customers to take your cakes.',
      },
      {
        q: 'How much should a slice of cake cost?',
        a: 'Divide the whole-cake price by the number of slices. For single slices sold in a café, many bakers aim for ingredients to be 25–35% of the slice price.',
      },
    ],
  },
  {
    kind: 'guide',
    slug: 'recipe-costing-template',
    eyebrow: 'Free download · Excel & Google Sheets',
    navLabel: 'Recipe costing template',
    h1: 'Free recipe costing template (food cost spreadsheet)',
    subtitle:
      'A ready-made recipe cost card for Excel, Google Sheets and Numbers. Enter what you paid and how much you use — it converts units, adds waste, and works out cost per portion, a suggested price and your food cost %.',
    metaTitle: 'Free Recipe Costing Template & Food Cost Spreadsheet (Excel, Sheets)',
    metaDescription:
      'Download a free recipe costing template: a food cost spreadsheet and recipe cost card for Excel and Google Sheets with unit conversion, waste %, cost per portion, suggested price and food cost %.',
    downloads: {
      files: [{ href: '/templates/recipe-costing-template.xlsx', label: 'Download the template (.xlsx)' }],
      note: 'Works in Excel, Google Sheets (upload to Drive, then open with Sheets) and Apple Numbers. No sign-up. Includes a filled-in example (24 chocolate chip cookies) and a blank recipe sheet.',
    },
    calculator: { mode: 'recipe', preset: 'cookies', title: 'Prefer not to download? Use the online version' },
    calculatorAfterSection: 1,
    sections: [
      {
        h2: 'What’s in the recipe costing template',
        list: [
          'Recipe cost card: recipe name, how many portions it makes, your target food cost % and selling price',
          'Up to 30 ingredient lines: price paid, pack size and unit, amount used and unit, waste %',
          'Automatic unit conversion: kg ↔ g ↔ oz ↔ lb, litres ↔ ml ↔ cups ↔ spoons, each ↔ dozen',
          'Results: total batch cost, cost per portion, suggested price, food cost % and profit per portion',
          'Clear warnings when units can’t be converted (weight to volume) or a unit is misspelled',
        ],
      },
      {
        h2: 'How to use the food cost spreadsheet',
        list: (c) => [
          'Open the “Your recipe” sheet and type the recipe name and how many portions it makes',
          `For each ingredient, enter what you paid and the pack size from your receipt (for example ${c.$(8)} for 1 kg butter)`,
          'Enter how much the recipe uses, picking the unit from the dropdown (for example 150 g)',
          'Add a waste % for anything you trim — meat, fish, fruit and vegetables',
          'Read the cost per portion and suggested price at the top; add your selling price to see food cost % and profit',
        ],
        body: [
          'Make one copy of the sheet per recipe. When an ingredient price changes, update it in every recipe that uses it — or use the free CostMyDish app, which updates every recipe at once.',
        ],
      },
      {
        h2: 'What goes on a recipe cost card',
        body: [
          'A recipe cost card (or recipe costing sheet) records everything needed to cost one recipe: each ingredient, its purchase price and pack size, the amount used, waste, the yield and the resulting cost per portion. Kitchens keep one for every menu item so prices can be checked whenever supplier costs move.',
          'The template follows the same method professional kitchens use: line cost = (price paid ÷ pack size) × amount used ÷ (1 − waste %). Cost per portion = total ÷ portions. Suggested price = cost per portion ÷ target food cost %.',
        ],
        link: { href: '/recipe-costing', label: 'Read the step-by-step recipe costing guide →' },
      },
      {
        h2: 'When to switch from a spreadsheet to an app',
        list: [
          'You have more than a handful of recipes and the same ingredient appears in many of them',
          'Prices change often and you keep forgetting to update every sheet',
          'You want to cost on your phone while shopping or in the kitchen',
          'You sell one recipe several ways (by the slice and whole, single and box)',
        ],
      },
    ],
    bulletsTitle: 'Outgrown the spreadsheet? The free CostMyDish app:',
    bullets: [
      'Saves each ingredient price once and reuses it in every recipe',
      'Updates every recipe automatically when a price changes',
      'Converts units for you and flags dishes over your target food cost %',
      'Free plan: 5 dishes and 20 ingredients',
    ],
    faqs: [
      {
        q: 'Is this recipe costing template free?',
        a: 'Yes. Download it, change it and use it in your business — no sign-up or email needed.',
      },
      {
        q: 'Does it work in Google Sheets?',
        a: 'Yes. Upload the .xlsx file to Google Drive and open it with Google Sheets — the formulas and unit dropdowns carry over. It also opens in Excel and Apple Numbers.',
      },
      {
        q: 'Can the template convert cups to grams?',
        a: 'No — cups are volume and grams are weight, and converting between them needs each ingredient’s density. Buy and use in the same kind of unit (weigh flour in grams, measure milk in ml). The sheet warns you if units don’t match.',
      },
      {
        q: 'What is a good food cost percentage to put in the template?',
        a: 'Most restaurants use 28–35%, cafés 15–25% for drinks, and bakeries 25–35%. The template starts at 30% — change it to your own target.',
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
        body: (c) => {
          const cake = cakeExample(c);
          return [
            `Use the calculator to cost the cake and frosting from what you paid. In the example, a 12-slice vanilla layer cake with cream cheese frosting costs about ${c.m(cake.ingredients)} in ingredients — about ${c.m(cake.perSlice)} a slice.`,
          ];
        },
      },
      {
        h2: 'Step 2: add packaging',
        body: (c) => [
          `Cake box, board, dowels, toppers, ribbon, cupcake liners. A box and board might be ${c.$(CAKE_EXTRAS.packaging)} per cake. In the CostMyDish app you can add these as ingredients (for example “Cake box, 10 for ${c.$w(12)}, use 1”) so they are always counted.`,
        ],
      },
      {
        h2: 'Step 3: pay yourself',
        body: (c) => {
          const cake = cakeExample(c);
          return [
            `Track the real time: baking, cooling, filling, decorating, cleaning and talking to the customer. If a cake takes ${cake.hours} hours and you pay yourself ${c.w(cake.hourlyRate)} an hour, that is ${c.w(cake.labour)} — already about ${Math.round(cake.labour / cake.ingredients)} times the ingredient cost.`,
          ];
        },
      },
      {
        h2: 'Step 4: cover overheads and add profit',
        body: (c) => {
          const cake = cakeExample(c);
          return [
            'Overheads are electricity, gas, equipment wear, card fees, delivery fuel and marketplace fees. Many home bakers add 10–20% for these. Then add profit on top so the business can grow — 15–30% is common.',
            `Example: ${c.m(cake.ingredients)} ingredients + ${c.m(cake.packaging)} packaging + ${c.w(cake.labour)} time = ${c.m(cake.direct)}. Add ${CAKE_EXTRAS.overheadPercent}% overheads → ${c.m(cake.totalCost)}. Add ${CAKE_EXTRAS.profitPercent}% profit → about ${c.w(Math.round(cake.price))}. Ingredients are then roughly ${Math.round(cake.ingredientShare)}% of the price.`,
          ];
        },
        link: { href: '/cake-pricing-calculator', label: 'Work out your full cake price with the cake pricing calculator →' },
      },
      {
        h2: 'Pricing by the slice vs. whole cake',
        body: (c) => {
          const cake = cakeExample(c);
          return [
            `Slices take more handling and packaging, so they usually carry a higher price per portion. For a café, cost per slice is often priced at 25–35% food cost; a 12-slice cake costing ${c.m(cake.perSlice)} a slice suggests at least ${c.m(cake.sliceAt30)} a slice for ingredients alone at 30%, before labour.`,
            'In the app you can add both ways to sell the same cake — by the slice and whole — and see the profit on each.',
          ];
        },
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
