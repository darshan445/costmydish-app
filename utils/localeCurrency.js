import { getCalendars, getLocales } from 'expo-localization';
import {
  CURRENCIES,
  CURRENCY_PRIMARY_REGION,
  DEFAULT_CURRENCY,
  REGION_CURRENCY,
} from '../constants/currencies';

const LANGUAGE_CODES = new Set([
  'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
  'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs',
  'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy',
  'da', 'de', 'dv', 'dz',
  'ee', 'el', 'en', 'eo', 'es', 'et', 'eu',
  'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy',
  'ga', 'gd', 'gl', 'gn', 'gu', 'gv',
  'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
  'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu',
  'ja', 'jv',
  'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky',
  'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv',
  'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
  'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny',
  'oc', 'oj', 'om', 'or', 'os',
  'pa', 'pi', 'pl', 'ps', 'pt',
  'qu',
  'rm', 'rn', 'ro', 'ru', 'rw',
  'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw',
  'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
  'ug', 'uk', 'ur', 'uz',
  've', 'vi', 'vo',
  'wa', 'wo',
  'xh',
  'yi', 'yo',
  'za', 'zh', 'zu',
]);

// Timezone → region when locale has no country (common on Android).
const TIMEZONE_REGION = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Jerusalem': 'IL',
  'Asia/Tokyo': 'JP',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Seoul': 'KR',
  'Asia/Taipei': 'TW',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP',
  'Asia/Istanbul': 'TR',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Lisbon': 'PT',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Moscow': 'RU',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Darwin': 'AU',
  'Australia/Hobart': 'AU',
  'Pacific/Auckland': 'NZ',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/St_Johns': 'CA',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Africa/Cairo': 'EG',
  'Africa/Accra': 'GH',
  'Africa/Casablanca': 'MA',
};

function findSupportedCurrency(code) {
  return CURRENCIES.find((c) => c.code === code) ?? null;
}

function regionFromLanguageTag(tag) {
  if (!tag) return null;
  const parts = tag.replace('_', '-').split('-');
  const region = parts.find((part) => part.length === 2 && part === part.toUpperCase());
  if (region && !LANGUAGE_CODES.has(region.toLowerCase())) return region;
  return null;
}

function getRegionFromExpoLocalization() {
  const locale = getLocales()[0];
  if (!locale) return null;

  if (locale.regionCode && REGION_CURRENCY[locale.regionCode]) {
    return locale.regionCode;
  }

  if (locale.currencyCode) {
    const match = findSupportedCurrency(locale.currencyCode);
    if (match) {
      if (locale.regionCode) return locale.regionCode;
      return CURRENCY_PRIMARY_REGION[match.code] ?? null;
    }
  }

  const fromTag = regionFromLanguageTag(locale.languageTag);
  if (fromTag && REGION_CURRENCY[fromTag]) return fromTag;

  return null;
}

function getRegionFromIntl() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const fromTag = regionFromLanguageTag(locale);
    if (fromTag && REGION_CURRENCY[fromTag]) return fromTag;
  } catch (_) {
    // ignore
  }
  return null;
}

function getRegionFromTimezone() {
  try {
    const calendars = getCalendars();
    const timeZone = calendars[0]?.timeZone
      ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_REGION[timeZone] ?? null;
  } catch (_) {
    return null;
  }
}

export function getDeviceRegion() {
  return getRegionFromExpoLocalization()
    ?? getRegionFromIntl()
    ?? getRegionFromTimezone()
    ?? 'US';
}

/** Only US defaults to imperial; everyone else metric. */
const IMPERIAL_REGIONS = new Set(['US']);

export function getUnitSystemFromDeviceLocale() {
  const region = getDeviceRegion();
  return IMPERIAL_REGIONS.has(region) ? 'imperial' : 'metric';
}

/**
 * Maps the device locale to a supported currency for ingredient/recipe costs.
 * Prefers device currency code, then region map; falls back to USD.
 * Subscription plan prices stay USD.
 */
export function getCurrencyFromDeviceLocale() {
  try {
    const locale = getLocales()[0];
    if (locale?.currencyCode) {
      const byCode = findSupportedCurrency(locale.currencyCode);
      if (byCode) return byCode;
    }
  } catch (_) {
    // ignore
  }

  const region = getDeviceRegion();
  const code = REGION_CURRENCY[region] ?? DEFAULT_CURRENCY.code;
  return findSupportedCurrency(code) ?? DEFAULT_CURRENCY;
}
