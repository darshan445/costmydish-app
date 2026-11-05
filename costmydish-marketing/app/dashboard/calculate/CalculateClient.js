'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthLoading } from '@/components/AuthShell';
import { FoodCostCalculator } from '@/components/FoodCostCalculator';
import { SaveDishPanel } from '@/components/SaveDishPanel';
import { isCurrencyCode } from '@/lib/currency';
import { loadLibrary } from '@/lib/dashboard-data';
import { clearDishDraft, readDishDraft } from '@/lib/dish-draft';
import { getSupabase } from '@/lib/supabase';
import { useDashboardUser } from '../DashboardGate';

async function loadSettings(userId) {
  const { data, error } = await getSupabase()
    .from('user_settings')
    .select('currency, default_food_cost_percent')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const target = Number(data?.default_food_cost_percent);
  return {
    currency: isCurrencyCode(data?.currency) ? data.currency : 'USD',
    target: target > 0 && target <= 100 ? target : 30,
  };
}

function DraftNotice({ draft, accountCurrency, onDiscard }) {
  const otherCurrency = draft.currencyCode && draft.currencyCode !== accountCurrency;
  return (
    <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
      <p className="font-bold text-primary-dark">
        {otherCurrency ? 'Your dish is ready to save' : 'Saving the dish you calculated'}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
        {otherCurrency
          ? `You entered these prices in ${draft.currencyCode}, but your account uses ${accountCurrency}. Prices aren’t converted — check them, then tap Save dish.`
          : 'We kept it while you signed in. You can change anything and save again.'}
      </p>
      <button type="button" onClick={onDiscard} className="mt-2 text-xs font-semibold text-text-secondary underline">
        Discard and start a new dish
      </button>
    </div>
  );
}

export function CalculateClient({ appStoreHref, playStoreHref }) {
  const user = useDashboardUser();
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [library, setLibrary] = useState([]);

  const reloadLibrary = useCallback(async () => {
    try {
      setLibrary((await loadLibrary(user.id)).items);
    } catch {
      // Suggestions are optional; saving still matches the Library by name
    }
  }, [user.id]);

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      const [loaded] = await Promise.all([loadSettings(user.id), reloadLibrary()]);
      setDraft(readDishDraft());
      setSettings(loaded);
    } catch {
      setLoadError(true);
    }
  }, [user.id, reloadLibrary]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads remote data once the user is known
    refresh();
  }, [refresh]);

  const startOver = () => {
    clearDishDraft();
    setDraft(null);
    setResetKey((key) => key + 1);
  };

  const sameCurrencyDraft = draft && (!draft.currencyCode || draft.currencyCode === settings?.currency);

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-extrabold text-text sm:text-3xl">Calculate food cost</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Add what you paid and how much the dish uses. Save it to your account and it appears in the app too.
        </p>

        <div className="mt-6">
          {loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">
              Could not load your settings.{' '}
              <button type="button" onClick={refresh} className="font-semibold underline">
                Try again
              </button>
            </div>
          ) : settings ? (
            <>
              {draft ? <DraftNotice draft={draft} accountCurrency={settings.currency} onDiscard={startOver} /> : null}
              <FoodCostCalculator
                key={resetKey}
                blank
                initial={draft?.dish}
                title="New dish"
                currencyCode={settings.currency}
                defaultTarget={settings.target}
                library={library}
                renderSave={({ canSave, dish }) => (
                  <SaveDishPanel
                    canSave={canSave}
                    dish={dish}
                    autoStart={Boolean(sameCurrencyDraft)}
                    onSaved={() => {
                      clearDishDraft();
                      setDraft(null);
                      reloadLibrary();
                    }}
                    onReset={startOver}
                    appStoreHref={appStoreHref}
                    playStoreHref={playStoreHref}
                  />
                )}
              />
            </>
          ) : (
            <AuthLoading label="Loading…" />
          )}
        </div>
      </div>
    </div>
  );
}
