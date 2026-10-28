// The live site is served from www (the apex domain redirects to it), so canonical URLs,
// the sitemap and robots.txt must all use www. Not read from env: a non-www value there
// makes canonicals point at a redirecting URL and splits rankings across two hosts.
const SITE_URL = 'https://www.costmydish.com';

const APP_STORE_ID = '6780339569';
const PLAY_PACKAGE = 'com.costmydish.app';

export const siteConfig = {
  url: SITE_URL,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@costmydish.com',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? 'privacy@costmydish.com',
  appStoreUrl: `https://apps.apple.com/us/app/costmydish/id${APP_STORE_ID}`,
  playStoreUrl: `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`,
};

// App Store Connect only credits `ct` campaigns when the provider token (`pt`) is present.
// Find it in App Store Connect → Analytics → Acquisition → Campaigns → "Generate a campaign link".
const APPLE_PROVIDER_TOKEN = process.env.NEXT_PUBLIC_APPLE_PROVIDER_TOKEN ?? '';

function cleanCampaign(campaign) {
  return String(campaign || 'website').toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 40);
}

/** App Store link that shows up under App Store Connect → Acquisition → Campaigns. */
export function appStoreLink(campaign = 'website') {
  const params = new URLSearchParams({ ct: cleanCampaign(campaign), mt: '8' });
  if (APPLE_PROVIDER_TOKEN) params.set('pt', APPLE_PROVIDER_TOKEN);
  return `${siteConfig.appStoreUrl}?${params.toString()}`;
}

/** Play Store link whose UTM values appear in Play Console → Store listing acquisition reports. */
export function playStoreLink(campaign = 'website') {
  const referrer = new URLSearchParams({
    utm_source: 'costmydish.com',
    utm_medium: 'website',
    utm_campaign: cleanCampaign(campaign),
  }).toString();
  return `${siteConfig.playStoreUrl}&referrer=${encodeURIComponent(referrer)}`;
}

/** Device-aware link (`/get`) used for QR codes: sends phones to the right store. */
export function smartAppLink(campaign = 'website') {
  return `${SITE_URL}/get?c=${encodeURIComponent(cleanCampaign(campaign))}`;
}
