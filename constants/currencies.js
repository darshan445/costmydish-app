// Supported markets only: USA, India, UK, Australia, Canada
export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar', region: 'US' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee', region: 'IN' },
  { code: 'GBP', symbol: '£', label: 'British Pound', region: 'GB' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', region: 'AU' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', region: 'CA' },
];

export const DEFAULT_CURRENCY = CURRENCIES[0];

export const REGION_CURRENCY = Object.fromEntries(
  CURRENCIES.map((c) => [c.region, c.code]),
);
