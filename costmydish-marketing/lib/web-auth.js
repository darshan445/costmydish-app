'use client';

import { useEffect, useState } from 'react';
import { AUTH_CHANGE_EVENT } from '@/components/HeaderAccountLink';
import { getCurrency } from '@/lib/currency';
import { siteConfig } from '@/lib/site';
import { getSupabase } from '@/lib/supabase';

export const MIN_PASSWORD_LENGTH = 6;
export const DASHBOARD_PATH = '/dashboard';
const EMAIL_PATTERN = /\S+@\S+\.\S+/;

/** Only same-site paths, so `?next=` can't send people to another domain after sign-in. */
export function safeNextPath(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return DASHBOARD_PATH;
  return next;
}

export function emailError(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email';
  return null;
}

export function passwordError(password) {
  if (!password) return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH) return `At least ${MIN_PASSWORD_LENGTH} characters`;
  return null;
}

/** Plain-English message for a Supabase auth error — never the raw error text. */
export function friendlyAuthError(error) {
  const message = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '').toLowerCase();
  if (message.includes('invalid login credentials') || code === 'invalid_credentials') {
    return 'Wrong email or password. Use the same details as the CostMyDish app.';
  }
  if (message.includes('already registered') || code === 'user_already_exists') {
    return 'An account with this email already exists. Sign in instead — it is the same account as the app.';
  }
  if (message.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Please confirm your email first. Check your inbox for the link we sent.';
  }
  if (message.includes('rate limit') || message.includes('too many') || error?.status === 429) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (message.includes('password should be') || code === 'weak_password') {
    return `Choose a stronger password (at least ${MIN_PASSWORD_LENGTH} characters).`;
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

function unitSystemFor(currencyCode) {
  if (currencyCode !== 'USD') return 'metric';
  const region = (navigator.language || '').split('-')[1];
  return !region || region.toUpperCase() === 'US' ? 'imperial' : 'metric';
}

/**
 * Creates the account, signs in and saves the visitor's currency to user_settings — the same
 * steps the app's signup runs. Returns { needsConfirmation } when the project requires email confirmation.
 */
export async function signUpWithEmail({ fullName, email, password, currencyCode }) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim(), signup_platform: 'web' },
      emailRedirectTo: `${siteConfig.url}/confirm`,
    },
  });
  if (error) throw error;

  let user = data.user;
  if (!data.session) {
    const signIn = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signIn.error) {
      const code = String(signIn.error.code ?? '').toLowerCase();
      if (code === 'email_not_confirmed' || /not confirmed/i.test(signIn.error.message ?? '')) {
        return { needsConfirmation: true };
      }
      throw signIn.error;
    }
    user = signIn.data.user;
  }

  if (user) {
    const currency = getCurrency(currencyCode);
    try {
      await supabase.from('user_settings').upsert(
        {
          user_id: user.id,
          currency: currency.code,
          currency_symbol: currency.symbol,
          unit_system: unitSystemFor(currency.code),
        },
        { onConflict: 'user_id' },
      );
    } catch {
      // Settings default to USD; the user can change currency later
    }
  }
  return { needsConfirmation: false };
}

export async function signInWithEmail({ email, password }) {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${siteConfig.url}/reset-password`,
  });
  if (error) throw error;
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

/** Current Supabase session: { status: 'loading' | 'signedIn' | 'signedOut', user }. */
export function useAuthSession() {
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    let active = true;
    let subscription = null;

    async function start() {
      try {
        const supabase = getSupabase();
        subscription = supabase.auth.onAuthStateChange((_event, session) => {
          if (active) setState({ status: session ? 'signedIn' : 'signedOut', user: session?.user ?? null });
          window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
        }).data.subscription;
        const { data } = await supabase.auth.getSession();
        if (active) setState({ status: data.session ? 'signedIn' : 'signedOut', user: data.session?.user ?? null });
      } catch {
        if (active) setState({ status: 'signedOut', user: null });
      }
    }
    start();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  return state;
}
