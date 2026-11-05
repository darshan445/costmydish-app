'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { FoodCostCalculator } from '@/components/FoodCostCalculator';
import { SaveDishPanel } from '@/components/SaveDishPanel';
import { DashboardError, loadAccountCurrency, loadDish, loadLibrary } from '@/lib/dashboard-data';
import { libraryRowFields } from '@/lib/library-match';
import { useDashboardUser } from '../../DashboardGate';
import { ErrorState, ListSkeleton, PageBody } from '../../ui';

/** A saved dish in the calculator's start shape, plus the extra selling formats to keep. */
function toEditorDish(dish) {
  const [main, ...others] = dish.cost.formats;
  const rows = (dish.recipe_ingredients ?? []).filter((row) => row.ingredient);
  return {
    initial: {
      name: dish.name,
      yieldQty: main ? String(main.quantity) : '1',
      yieldUnit: main?.unitName ?? 'piece',
      targetPercent: String(dish.cost.target),
      sellingPrice: main?.price != null ? String(main.price) : '',
      ingredients: rows.map((row) => ({
        ...libraryRowFields(row.ingredient),
        useQty: String(Number(row.quantity)),
        useUnit: row.unit,
      })),
    },
    extraFormats: others.map((format) => ({ unitName: format.unitName, unitQuantity: format.quantity, sellingPrice: format.price })),
    droppedCount: (dish.recipe_ingredients ?? []).length - rows.length,
  };
}

export function EditDishClient({ appStoreHref, playStoreHref }) {
  const user = useDashboardUser();
  const id = useSearchParams().get('id');
  const [state, setState] = useState(null);
  const [library, setLibrary] = useState([]);
  const [error, setError] = useState(null);
  const [panelKey, setPanelKey] = useState(0);

  const reloadLibrary = useCallback(async () => {
    try {
      setLibrary((await loadLibrary(user.id)).items);
    } catch {
      // Suggestions are optional; saving still matches the Library by name
    }
  }, [user.id]);

  const refresh = useCallback(async () => {
    setError(null);
    if (!id) {
      setError('not_found');
      return;
    }
    try {
      const [dish, currency] = await Promise.all([loadDish(id), loadAccountCurrency(user.id), reloadLibrary()]);
      setState({ dish, currency, ...toEditorDish(dish) });
    } catch (loadError) {
      setError(loadError instanceof DashboardError ? loadError.code : 'failed');
    }
  }, [id, user.id, reloadLibrary]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads remote data once the user is known
    refresh();
  }, [refresh]);

  const backHref = id ? `/dashboard/dishes/view?id=${id}` : '/dashboard/dishes';

  return (
    <PageBody>
      <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-secondary hover:text-primary">
        ← Back to dish
      </Link>
      <h1 className="mt-1 text-2xl font-extrabold text-text sm:text-3xl">Edit dish</h1>
      <p className="mt-1 text-sm text-text-secondary">Changes save to your account and show up in the app too.</p>

      <div className="mt-6">
        {error === 'not_found' ? (
          <ErrorState message="This dish doesn’t exist or was deleted." />
        ) : error ? (
          <ErrorState message="Couldn’t load this dish." onRetry={refresh} />
        ) : !state ? (
          <ListSkeleton rows={4} />
        ) : (
          <>
            {state.extraFormats.length > 0 ? (
              <p className="mb-4 rounded-xl bg-primary/5 px-4 py-3 text-xs text-primary-dark">
                This dish is also sold {state.extraFormats.length === 1 ? 'one other way' : `${state.extraFormats.length} other ways`}. Those prices stay as they are.
              </p>
            ) : null}
            {state.droppedCount > 0 ? (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {state.droppedCount === 1 ? 'One ingredient was' : `${state.droppedCount} ingredients were`} deleted from your Library, so
                {state.droppedCount === 1 ? ' it isn’t' : ' they aren’t'} shown. Saving removes {state.droppedCount === 1 ? 'it' : 'them'} from this dish.
              </p>
            ) : null}
            <FoodCostCalculator
              blank
              initial={state.initial}
              title={state.dish.name}
              currencyCode={state.currency.code}
              library={library}
              renderSave={({ canSave, dish }) => (
                <SaveDishPanel
                  key={panelKey}
                  canSave={canSave}
                  dish={dish}
                  recipeId={state.dish.id}
                  extraFormats={state.extraFormats}
                  onSaved={reloadLibrary}
                  onReset={() => setPanelKey((key) => key + 1)}
                  resetLabel="Keep editing"
                  appStoreHref={appStoreHref}
                  playStoreHref={playStoreHref}
                />
              )}
            />
          </>
        )}
      </div>
    </PageBody>
  );
}
