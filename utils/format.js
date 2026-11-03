/**
 * Formats a number as currency using the given symbol.
 */
import { Platform } from 'react-native';
import { RECIPE_CATEGORIES } from '../constants/units';
import { FOOD_COST_COPY } from '../constants/copy';

export function formatCurrency(amount, symbol = '$') {
  if (amount == null || isNaN(amount)) return `${symbol}0.00`;
  const fixed = Number(amount).toFixed(2);
  if (Number(fixed) < 0) return `−${symbol}${fixed.slice(1)}`;
  return `${symbol}${fixed.replace(/^-/, '')}`;
}

/** Badge text for a margin status; a negative profit reads as a loss rather than "Over budget". */
export function marginStatusLabel(status, profit = null) {
  if (profit != null && profit < 0) return FOOD_COST_COPY.wizard.sellingAtLoss;
  return FOOD_COST_COPY.wizard.marginStatus[status] ?? null;
}

const COMMA_ERROR = 'Remove the comma. Use a dot for decimals, e.g. 2.50 or 1500';

/**
 * Keyboard for decimal fields. The iPhone decimal pad shows only "," in comma regions, so
 * iOS uses the numbers-and-punctuation keyboard, which always has "." and a Return key.
 */
export const DECIMAL_KEYBOARD = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

/**
 * Parses a plain user-typed number: digits with at most one "." ("2.50", "1000", ".5").
 * Returns NaN for anything else ("2,50", "1,000", "2kg", "-1") so it fails validation
 * instead of being silently truncated the way parseFloat does.
 */
export function parseDecimal(value) {
  const text = String(value ?? '').trim();
  if (!/^\d*\.?\d*$/.test(text) || !/\d/.test(text)) return NaN;
  return parseFloat(text);
}

/** Upper bounds that only catch typos (an extra zero or two), never real kitchen numbers. */
export const MAX_PRICE = 100000000;
export const MAX_QUANTITY = 1000000;
export const MAX_COUNT = 100000;
export const NAME_MAX_LENGTH = 80;

/** Validation message for a required number that must be above 0, or null when valid. */
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

/** Validation message for a required money amount, or null when valid. */
export function priceError(value) {
  return positiveNumberError(value, 'price', MAX_PRICE);
}

/** Parses a whole number typed by the user ("12"); NaN for "12.5", "1,000", "12 pcs". */
export function parseWholeNumber(value) {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? parseInt(text, 10) : NaN;
}

/** Validation message for a count such as "how many this dish makes", or null when valid. */
export function wholeNumberError(value) {
  const text = String(value ?? '').trim();
  if (text === '') return 'Enter how many';
  if (text.includes(',')) return 'Remove the comma, e.g. 1500';
  if (text.includes('.')) return 'Use a whole number, e.g. 12';
  const number = parseWholeNumber(text);
  if (Number.isNaN(number)) return 'Enter a whole number, e.g. 12';
  if (number <= 0) return 'Enter a number above 0';
  if (number > MAX_COUNT) return 'That looks too high. Check the number';
  return null;
}

/** Validation message for a target / default food cost %, or null when valid. */
export function foodCostPercentError(value) {
  const text = String(value ?? '').trim();
  if (text === '') return 'Enter a target %';
  if (text.includes(',')) return COMMA_ERROR;
  const percent = parseDecimal(text);
  if (Number.isNaN(percent)) return 'Enter a valid %, e.g. 30';
  if (percent < 1 || percent > 100) return 'Enter a % between 1 and 100';
  return null;
}

/** Validation message for an optional waste % field (blank means 0), or null when valid. */
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
 * Formats a percentage — drops trailing .0 (30.0% → 30%, 15.6% → 15.6%).
 * Uses string-based check to avoid floating-point edge cases (30.0000001 → 30%).
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '—';
  const formatted = Number(value).toFixed(1);
  return formatted.endsWith('.0') ? `${formatted.slice(0, -2)}%` : `${formatted}%`;
}

/**
 * Formats food cost % for display — value should already be normalized in calculations.js.
 * Strips trailing zeros only (30% not 30.00%, 30.01% unchanged).
 */
/** Formats priced the same way differ by cents of rounding; don't show that as a range */
export function isWithinOnePercent(min, max) {
  return Math.abs(max - min) <= Math.max(Math.abs(max), Math.abs(min)) * 0.01;
}

export function formatFoodCostPercent(value) {
  if (value == null || isNaN(value)) return '—';
  // One decimal, rounded up, so the figure never reads below the margin status (30.04 → 30.1%)
  const hundredths = Math.round(Number(value) * 100);
  return `${(Math.ceil(hundredths / 10) / 10).toFixed(1)}%`;
}

/**
 * Formats a recipe category enum value for display.
 * 'main_course' → 'Main course', 'sauce_condiment' → 'Sauce condiment'
 */
export function formatCategory(cat) {
  if (!cat) return '';
  const fromList = RECIPE_CATEGORIES.find((c) => c.value === cat);
  if (fromList) return fromList.label;
  const s = cat.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Formats a quantity — removes trailing zeros.
 */
export function formatQuantity(value) {
  if (value == null || isNaN(value)) return '0';
  const num = Number(value);
  return num % 1 === 0 ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Returns a human-readable relative time string.
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a subscription expiry date for display (e.g. "Jun 9, 2026").
 */
export function formatSubscriptionDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
