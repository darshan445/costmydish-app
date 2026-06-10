import { getCalendars, getLocales } from 'expo-localization';
import { CURRENCIES, DEFAULT_CURRENCY, REGION_CURRENCY } from '../constants/currencies';

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
  'Europe/London': 'GB',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Darwin': 'AU',
  'Australia/Hobart': 'AU',
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
    const match = CURRENCIES.find((c) => c.code === locale.currencyCode);
    if (match) return match.region;
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

const REGION_UNIT_SYSTEM = {
  US: 'imperial',
  IN: 'metric',
  GB: 'metric',
  AU: 'metric',
  CA: 'metric',
};

export function getUnitSystemFromDeviceLocale() {
  const region = getDeviceRegion();
  return REGION_UNIT_SYSTEM[region] ?? 'metric';
}

/**
 * Maps the device locale to a supported market currency (USD, INR, GBP, AUD, CAD).
 * Subscription plan prices stay USD; this is for ingredient/recipe costs only.
 */
export function getCurrencyFromDeviceLocale() {
  const region = getDeviceRegion();
  const code = REGION_CURRENCY[region] ?? DEFAULT_CURRENCY.code;
  return findSupportedCurrency(code) ?? DEFAULT_CURRENCY;
}
