'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { hasSavedSession } from '@/components/HeaderAccountLink';
import { saveDishDraft } from '@/lib/dish-draft';

const buttonClass =
  'block w-full rounded-full bg-primary px-5 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass =
  'block w-full rounded-full border border-border bg-surface px-5 py-3 text-center text-sm font-bold text-text transition hover:border-primary/30';

const AFTER_AUTH_PATH = '/dashboard/calculate';

// Supabase only downloads once a signed-in visitor taps Save, so public pages stay as light as before
const SaveDishPanel = dynamic(() => import('@/components/SaveDishPanel').then((mod) => mod.SaveDishPanel), {
  ssr: false,
  loading: () => (
    <div className="mt-5 rounded-xl bg-primary/5 p-4">
      <button type="button" disabled className={buttonClass}>Checking…</button>
    </div>
  ),
});

/**
 * Save button for the public calculators. Signed in: saves to the account right here.
 * Signed out: keeps the dish in this browser and asks them to create an account or sign in;
 * /dashboard/calculate then opens the dish and saves it.
 */
export function PublicSaveDish({ canSave, dish, currencyCode }) {
  const pathname = usePathname();
  const [mode, setMode] = useState('idle');
  const [promptName, setPromptName] = useState('');

  function askToSignIn() {
    saveDishDraft(dish, currencyCode, pathname);
    setPromptName(dish.name.trim());
    setMode('prompt');
  }

  function handleSave() {
    if (hasSavedSession()) setMode('account');
    else askToSignIn();
  }

  if (mode === 'account') {
    return (
      <SaveDishPanel
        canSave={canSave}
        dish={dish}
        currencyCode={currencyCode}
        autoStart
        onSignedOut={askToSignIn}
        onReset={() => setMode('idle')}
        resetLabel="Done"
      />
    );
  }

  if (mode === 'prompt') {
    const next = encodeURIComponent(AFTER_AUTH_PATH);
    return (
      <div className="mt-5 rounded-xl border border-primary/20 bg-surface p-4 shadow-sm" role="dialog" aria-labelledby="save-dish-title">
        <p id="save-dish-title" className="text-sm font-bold text-text">
          {promptName ? `Save “${promptName}” to a free account` : 'Save this dish to a free account'}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          We’ll keep this dish on this device while you sign up, then save it for you. One account works on the web,
          iPhone and Android.
        </p>
        <div className="mt-4 space-y-2">
          <Link href={`/signup?next=${next}`} className={buttonClass}>
            Create free account
          </Link>
          <Link href={`/login?next=${next}`} className={secondaryClass}>
            I have an account — sign in
          </Link>
        </div>
        <button type="button" onClick={() => setMode('idle')} className="mt-3 text-xs font-semibold text-text-secondary underline">
          Not now
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl bg-primary/5 p-4">
      <button type="button" onClick={handleSave} disabled={!canSave} className={buttonClass}>
        Save this dish
      </button>
      <p className="mt-3 text-xs leading-relaxed text-text-secondary">
        {canSave
          ? 'Free account — your dishes are on the web and in the app. When butter goes up, every dish that uses it updates.'
          : 'Fill in the yield and every ingredient’s name, price, quantities and units to save.'}
      </p>
      <a href="#download" className="mt-2 inline-block text-xs font-semibold text-primary underline">
        Or get the free app
      </a>
    </div>
  );
}
