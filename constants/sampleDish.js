import { calculateDishSummary } from '../lib/calculations';
import { CURRENCIES } from './currencies';

/**
 * Showcase dish for new owners: shown on the real result screen, never stored.
 * Always priced in the owner's currency: typical local shop prices (per kg / l / each)
 * for the main markets, US prices at an approximate exchange rate for the rest.
 */
const SAMPLE_INGREDIENTS = [
  { key: 'flour', name: 'All purpose flour', quantity: 280, unit: 'g', purchaseUnit: 'kg' },
  { key: 'butter', name: 'Butter', quantity: 225, unit: 'g', purchaseUnit: 'kg' },
  { key: 'sugar', name: 'Sugar', quantity: 300, unit: 'g', purchaseUnit: 'kg' },
  { key: 'eggs', name: 'Eggs', quantity: 2, unit: 'piece', purchaseUnit: 'piece' },
  { key: 'chocolate_chips', name: 'Chocolate chips', quantity: 340, unit: 'g', purchaseUnit: 'kg' },
  { key: 'vanilla', name: 'Vanilla extract', quantity: 5, unit: 'ml', purchaseUnit: 'l' },
  { key: 'baking_soda', name: 'Baking soda', quantity: 5, unit: 'g', purchaseUnit: 'kg' },
  { key: 'salt', name: 'Salt', quantity: 5, unit: 'g', purchaseUnit: 'kg' },
];

const SAMPLE_PRICES = {
  USD: { flour: 1.8, butter: 11, sugar: 2.2, eggs: 0.35, chocolate_chips: 13, vanilla: 140, baking_soda: 4, salt: 1.5 },
  GBP: { flour: 0.9, butter: 8.4, sugar: 1.2, eggs: 0.3, chocolate_chips: 11, vanilla: 70, baking_soda: 6, salt: 1 },
  EUR: { flour: 0.9, butter: 9, sugar: 1.3, eggs: 0.3, chocolate_chips: 12, vanilla: 80, baking_soda: 6, salt: 1 },
  AUD: { flour: 1.5, butter: 13, sugar: 1.8, eggs: 0.6, chocolate_chips: 16, vanilla: 150, baking_soda: 8, salt: 2 },
  CAD: { flour: 2.2, butter: 14, sugar: 2.5, eggs: 0.45, chocolate_chips: 16, vanilla: 160, baking_soda: 6, salt: 2 },
  NZD: { flour: 1.8, butter: 15, sugar: 2, eggs: 0.65, chocolate_chips: 18, vanilla: 160, baking_soda: 8, salt: 2 },
  INR: { flour: 50, butter: 560, sugar: 48, eggs: 7, chocolate_chips: 700, vanilla: 4000, baking_soda: 120, salt: 28 },
};

/** Approximate units per 1 USD, only for the sample's illustrative prices. */
const USD_RATES = {
  SGD: 1.35, HKD: 7.8, JPY: 150, CNY: 7.2, KRW: 1350, THB: 35, MYR: 4.5, IDR: 16000,
  PHP: 57, VND: 25000, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.31, BHD: 0.38, OMR: 0.385,
  ILS: 3.7, TRY: 40, ZAR: 18, NGN: 1550, KES: 130, EGP: 49, GHS: 15, MAD: 10,
  BRL: 5.5, MXN: 18, ARS: 1000, CLP: 950, COP: 4100, PEN: 3.75, CHF: 0.88, SEK: 10.5,
  NOK: 10.7, DKK: 6.9, PLN: 4, CZK: 23, HUF: 360, RON: 4.6, RUB: 92, UAH: 41,
  TWD: 32, PKR: 280, BDT: 120, LKR: 300, NPR: 135,
};

function pricesFor(currencyCode) {
  if (SAMPLE_PRICES[currencyCode]) return SAMPLE_PRICES[currencyCode];
  const rate = USD_RATES[currencyCode];
  if (!rate) return null;
  return Object.fromEntries(
    Object.entries(SAMPLE_PRICES.USD).map(([key, usd]) => [key, Math.round(usd * rate * 100) / 100]),
  );
}

const SAMPLE_YIELD = 24;
const SAMPLE_TARGET = 30;

/** Returns { recipe, currencySymbol } shaped like fetchRecipeWithIngredients data. */
export function buildSampleDish(currencyCode) {
  const localPrices = pricesFor(currencyCode);
  const currency = localPrices ? currencyCode : 'USD';
  const prices = localPrices ?? SAMPLE_PRICES.USD;
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '$';

  const recipeIngredients = SAMPLE_INGREDIENTS.map((i) => ({
    id: `sample-${i.key}`,
    ingredient_id: `sample-${i.key}`,
    quantity: i.quantity,
    unit: i.unit,
    ingredient: {
      id: `sample-${i.key}`,
      name: i.name,
      purchase_price: prices[i.key],
      purchase_quantity: 1,
      purchase_unit: i.purchaseUnit,
      waste_percent: 0,
    },
  }));

  // Priced at the suggested price, as a new dish is
  const { suggestedPrice } = calculateDishSummary({
    recipeIngredients,
    defaultFormat: { unit_quantity: SAMPLE_YIELD },
    targetFoodCostPercent: SAMPLE_TARGET,
  });

  return {
    currencySymbol,
    recipe: {
      id: 'sample',
      name: 'Chocolate chip cookies',
      category: 'dessert',
      is_sample: true,
      target_food_cost_percent: SAMPLE_TARGET,
      recipe_ingredients: recipeIngredients,
      selling_formats: [
        {
          id: 'sample-piece',
          name: `${SAMPLE_YIELD} Piece (Chocolate chip cookies)`,
          selling_unit_name: 'piece',
          selling_unit_label: 'Piece',
          unit_quantity: String(SAMPLE_YIELD),
          selling_price: String(suggestedPrice),
          is_default: true,
        },
      ],
    },
  };
}
