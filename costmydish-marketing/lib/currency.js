import { formatMoney } from '@/lib/food-cost';

/**
 * Same currency list as the app (constants/currencies.js).
 * `factor` turns a typical US grocery price into a typical local one (USD × factor). It is a rough
 * food price level, not a live exchange rate — example prices only need to look familiar locally.
 */
export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar', factor: 1 },
  { code: 'EUR', symbol: '€', label: 'Euro', factor: 0.9 },
  { code: 'GBP', symbol: '£', label: 'British Pound', factor: 0.8 },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee', factor: 30 },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', factor: 1.5 },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', factor: 1.35 },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar', factor: 1.6 },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar', factor: 1.3 },
  { code: 'HKD', symbol: 'HK$', label: 'Hong Kong Dollar', factor: 7.5 },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen', factor: 140 },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan', factor: 5 },
  { code: 'KRW', symbol: '₩', label: 'South Korean Won', factor: 1300 },
  { code: 'THB', symbol: '฿', label: 'Thai Baht', factor: 25 },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit', factor: 2.5 },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah', factor: 9000 },
  { code: 'PHP', symbol: '₱', label: 'Philippine Peso', factor: 35 },
  { code: 'VND', symbol: '₫', label: 'Vietnamese Dong', factor: 15000 },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham', factor: 3.5 },
  { code: 'SAR', symbol: '﷼', label: 'Saudi Riyal', factor: 3.5 },
  { code: 'QAR', symbol: 'ر.ق', label: 'Qatari Riyal', factor: 3.5 },
  { code: 'KWD', symbol: 'د.ك', label: 'Kuwaiti Dinar', factor: 0.3 },
  { code: 'BHD', symbol: 'BD', label: 'Bahraini Dinar', factor: 0.37 },
  { code: 'OMR', symbol: 'ر.ع.', label: 'Omani Rial', factor: 0.37 },
  { code: 'ILS', symbol: '₪', label: 'Israeli Shekel', factor: 3.8 },
  { code: 'TRY', symbol: '₺', label: 'Turkish Lira', factor: 25 },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand', factor: 12 },
  { code: 'NGN', symbol: '₦', label: 'Nigerian Naira', factor: 900 },
  { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling', factor: 90 },
  { code: 'EGP', symbol: 'E£', label: 'Egyptian Pound', factor: 25 },
  { code: 'GHS', symbol: 'GH₵', label: 'Ghanaian Cedi', factor: 10 },
  { code: 'MAD', symbol: 'د.م.', label: 'Moroccan Dirham', factor: 7 },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real', factor: 4 },
  { code: 'MXN', symbol: 'MX$', label: 'Mexican Peso', factor: 14 },
  { code: 'ARS', symbol: 'AR$', label: 'Argentine Peso', factor: 700 },
  { code: 'CLP', symbol: 'CL$', label: 'Chilean Peso', factor: 750 },
  { code: 'COP', symbol: 'COL$', label: 'Colombian Peso', factor: 3000 },
  { code: 'PEN', symbol: 'S/', label: 'Peruvian Sol', factor: 3 },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc', factor: 1 },
  { code: 'SEK', symbol: 'kr', label: 'Swedish Krona', factor: 10 },
  { code: 'NOK', symbol: 'kr', label: 'Norwegian Krone', factor: 11 },
  { code: 'DKK', symbol: 'kr', label: 'Danish Krone', factor: 6.8 },
  { code: 'PLN', symbol: 'zł', label: 'Polish Złoty', factor: 3 },
  { code: 'CZK', symbol: 'Kč', label: 'Czech Koruna', factor: 18 },
  { code: 'HUF', symbol: 'Ft', label: 'Hungarian Forint', factor: 280 },
  { code: 'RON', symbol: 'lei', label: 'Romanian Leu', factor: 3.5 },
  { code: 'RUB', symbol: '₽', label: 'Russian Ruble', factor: 60 },
  { code: 'UAH', symbol: '₴', label: 'Ukrainian Hryvnia', factor: 30 },
  { code: 'TWD', symbol: 'NT$', label: 'New Taiwan Dollar', factor: 28 },
  { code: 'PKR', symbol: '₨', label: 'Pakistani Rupee', factor: 140 },
  { code: 'BDT', symbol: '৳', label: 'Bangladeshi Taka', factor: 70 },
  { code: 'LKR', symbol: 'Rs', label: 'Sri Lankan Rupee', factor: 180 },
  { code: 'NPR', symbol: 'Rs', label: 'Nepalese Rupee', factor: 80 },
];

