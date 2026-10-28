// Same maths as the CostMyDish app (lib/units.js + lib/calculations.js), so the web
// calculator and the app always show identical numbers for the same inputs.

const TO_BASE = {
  kg: 1000,
  g: 1,
  lb: 453.592,
  oz: 28.3495,
  l: 1000,
  ml: 1,
  fl_oz: 29.5735,
  cup: 240,
  tbsp: 14.7868,
  tsp: 4.92892,
  gallon: 3785.41,
  quart: 946.353,
  pint: 473.176,
  piece: 1,
  each: 1,
  dozen: 12,
};

const UNIT_FAMILIES = {
  weight: ['kg', 'g', 'lb', 'oz'],
  volume: ['l', 'ml', 'fl_oz', 'cup', 'tbsp', 'tsp', 'gallon', 'quart', 'pint'],
  count: ['piece', 'each', 'dozen'],
};

export const UNIT_OPTIONS = [
  { group: 'Weight', units: [['g', 'g'], ['kg', 'kg'], ['oz', 'oz'], ['lb', 'lb']] },
  {
    group: 'Volume',
    units: [['ml', 'ml'], ['l', 'L'], ['tsp', 'tsp'], ['tbsp', 'tbsp'], ['cup', 'cup'], ['fl_oz', 'fl oz'], ['pint', 'pint'], ['quart', 'quart'], ['gallon', 'gallon']],
  },
  { group: 'Count', units: [['piece', 'piece'], ['each', 'each'], ['dozen', 'dozen']] },
];

export const MARGIN_LABELS = {
  good: 'On target',
  warning: 'Slightly over',
  danger: 'Over budget',
  loss: 'Selling at a loss',
};

function unitFamily(unit) {
  return Object.keys(UNIT_FAMILIES).find((family) => UNIT_FAMILIES[family].includes(unit)) ?? null;
}

export function parsePositive(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Rounds a price up to whole cents, so selling at it never exceeds the target food cost %. */
export function roundPriceUp(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.ceil(Number((n * 100).toFixed(6))) / 100;
}

function normalizePercent(value) {
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Cost of one ingredient line. Waste grosses up the cost: only (100 − waste)% of what
 * you buy is usable, e.g. 15% waste → × 1 / 0.85.
 */
export function ingredientLineCost({ buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent }) {
  const price = parsePositive(buyPrice);
  const purchaseQty = parsePositive(buyQty);
  const usedQty = parsePositive(useQty);
  if (price == null || purchaseQty == null || usedQty == null) return { cost: null, error: null };

  const waste = Math.max(0, Number(wastePercent) || 0);
  if (waste >= 100) return { cost: null, error: 'Waste must be under 100%' };

  const buyFamily = unitFamily(buyUnit);
  const useFamily = unitFamily(useUnit);
  if (buyUnit !== useUnit && (!buyFamily || buyFamily !== useFamily)) {
    return {
      cost: null,
      error:
        buyFamily === 'count' || useFamily === 'count'
          ? 'Count units can only convert to piece, each or dozen'
          : 'Can’t convert weight to volume — buy and use in the same kind of unit',
    };
  }

  const purchaseInUseUnits = (purchaseQty * TO_BASE[buyUnit]) / TO_BASE[useUnit];
  const cost = (usedQty / purchaseInUseUnits) * price * (1 / (1 - waste / 100));
  return { cost, error: null };
}

/**
 * Dish summary for a total ingredient cost.
 * costPerUnit = total / quantityMade; suggestedPrice = costPerUnit / target (rounded up);
 * foodCostPercent = costPerUnit / sellingPrice × 100; profit = sellingPrice − costPerUnit.
 */
export function dishSummary({ totalCost, quantityMade, targetPercent, sellingPrice }) {
  const qty = parsePositive(quantityMade) ?? 1;
  const target = parsePositive(targetPercent) ?? 30;
  const price = parsePositive(sellingPrice);
  const costPerUnit = totalCost / qty;
  const suggestedPrice = totalCost > 0 ? roundPriceUp(costPerUnit / (target / 100)) : null;

  let foodCostPercent = null;
  let profit = null;
  let status = null;
  if (price != null && totalCost > 0) {
    foodCostPercent = normalizePercent((costPerUnit / price) * 100);
    profit = price - costPerUnit;
    const diff = foodCostPercent - target;
    if (profit < 0) status = 'loss';
    else if (diff <= 0) status = 'good';
    else if (diff <= 5) status = 'warning';
    else status = 'danger';
  }

  return { qty, target, costPerUnit, suggestedPrice, foodCostPercent, profit, status };
}

export function formatMoney(amount, symbol) {
  if (amount == null || !Number.isFinite(amount)) return '—';
  const fixed = Number(amount).toFixed(2);
  if (Number(fixed) < 0) return `−${symbol}${fixed.slice(1)}`;
  return `${symbol}${fixed.replace(/^-/, '')}`;
}

export function formatPercent(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(Math.ceil(value * 10 - 1e-9) / 10).toFixed(1)}%`;
}
