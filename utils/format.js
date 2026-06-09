/**
 * Formats a number as currency using the given symbol.
 */
export function formatCurrency(amount, symbol = '$') {
  if (amount == null || isNaN(amount)) return `${symbol}0.00`;
  return `${symbol}${Number(amount).toFixed(2)}`;
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
 * Formats a recipe category enum value for display.
 * 'main_course' → 'Main course', 'sauce_condiment' → 'Sauce condiment'
 */
export function formatCategory(cat) {
  if (!cat) return '';
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