export const BASE_CURRENCY = 'USD';

const BY_CODE = Object.fromEntries(CURRENCIES.map((currency) => [currency.code, currency]));

export function getCurrency(code) {
  return BY_CODE[code] ?? BY_CODE[BASE_CURRENCY];
}

export function isCurrencyCode(code) {
  return typeof code === 'string' && code in BY_CODE;
}

/** Rounds to a tidy price with two significant steps: 2.56 → 2.55, 72.4 → 72.5, 268 → 270, 22,480 → 22,500. */
function tidyPrice(value) {
  if (!(value > 0)) return 0;
  const step = 10 ** (Math.floor(Math.log10(value)) - 1) / 2;
  const rounded = Math.round(value / step) * step;
  return Number(Math.max(rounded, step).toFixed(2)) || 0.01;
}

/** An example price in `from` currency shown as a typical price in `code` currency. */
export function localPrice(amount, code, from = BASE_CURRENCY) {
  const value = Number(amount);
  if (!Number.isFinite(value) || code === from) return value;
  return tidyPrice((value / getCurrency(from).factor) * getCurrency(code).factor);
}

function priceText(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** Converts the price column of example rows: [name, price paid, amount bought, …]. */
export function localizeRows(rows, code, from = BASE_CURRENCY) {
  if (code === from) return rows;
  return rows.map(([name, buyPrice, ...rest]) => [name, priceText(localPrice(buyPrice, code, from)), ...rest]);
}

/** Example input value (e.g. a default "12.00") shown in the visitor's currency. */
export function localPriceText(text, code, from = BASE_CURRENCY) {
  if (code === from) return text;
  return priceText(localPrice(text, code, from));
}

/**
 * Money helpers for writing worked examples in any currency.
 * p(usd) → tidy local number · m(n) → "$3.20" · w(n) → "$12" when whole · $(usd) / $w(usd) → p then m / w.
 */
export function moneyFor(code, from = BASE_CURRENCY) {
  const { symbol, label } = getCurrency(code);
  const p = (amount) => localPrice(amount, code, from);
  const m = (n) => formatMoney(n, symbol);
  const w = (n) => (Math.abs(n - Math.round(n)) < 0.005 ? formatMoney(Math.round(n), symbol).replace(/\.00$/, '') : m(n));
  return { code, symbol, label, p, m, w, $: (amount) => m(p(amount)), $w: (amount) => w(p(amount)) };
}

const EURO_COUNTRIES = 'AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK'.split(' ');

const COUNTRY_CURRENCY = {
  ...Object.fromEntries(EURO_COUNTRIES.map((country) => [country, 'EUR'])),
  US: 'USD', GB: 'GBP', IN: 'INR', AU: 'AUD', CA: 'CAD', NZ: 'NZD', SG: 'SGD', HK: 'HKD', JP: 'JPY',
  CN: 'CNY', KR: 'KRW', TH: 'THB', MY: 'MYR', ID: 'IDR', PH: 'PHP', VN: 'VND', AE: 'AED', SA: 'SAR',
  QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', IL: 'ILS', TR: 'TRY', ZA: 'ZAR', NG: 'NGN', KE: 'KES',
  EG: 'EGP', GH: 'GHS', MA: 'MAD', BR: 'BRL', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', RU: 'RUB',
  UA: 'UAH', TW: 'TWD', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
};

const TIMEZONE_CURRENCY = {
  'Asia/Kolkata': 'INR', 'Asia/Calcutta': 'INR', 'Europe/London': 'GBP', 'Europe/Belfast': 'GBP',
  'Europe/Guernsey': 'GBP', 'Europe/Jersey': 'GBP', 'Europe/Isle_of_Man': 'GBP',
  'Asia/Singapore': 'SGD', 'Asia/Hong_Kong': 'HKD', 'Asia/Tokyo': 'JPY', 'Asia/Shanghai': 'CNY',
  'Asia/Chongqing': 'CNY', 'Asia/Urumqi': 'CNY', 'Asia/Seoul': 'KRW', 'Asia/Bangkok': 'THB',
  'Asia/Kuala_Lumpur': 'MYR', 'Asia/Kuching': 'MYR', 'Asia/Jakarta': 'IDR', 'Asia/Makassar': 'IDR',
  'Asia/Jayapura': 'IDR', 'Asia/Pontianak': 'IDR', 'Asia/Manila': 'PHP', 'Asia/Ho_Chi_Minh': 'VND',
  'Asia/Saigon': 'VND', 'Asia/Dubai': 'AED', 'Asia/Riyadh': 'SAR', 'Asia/Qatar': 'QAR',
  'Asia/Kuwait': 'KWD', 'Asia/Bahrain': 'BHD', 'Asia/Muscat': 'OMR', 'Asia/Jerusalem': 'ILS',
  'Asia/Tel_Aviv': 'ILS', 'Europe/Istanbul': 'TRY', 'Asia/Istanbul': 'TRY', 'Africa/Johannesburg': 'ZAR',
  'Africa/Lagos': 'NGN', 'Africa/Nairobi': 'KES', 'Africa/Cairo': 'EGP', 'Africa/Accra': 'GHS',
  'Africa/Casablanca': 'MAD', 'Europe/Zurich': 'CHF', 'Europe/Stockholm': 'SEK', 'Europe/Oslo': 'NOK',
  'Europe/Copenhagen': 'DKK', 'Europe/Warsaw': 'PLN', 'Europe/Prague': 'CZK', 'Europe/Budapest': 'HUF',
  'Europe/Bucharest': 'RON', 'Europe/Moscow': 'RUB', 'Europe/Kiev': 'UAH', 'Europe/Kyiv': 'UAH',
  'Asia/Taipei': 'TWD', 'Asia/Karachi': 'PKR', 'Asia/Dhaka': 'BDT', 'Asia/Colombo': 'LKR',
  'Asia/Kathmandu': 'NPR', 'Asia/Katmandu': 'NPR', 'Pacific/Auckland': 'NZD', 'Pacific/Chatham': 'NZD',
  'America/Toronto': 'CAD', 'America/Vancouver': 'CAD', 'America/Edmonton': 'CAD', 'America/Winnipeg': 'CAD',
  'America/Halifax': 'CAD', 'America/Regina': 'CAD', 'America/St_Johns': 'CAD', 'America/Moncton': 'CAD',
  'America/Montreal': 'CAD', 'America/Whitehorse': 'CAD', 'America/Yellowknife': 'CAD', 'America/Iqaluit': 'CAD',
  'America/Mexico_City': 'MXN', 'America/Cancun': 'MXN', 'America/Monterrey': 'MXN', 'America/Tijuana': 'MXN',
  'America/Merida': 'MXN', 'America/Chihuahua': 'MXN', 'America/Mazatlan': 'MXN', 'America/Hermosillo': 'MXN',
  'America/Sao_Paulo': 'BRL', 'America/Fortaleza': 'BRL', 'America/Recife': 'BRL', 'America/Bahia': 'BRL',
  'America/Manaus': 'BRL', 'America/Belem': 'BRL', 'America/Buenos_Aires': 'ARS', 'America/Santiago': 'CLP',
  'America/Bogota': 'COP', 'America/Lima': 'PEN',
};

/** Best guess of the visitor's currency: time zone first (reliable), then browser language region. Browser only. */
export function detectCurrency() {
  let timeZone = '';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    timeZone = '';
  }
  if (TIMEZONE_CURRENCY[timeZone]) return TIMEZONE_CURRENCY[timeZone];

  const languages = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  for (const language of languages) {
    const region = String(language ?? '').split('-').slice(1).find((part) => /^[A-Za-z]{2}$/.test(part));
    const code = region ? COUNTRY_CURRENCY[region.toUpperCase()] : null;
    if (code) return code;
  }

  if (timeZone.startsWith('Australia/')) return 'AUD';
  if (timeZone.startsWith('America/Argentina/')) return 'ARS';
  if (timeZone.startsWith('Europe/')) return 'EUR';
  return BASE_CURRENCY;
}
