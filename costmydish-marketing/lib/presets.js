import { BASE_CURRENCY, localPrice, localizeRows } from '@/lib/currency';
import { ingredientLineCost } from '@/lib/food-cost';

/**
 * Example recipes the calculators open with, priced in USD.
 * Rows: [name, price paid, amount bought, buy unit, amount used, use unit, waste %].
 */
export const PRESETS = {
  cookies: {
    dishName: 'Chocolate chip cookies',
    makes: '24',
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
  cake: {
    dishName: 'Vanilla layer cake',
    makes: '12',
    unitWord: 'slice',
    rows: [
      ['Cake flour', '2.50', '1', 'kg', '300', 'g'],
      ['Sugar', '1.80', '1', 'kg', '250', 'g'],
      ['Butter', '8.00', '1', 'kg', '225', 'g'],
      ['Eggs', '3.60', '1', 'dozen', '4', 'each'],
      ['Milk', '1.20', '1', 'l', '240', 'ml'],
      ['Vanilla extract', '15.00', '1', 'l', '10', 'ml'],
      ['Icing sugar', '2.20', '1', 'kg', '400', 'g'],
      ['Cream cheese', '9.00', '1', 'kg', '225', 'g'],
    ],
  },
  pasta: {
    dishName: 'Chicken alfredo pasta',
    makes: '4',
    unitWord: 'plate',
    rows: [
      ['Fettuccine', '3.00', '500', 'g', '400', 'g'],
      ['Chicken breast', '9.00', '1', 'kg', '500', 'g', '10'],
      ['Heavy cream', '4.50', '1', 'l', '300', 'ml'],
      ['Parmesan', '22.00', '1', 'kg', '80', 'g'],
      ['Butter', '8.00', '1', 'kg', '40', 'g'],
      ['Garlic', '6.00', '1', 'kg', '15', 'g', '15'],
    ],
  },
};

/** Cake extras used by the cake pricing calculator and its worked examples (money in USD). */
export const CAKE_EXTRAS = { packaging: '2.50', hours: '3', hourlyRate: '15', overheadPercent: '15', profitPercent: '20' };

export function rowObject([name, buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent = '']) {
  return { name, buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent };
}

/** Costs example rows in the visitor's currency with the app's maths. */
export function costRows(rows, code = BASE_CURRENCY, from = BASE_CURRENCY) {
  const lines = localizeRows(rows, code, from).map((row) => {
    const parsed = rowObject(row);
    return { ...parsed, price: Number(parsed.buyPrice), cost: ingredientLineCost(parsed).cost ?? 0 };
  });
  return { lines, totalCost: lines.reduce((sum, line) => sum + line.cost, 0) };
}

export function presetExample(key, code = BASE_CURRENCY) {
  const preset = PRESETS[key];
  const { lines, totalCost } = costRows(preset.rows, code);
  return { ...preset, lines, totalCost, line: (name) => lines.find((line) => line.name === name) };
}

/** Homepage Margherita pizza example: one recipe sold by the slice (8) and whole. Money in USD. */
export function pizzaExample(code = BASE_CURRENCY) {
  const totalCost = localPrice(3.21, code);
  const slicePrice = localPrice(3.99, code);
  const wholePrice = localPrice(14.99, code);
  const perSlice = totalCost / 8;
  return {
    totalCost,
    slicePrice,
    wholePrice,
    sliceProfit: slicePrice - perSlice,
    slicePercent: (perSlice / slicePrice) * 100,
    wholeProfit: wholePrice - totalCost,
    wholePercent: (totalCost / wholePrice) * 100,
  };
}
