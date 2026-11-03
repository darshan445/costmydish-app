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

/** Yield units, same list and order as the app's selling_units table. */
export const SELLING_UNITS = [
  ['piece', 'Piece'],
  ['slice', 'Slice'],
  ['pack', 'Pack'],
  ['box', 'Box'],
  ['jar', 'Jar'],
  ['plate', 'Plate'],
  ['serving', 'Serving'],
  ['whole', 'Whole'],
  ['dozen', 'Dozen'],
  ['cup', 'Cup'],
];

const SELLING_UNIT_FOR_WORD = {
  cookie: 'piece', cupcake: 'piece', brownie: 'piece', roll: 'piece', macaron: 'piece', muffin: 'piece',
  croissant: 'piece', 'cake pop': 'piece', donut: 'piece', scone: 'piece', burger: 'piece', taco: 'piece',
  sandwich: 'piece', loaf: 'whole', pizza: 'whole', meal: 'serving',
};

/** Maps a page's unit word ("cookie", "loaf") to the nearest app yield unit. */
export function toSellingUnit(word) {
  const key = String(word ?? '').trim().toLowerCase();
  if (SELLING_UNITS.some(([value]) => value === key)) return key;
  return SELLING_UNIT_FOR_WORD[key] ?? 'piece';
}

/** Same wording as the app: "whole" reads as "whole dish", anything else lowercased. */
export function sellingUnitWord(unit) {
  if (unit === 'whole') return 'whole dish';
  const label = SELLING_UNITS.find(([value]) => value === unit)?.[1] ?? unit;
  return String(label).toLowerCase() || 'serving';
}

export function unitFamily(unit) {
  return Object.keys(UNIT_FAMILIES).find((family) => UNIT_FAMILIES[family].includes(unit)) ?? null;
}

/** Used-unit choices for a purchase unit: the same family only, as in the app's picker. */
export function compatibleUnitOptions(purchaseUnit) {
  const family = unitFamily(purchaseUnit);
  const group = UNIT_OPTIONS.find((g) => g.group.toLowerCase() === family);
  return group ? [group] : UNIT_OPTIONS;
}

/** Default used unit when the purchase unit changes, as in the app (kg → g, l → ml, lb → oz, …). */
export function defaultUsedUnit(purchaseUnit) {
  const smaller = { kg: 'g', l: 'ml', lb: 'oz', gallon: 'cup', quart: 'cup', pint: 'fl_oz', dozen: 'piece' };
  return smaller[purchaseUnit] ?? purchaseUnit;
}

// ---- Number parsing and validation: same rules and messages as the app (utils/format.js) ----

const COMMA_ERROR = 'Remove the comma. Use a dot for decimals, e.g. 2.50 or 1500';
export const MAX_PRICE = 100000000;
export const MAX_QUANTITY = 1000000;
export const MAX_COUNT = 100000;
export const NAME_MAX_LENGTH = 80;

/** Digits with at most one "." ("2.50", "1000", ".5"); NaN for anything else. */
export function parseDecimal(value) {
  const text = String(value ?? '').trim();
  if (!/^\d*\.?\d*$/.test(text) || !/\d/.test(text)) return NaN;
  return parseFloat(text);
}

