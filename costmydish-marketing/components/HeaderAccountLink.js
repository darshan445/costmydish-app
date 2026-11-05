'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

function storageKey() {
  try {
    const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
}

const STORAGE_KEY = storageKey();

export const AUTH_CHANGE_EVENT = 'cmd-auth-change';

function subscribe(onChange) {
  window.addEventListener('storage', onChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
  };
}

/** Checks for a saved Supabase session without loading the Supabase client on marketing pages. */
export function hasSavedSession() {
  if (!STORAGE_KEY) return false;
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function HeaderAccountLink() {
  const signedIn = useSyncExternalStore(subscribe, hasSavedSession, () => false);
  return (
    <Link
      href={signedIn ? '/dashboard' : '/login'}
      className="whitespace-nowrap text-sm font-semibold text-text-secondary transition hover:text-primary"
    >
      {signedIn ? 'Dashboard' : 'Sign in'}
    </Link>
  );
}
