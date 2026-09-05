import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import {
  ANDROID_PACKAGE_ID,
  APP_STORE_NUMERIC_ID,
  DEFAULT_UPDATE_MESSAGE,
} from '../constants/legal';

const CACHE_KEY = '@costmydish/store-latest-version';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — avoid hammering stores

/**
 * Parse "1.2.5" / "1.2.5-beta" into [1, 2, 5] for comparison.
 * @param {string} version
 * @returns {number[]}
 */
export function parseVersionParts(version) {
  if (!version || typeof version !== 'string') return [];
  const core = version.trim().split(/[-+]/)[0];
  return core.split('.').map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/**
 * @returns {-1 | 0 | 1} -1 if a < b, 0 equal, 1 if a > b
 */
export function compareVersions(a, b) {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const left = pa[i] ?? 0;
    const right = pb[i] ?? 0;
    if (left < right) return -1;
    if (left > right) return 1;
  }
  return 0;
}

export function getInstalledAppVersion() {
  return (
    Constants.expoConfig?.version
    ?? Constants.nativeAppVersion
    ?? null
  );
}

export function getAppPlatform() {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown';
}

/** @returns {Promise<string | null>} */
async function fetchIosStoreVersion() {
  const url = `https://itunes.apple.com/lookup?id=${APP_STORE_NUMERIC_ID}&country=us&_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const version = json?.results?.[0]?.version;
  return typeof version === 'string' && version.trim() ? version.trim() : null;
}

/**
 * Google Play has no public version API — parse the listing HTML.
 * Pattern matches what most in-app update checkers use; may need tweaks if Play changes markup.
 * @returns {Promise<string | null>}
 */
async function fetchAndroidStoreVersion() {
  const url = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}&hl=en&gl=US`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const patterns = [
    /\[\[\["(\d+\.\d+\.\d+(?:\.\d+)?)"\]\]/,
    /\[\[\["(\d+\.\d+(?:\.\d+)?)"\]\]/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

/** @returns {Promise<string | null>} */
async function fetchStoreLatestVersion() {
  if (Platform.OS === 'ios') return fetchIosStoreVersion();
  if (Platform.OS === 'android') return fetchAndroidStoreVersion();
  return null;
}

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.platform !== Platform.OS) return null;
    if (!parsed?.version || !parsed?.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.version;
  } catch {
    return null;
  }
}

async function writeCache(version) {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        platform: Platform.OS,
        version,
        fetchedAt: Date.now(),
      }),
    );
  } catch {
    // ignore cache write failures
  }
}

/**
 * Supabase fallback + custom message when store fetch fails.
 * @returns {Promise<{ latestVersion: string | null, message: string | null }>}
 */
async function fetchSupabaseVersionConfig() {
  try {
    const { data, error } = await supabase
      .from('app_version_config')
      .select('latest_version, ios_latest_version, android_latest_version, message')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn('app_version_config:', error.message);
      return { latestVersion: null, message: null };
    }

    const platformVersion = Platform.OS === 'ios'
      ? data.ios_latest_version
      : Platform.OS === 'android'
        ? data.android_latest_version
        : null;

    const latestVersion = (platformVersion || data.latest_version || '').trim() || null;
    return {
      latestVersion,
      message: data.message ?? null,
    };
  } catch (e) {
    console.warn('fetchSupabaseVersionConfig:', e?.message);
    return { latestVersion: null, message: null };
  }
}

/**
 * Auto-fetches App Store / Play latest version (no manual SQL needed).
 * Falls back to Supabase if the store request fails.
 * @returns {Promise<{
 *   updateAvailable: boolean,
 *   installedVersion: string | null,
 *   latestVersion: string | null,
 *   message: string | null,
 *   source: 'store' | 'cache' | 'supabase' | 'none',
 * }>}
 */
export async function checkAppUpdateAvailable() {
  const installedVersion = getInstalledAppVersion();
  const empty = {
    updateAvailable: false,
    installedVersion,
    latestVersion: null,
    message: null,
    source: 'none',
  };

  if (!installedVersion) return empty;

  const configPromise = fetchSupabaseVersionConfig();

  let latestVersion = null;
  let source = 'none';

  const cached = await readCache();
  if (cached) {
    latestVersion = cached;
    source = 'cache';
  } else {
    try {
      const fromStore = await fetchStoreLatestVersion();
      if (fromStore) {
        latestVersion = fromStore;
        source = 'store';
        await writeCache(fromStore);
      }
    } catch (e) {
      console.warn('Store version fetch failed:', e?.message);
    }
  }

  const config = await configPromise;

  if (!latestVersion && config.latestVersion) {
    latestVersion = config.latestVersion;
    source = 'supabase';
  }

  if (!latestVersion) return empty;

  const updateAvailable = compareVersions(installedVersion, latestVersion) < 0;

  return {
    updateAvailable,
    installedVersion,
    latestVersion,
    message: updateAvailable
      ? (config.message || DEFAULT_UPDATE_MESSAGE)
      : null,
    source,
  };
}
