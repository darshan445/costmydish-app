import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

/** Events that grant or extend Hobbyist access */
const ACTIVATE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

/** Events that revoke access immediately */
const DEACTIVATE_EVENTS = new Set([
  'EXPIRATION',
  'REFUND',
]);

/** Auto-renew turned off — access continues until expiration_at_ms */
const CANCEL_EVENT = 'CANCELLATION';

/** Payment failed — keep access during grace period (RC still grants entitlement) */
const BILLING_ISSUE_EVENT = 'BILLING_ISSUE';

function expirationFromEvent(event: Record<string, unknown>): string | null {
  const ms = event.expiration_at_ms;
  if (typeof ms === 'number' && ms > 0) {
    return new Date(ms).toISOString();
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

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

  const event = body.event as Record<string, unknown> | undefined;
  if (!event) {
    return new Response('No event body', { status: 400 });
  }

  const eventType = event.type as string;
  const appUserId = event.app_user_id as string;

  if (!appUserId) {
    console.warn('[webhook] Missing app_user_id in event', eventType);
    return new Response('OK', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const expiresAt = expirationFromEvent(event);
  const now = new Date().toISOString();

  let update: Record<string, unknown> | null = null;

  if (ACTIVATE_EVENTS.has(eventType)) {
    update = {
      subscription_tier: 'hobbyist',
      subscription_expires_at: expiresAt,
      revenuecat_user_id: appUserId,
      updated_at: now,
    };
  } else if (eventType === CANCEL_EVENT) {
    // User cancelled auto-renew — keep Hobbyist until period ends
    update = {
      subscription_tier: 'hobbyist',
      subscription_expires_at: expiresAt,
      revenuecat_user_id: appUserId,
      updated_at: now,
    };
  } else if (eventType === BILLING_ISSUE_EVENT) {
    // Grace period — entitlement usually still active; record expiry for UI
    update = {
      subscription_tier: 'hobbyist',
      subscription_expires_at: expiresAt,
      revenuecat_user_id: appUserId,
      updated_at: now,
    };
  } else if (DEACTIVATE_EVENTS.has(eventType)) {
    update = {
      subscription_tier: 'free',
      subscription_expires_at: null,
      revenuecat_user_id: appUserId,
      updated_at: now,
    };
  } else {
    console.log(`[webhook] Ignored event: ${eventType}`);
    return new Response('OK', { status: 200 });
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', appUserId);

  if (error) {
    console.error('[webhook] Supabase update error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[webhook] ${eventType} → profiles(${appUserId})`, update);
  return new Response('OK', { status: 200 });
});