/** Strict positive number or null. Unlike the old parser, "2,50" and "1,000" are not numbers. */
export function parsePositive(value) {
  const n = parseDecimal(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Error for a required number above 0, or null. */
export function positiveNumberError(value, label, max = MAX_QUANTITY) {
  const text = String(value ?? '').trim();
  if (text === '') return `Enter a ${label}`;
  if (text.includes(',')) return COMMA_ERROR;
  const number = parseDecimal(text);
  if (Number.isNaN(number)) return `Enter a valid ${label}`;
  if (number <= 0) return `${capitalize(label)} must be above 0`;
  if (number > max) return `That ${label} looks too high. Check the number`;
  return null;
}

export function priceError(value) {
  return positiveNumberError(value, 'price', MAX_PRICE);
}

/** Error for a count such as "how many this dish makes", or null. */
export function wholeNumberError(value) {
  const text = String(value ?? '').trim();
  if (text === '') return 'Enter how many';
  if (text.includes(',')) return 'Remove the comma, e.g. 1500';
  if (text.includes('.')) return 'Use a whole number, e.g. 12';
  if (!/^\d+$/.test(text)) return 'Enter a whole number, e.g. 12';
  const number = parseInt(text, 10);
  if (number <= 0) return 'Enter a number above 0';
  if (number > MAX_COUNT) return 'That looks too high. Check the number';
  return null;
}

/** Error for a food cost target %, or null. */
export function foodCostPercentError(value) {
  const text = String(value ?? '').trim();
  if (text === '') return 'Enter a target %';
  if (text.includes(',')) return COMMA_ERROR;
  const percent = parseDecimal(text);
  if (Number.isNaN(percent)) return 'Enter a valid %, e.g. 30';
  if (percent < 1 || percent > 100) return 'Enter a % between 1 and 100';
  return null;
}

/** Error for an optional waste % (blank means 0), or null. */
export function wastePercentError(value) {
  const text = String(value ?? '').trim();
  if (text === '') return null;
  if (text.includes(',')) return COMMA_ERROR;
  const waste = parseDecimal(text);
  if (Number.isNaN(waste)) return 'Enter a valid waste %';
  if (waste >= 100) return 'Waste must be under 100%';
  return null;
}

/**
 * Live-form version of a validator: blank fields are not errors (the result just shows "—"),
 * only wrong input is. Returns the message or null.
 */
export function typedError(validator, value) {
  if (String(value ?? '').trim() === '') return null;
  return validator(value);
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
  // Field errors are shown under each input by the form; here a bad or blank value just means no cost yet
  if (priceError(buyPrice) || positiveNumberError(buyQty, 'quantity') || positiveNumberError(useQty, 'quantity')
    || wastePercentError(wastePercent)) {
    return { cost: null, error: null };
  }
  const price = parseDecimal(buyPrice);
  const purchaseQty = parseDecimal(buyQty);
  const usedQty = parseDecimal(useQty);
  const waste = String(wastePercent ?? '').trim() === '' ? 0 : parseDecimal(wastePercent);

  const buyFamily = unitFamily(buyUnit);
  const useFamily = unitFamily(useUnit);
  if (buyUnit !== useUnit && (!buyFamily || buyFamily !== useFamily)) {
    return {
      cost: null,
      error:
        buyFamily === 'count' || useFamily === 'count'
          ? `Count units (${buyUnit}, ${useUnit}) must use the same count family — piece, each, or dozen.`
          : `Cannot convert between weight (${buyUnit}) and volume (${useUnit}). Use compatible units.`,
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
  // Invalid yield / target fall back to 1 / 30 exactly as the app does while the field shows its error
  const qty = wholeNumberError(quantityMade) ? 1 : parseInt(String(quantityMade).trim(), 10);
  const target = foodCostPercentError(targetPercent) ? 30 : parseDecimal(targetPercent);
  const price = priceError(sellingPrice) ? null : parseDecimal(sellingPrice);
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

function parseNonNegative(value) {
  const n = parseDecimal(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Full cake price including time:
 * price = (ingredients + packaging + hours × rate) × (1 + overhead %) × (1 + profit %).
 */
export function cakePrice({ ingredientCost, packaging, hours, hourlyRate, overheadPercent, profitPercent, portions }) {
  const ingredients = Math.max(0, Number(ingredientCost) || 0);
  const packagingCost = parseNonNegative(packaging);
  const labour = parseNonNegative(hours) * parseNonNegative(hourlyRate);
  const directCost = ingredients + packagingCost + labour;
  const overhead = directCost * (parseNonNegative(overheadPercent) / 100);
  const totalCost = directCost + overhead;
  const profit = totalCost * (parseNonNegative(profitPercent) / 100);
  const price = totalCost > 0 ? roundPriceUp(totalCost + profit) : null;
  const slices = parsePositive(portions) ?? 1;
  const pricePerPortion = price != null ? roundPriceUp(price / slices) : null;
  const ingredientShare = price ? (ingredients / price) * 100 : null;

  return { ingredients, packagingCost, labour, overhead, totalCost, profit, price, pricePerPortion, ingredientShare };
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
