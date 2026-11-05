'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FREE_DISH_LIMIT, FREE_INGREDIENT_LIMIT, UPGRADE_HINT, UPGRADE_PATH, WEB_BILLING_ENABLED } from '@/lib/plans';
import { DishSaveError, previewDishSave, saveDish } from '@/lib/save-dish';

const buttonClass =
  'block w-full rounded-full bg-primary px-5 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50';
const secondaryClass =
  'block w-full rounded-full border border-border bg-surface px-5 py-3 text-center text-sm font-bold text-text transition hover:border-primary/30';

function limitMessage(code) {
  return code === 'dish_limit'
    ? `You have reached the ${FREE_DISH_LIMIT} dishes included in the free plan.`
    : `Saving this dish would go over the ${FREE_INGREDIENT_LIMIT} ingredients included in the free plan.`;
}

/**
 * Save button for a signed-in user: checks the free limits, the account currency and the Library
 * for name matches, asks about Library price changes, then saves the dish exactly as the app would.
 *
 * currencyCode: currency the prices were typed in; the user is warned when the account uses another.
 * autoStart: start saving on mount (the visitor already tapped Save before signing in).
 * onSignedOut: called instead of showing an error when the saved session turns out to be gone.
 */
export function SaveDishPanel({
  canSave,
  dish,
  currencyCode,
  autoStart = false,
  onSaved,
  onSignedOut,
  onReset,
  resetLabel = 'Calculate another dish',
  recipeId = null,
  extraFormats = [],
  appStoreHref,
  playStoreHref,
}) {
  const editing = Boolean(recipeId);
  const [step, setStep] = useState('idle');
  const [snapshot, setSnapshot] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [updateIds, setUpdateIds] = useState([]);
  const [accountCurrency, setAccountCurrency] = useState('');
  const [message, setMessage] = useState('');
  const [limitCode, setLimitCode] = useState(null);
  const [savedName, setSavedName] = useState('');
  const [savedId, setSavedId] = useState(null);
  const started = useRef(false);

  function handleError(error, fallback) {
    if (error instanceof DishSaveError && error.code === 'not_signed_in' && onSignedOut) {
      onSignedOut();
      return;
    }
    if (error instanceof DishSaveError && (error.code === 'dish_limit' || error.code === 'ingredient_limit')) {
      setLimitCode(error.code);
      setStep('limit');
      return;
    }
    setMessage(error instanceof DishSaveError ? error.message : fallback);
    setStep('error');
  }

  async function runSave(current, ids) {
    setStep('saving');
    try {
      const saved = await saveDish(current, { updateLibrary: ids, recipeId, extraFormats });
      setSavedId(saved.recipeId ?? null);
      setSavedName(current.name.trim() || 'Your dish');
      setStep('saved');
      onSaved?.();
    } catch (error) {
      handleError(error, 'Couldn’t save this dish. Please try again.');
    }
  }

  function reviewOrSave(current, different) {
    if (different.length > 0) {
      setConflicts(different);
      setUpdateIds([]);
      setStep('review');
      return;
    }
    runSave(current, []);
  }

  async function handleSave() {
    const current = dish;
    setSnapshot(current);
    setMessage('');
    setStep('checking');
    try {
      const preview = await previewDishSave(current, { recipeId });
      if (preview.dishLimitReached || preview.ingredientLimitReached) {
        setLimitCode(preview.dishLimitReached ? 'dish_limit' : 'ingredient_limit');
        setStep('limit');
        return;
      }
      const different = preview.matches.filter((match) => !match.samePrice);
      if (currencyCode && preview.currency && preview.currency !== currencyCode) {
        setConflicts(different);
        setAccountCurrency(preview.currency);
        setStep('currency');
        return;
      }
      reviewOrSave(current, different);
    } catch (error) {
      handleError(error, 'Couldn’t check your account. Please try again.');
    }
  }

  useEffect(() => {
    if (!autoStart || !canSave || started.current) return;
    started.current = true;
    handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, with the dish as it was when saving was requested
  }, []);

  function toggleUpdate(id) {
    setUpdateIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  if (step === 'saved') {
    return (
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4" role="status">
        <p className="text-sm font-bold text-primary-dark">{editing ? `Saved changes to “${savedName}”` : `Saved “${savedName}”`}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {editing
            ? 'The app shows the same changes. New ingredients were added to your Library.'
            : 'It’s in your account now — open the CostMyDish app to see it there too. New ingredients were added to your Library.'}
        </p>
        <div className="mt-4 space-y-2">
          {onReset ? (
            <button type="button" onClick={onReset} className={buttonClass}>
              {resetLabel}
            </button>
          ) : null}
          <Link href={savedId ? `/dashboard/dishes/view?id=${savedId}` : '/dashboard/dishes'} className={secondaryClass}>
            View dish
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'limit') {
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
        <p className="text-sm font-bold text-amber-800">{limitMessage(limitCode)}</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
          {UPGRADE_HINT} Your account is the same on web and app.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {WEB_BILLING_ENABLED ? (
            <a href={UPGRADE_PATH} target="_blank" rel="noopener" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm">
              Upgrade to Hobbyist
            </a>
          ) : null}
          <a href={appStoreHref} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-xs font-bold text-text shadow-sm">
            App Store
          </a>
          <a href={playStoreHref} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-xs font-bold text-text shadow-sm">
            Google Play
          </a>
        </div>
        <button type="button" onClick={() => setStep('idle')} className="mt-3 text-xs font-semibold text-amber-800 underline">
          Back
        </button>
      </div>
    );
  }

  if (step === 'currency') {
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
        <p className="text-sm font-bold text-amber-800">Your account uses {accountCurrency}</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
          These prices were entered in {currencyCode}. Saving keeps the numbers as they are and shows them in{' '}
          {accountCurrency} — prices aren’t converted.
        </p>
        <div className="mt-4 space-y-2">
          <button type="button" onClick={() => reviewOrSave(snapshot, conflicts)} className={buttonClass}>
            Save anyway
          </button>
          <button type="button" onClick={() => setStep('idle')} className={secondaryClass}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="mt-5 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-bold text-text">Already in your Library</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          These ingredients are saved with a different price. The dish will use your Library price unless you update it.
          Updating changes every dish that uses that ingredient.
        </p>
        <ul className="mt-3 space-y-2">
          {conflicts.map((item) => (
            <li key={item.libraryId}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={updateIds.includes(item.libraryId)}
                  onChange={() => toggleUpdate(item.libraryId)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span>
                  Update <strong>{item.name}</strong> to the price entered here
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <button type="button" onClick={() => runSave(snapshot, updateIds)} className={buttonClass}>
            Save dish
          </button>
          <button type="button" onClick={() => setStep('idle')} className={secondaryClass}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const busy = step === 'checking' || step === 'saving';
  return (
    <div className="mt-5 rounded-xl bg-primary/5 p-4">
      <button type="button" onClick={handleSave} disabled={!canSave || busy} className={buttonClass}>
        {step === 'checking' ? 'Checking…' : step === 'saving' ? 'Saving…' : editing ? 'Save changes' : 'Save dish'}
      </button>
      {step === 'error' && message ? (
        <p className="mt-3 text-xs font-semibold text-red-600" role="alert">{message}</p>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-text-secondary">
          {canSave
            ? editing
              ? 'Updates this dish on the web and in the CostMyDish app.'
              : 'Saves to your account — it shows up in the CostMyDish app too.'
            : 'Fill in the yield and every ingredient’s name, price, quantities and units to save.'}
        </p>
      )}
    </div>
  );
}
