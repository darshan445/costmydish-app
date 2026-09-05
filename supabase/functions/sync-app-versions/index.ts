import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const APP_STORE_ID = '6780339569';
const ANDROID_PACKAGE = 'com.costmydish.app';
const DEFAULT_MESSAGE =
  'A newer version of CostMyDish is available. Update for the latest fixes and improvements.';

function parseParts(version: string): number[] {
  const core = version.trim().split(/[-+]/)[0];
  return core.split('.').map((p) => {
    const n = parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

function maxVersion(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  const pa = parseParts(a);
  const pb = parseParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const left = pa[i] ?? 0;
    const right = pb[i] ?? 0;
    if (left < right) return b;
    if (left > right) return a;
  }
  return a;
}

async function fetchIosVersion(): Promise<string | null> {
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=us&_=${Date.now()}`,
  );
  if (!res.ok) return null;
  const json = await res.json();
  const version = json?.results?.[0]?.version;
  return typeof version === 'string' && version.trim() ? version.trim() : null;
}

async function fetchAndroidVersion(): Promise<string | null> {
  const res = await fetch(
    `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&hl=en&gl=US`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    },
  );
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

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const [ios, android] = await Promise.all([
      fetchIosVersion(),
      fetchAndroidVersion(),
    ]);

    if (!ios && !android) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Could not read either store version' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const latest = maxVersion(ios, android);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase.from('app_version_config').upsert({
      id: 1,
      latest_version: latest ?? '0.0.0',
      ios_latest_version: ios,
      android_latest_version: android,
      message: DEFAULT_MESSAGE,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, ios, android, latest }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
