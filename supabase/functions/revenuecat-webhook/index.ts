import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// These are auto-injected by Supabase Edge Functions runtime
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Set this in Supabase Dashboard → Edge Functions → Secrets:
//   REVENUECAT_WEBHOOK_SECRET = <the secret you configure in RevenueCat dashboard>
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

// RevenueCat event types that activate the Hobbyist tier
const ACTIVATE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
]);

// RevenueCat event types that revert to Free
const DEACTIVATE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'REFUND',
]);

serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Verify the shared secret RevenueCat sends in the Authorization header
  if (WEBHOOK_SECRET) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== WEBHOOK_SECRET) {
      console.error('[webhook] Unauthorized — bad secret');
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  // RevenueCat wraps the event in a top-level { event: {...} } object
  const event = body.event as Record<string, unknown> | undefined;
  if (!event) {
    return new Response('No event body', { status: 400 });
  }

  const eventType = event.type as string;
  // app_user_id is the value we set via Purchases.logIn(supabaseUserId)
  const appUserId = event.app_user_id as string;

  if (!appUserId) {
    console.warn('[webhook] Missing app_user_id in event', eventType);
    return new Response('OK', { status: 200 }); // not our user, ignore
  }

  let newTier: string | null = null;
  if (ACTIVATE_EVENTS.has(eventType)) {
    newTier = 'hobbyist';
  } else if (DEACTIVATE_EVENTS.has(eventType)) {
    newTier = 'free';
  } else {
    // Ignore other events (PRODUCT_CHANGE, SUBSCRIBER_ALIAS, etc.)
    return new Response('OK', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: newTier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appUserId);

  if (error) {
    console.error('[webhook] Supabase update error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[webhook] ${eventType} → profiles(${appUserId}).subscription_tier = ${newTier}`);
  return new Response('OK', { status: 200 });
});
