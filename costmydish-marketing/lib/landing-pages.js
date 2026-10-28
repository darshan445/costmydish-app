export const SEO_LANDING_PAGES = [
  {
    slug: 'food-cost-calculator',
    eyebrow: 'Food cost calculator app',
    h1: 'Free food cost calculator for restaurants & food businesses',
    subtitle:
      'Calculate food cost percentage, cost per serving, and profit on your phone — without spreadsheets or expensive software.',
    metaTitle: 'Food Cost Calculator App — Free for iOS & Android | CostMyDish',
    metaDescription:
      'Free food cost calculator for US, UK, Canada, Australia & India. Cost recipes, set selling prices, and hit your food cost % target. Download CostMyDish on iOS and Android.',
    bullets: [
      'Live food cost % and profit as you build each dish',
      'Ingredient library — update a buy price once, every dish recalculates',
      'Multiple selling formats (slice, portion, whole item, combo)',
      'Green / yellow / red margin status vs your target',
      'Free plan: 5 dishes and 20 ingredients — no credit card',
    ],
    faqs: [
      {
        q: 'What is a food cost calculator?',
        a: 'A food cost calculator works out how much a dish costs to make and what percentage of your selling price goes to ingredients. CostMyDish does this automatically from your ingredient buy prices and recipe quantities.',
      },
      {
        q: 'Is CostMyDish better than a spreadsheet?',
        a: 'Spreadsheets break when units mix (kg vs cups) or when one ingredient price changes. CostMyDish handles unit conversion, waste %, and recalculates every dish instantly when you update a price.',
      },
      {
        q: 'Does it work outside the US?',
        a: 'Yes. Use any currency and metric or imperial units. CostMyDish is used by restaurants, bakeries, and caterers in the US, UK, Canada, Australia, India, and worldwide.',
      },
    ],
  },
  {
    slug: 'recipe-cost-calculator',
    eyebrow: 'Recipe cost calculator',
    h1: 'Recipe cost calculator — know your margin before you menu it',
    subtitle:
      'Add ingredients, set quantities, and see total recipe cost, cost per serving, and suggested selling price in minutes.',
    metaTitle: 'Recipe Cost Calculator App — Cost Per Serving & Margin | CostMyDish',
    metaDescription:
      'Recipe cost calculator for chefs and food businesses. See cost per serving, food cost %, and profit. Free on iPhone and Android.',
    bullets: [
      'Cost per serving and total dish cost in real time',
      'Suggested price based on your target food cost %',
      'Per-ingredient cost breakdown on the result screen',
      'Resume unfinished calculations from Home',
      'Built for mobile — cost dishes in the kitchen, not at a desk',
    ],
    faqs: [
      {
        q: 'How is recipe cost different from food cost?',
        a: 'Recipe cost is the total ingredient cost for a dish. Food cost percentage compares that cost to what you sell it for. CostMyDish shows both, plus profit and margin status.',
      },
      {
        q: 'Can I cost recipes with sub-recipes?',
        a: 'Add each ingredient from your library with the quantity used in the dish. For sauces or bases, add them as ingredients with their usage amount and unit.',
      },
      {
        q: 'Who is this for?',
        a: 'Independent restaurants, home bakers, food trucks, caterers, cafés, and meal-prep businesses who need accurate recipe costing without enterprise software pricing.',
      },
    ],
  },
  {
    slug: 'bakery-pricing-calculator',
    eyebrow: 'Bakery pricing',
    h1: 'Bakery pricing calculator — cost cakes, cookies & pastries by the slice or whole',
    subtitle:
      'Price baked goods with real ingredient costs. Sell by the slice, dozen, or whole cake — each format gets its own food cost % and profit.',
    metaTitle: 'Bakery Pricing Calculator — Food Cost for Bakers | CostMyDish',
    metaDescription:
      'Bakery pricing calculator app for home bakers and pastry shops. Cost recipes, set slice vs whole-cake prices, and protect your margins. Free download.',
    bullets: [
      'Weight & volume units (g, kg, oz, cups, ml) with smart conversion',
      'Multiple selling formats — e.g. $4/slice and $28/whole cake',
      'See which products are over your target food cost %',
      'Simpler than CakeCost or spreadsheet templates',
      'Start free — upgrade only when your menu grows',
    ],
    faqs: [
      {
        q: 'What food cost % should bakers target?',
        a: 'Many bakeries and cafés aim for 25–35% food cost, but your target depends on labour, rent, and positioning. CostMyDish lets you set your own target per dish.',
      },
      {
        q: 'Can I price cookies, bread, and custom cakes?',
        a: 'Yes. Build any recipe, set batch size, and add one or more selling formats with different prices.',
      },
      {
        q: 'Is this only for professional bakeries?',
        a: 'No. Home bakers selling at markets, online, or to friends use CostMyDish to price confidently before they undercharge.',
      },
    ],
  },
  {
    slug: 'restaurant-menu-costing',
    eyebrow: 'Restaurant menu costing',
    h1: 'Restaurant menu costing — stop guessing your dish margins',
    subtitle:
      'Cost every menu item, track dishes over target, and update prices when supplier costs change — from a phone app, not a $75/mo platform.',
    metaTitle: 'Restaurant Menu Costing App — Food Cost % per Dish | CostMyDish',
    metaDescription:
      'Restaurant menu costing without enterprise pricing. Calculate food cost %, profit per dish, and spot items over target. Free app for iOS & Android.',
    bullets: [
      'Dashboard highlights dishes that need attention',
      'Filter dishes: All, On Target, Over Target',
      'No POS lock-in — works without Toast or Square',
      'Fraction of the cost of meez or xtraCHEF',
      'Hobbyist plan: unlimited dishes + price history',
    ],
    faqs: [
      {
        q: 'How does CostMyDish compare to meez or xtraCHEF?',
        a: 'Enterprise tools like meez and xtraCHEF target multi-location groups with invoice OCR and integrations — often $75+/month and browser-based. CostMyDish is a focused mobile food cost calculator: faster to start, free tier, built for owners who need margin math today.',
      },
      {
        q: 'Do I need a POS integration?',
        a: 'No. Enter ingredient buy prices and menu selling prices manually. CostMyDish focuses on recipe costing and margin — not inventory or AP automation.',
      },
      {
        q: 'What about food trucks and caterers?',
        a: 'Same app. Cost combo meals, per-portion catering trays, and à la carte items with multiple selling formats per dish.',
      },
    ],
  },
];

export function getLandingPage(slug) {
  return SEO_LANDING_PAGES.find((page) => page.slug === slug) ?? null;
}
