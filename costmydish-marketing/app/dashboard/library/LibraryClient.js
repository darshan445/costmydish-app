'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DashboardError,
  addIngredient,
  deleteIngredient,
  loadAccountCurrency,
  loadLibrary,
  updateIngredient,
} from '@/lib/dashboard-data';
import { formatMoney } from '@/lib/food-cost';
import { FREE_INGREDIENT_LIMIT } from '@/lib/save-dish';
import { useDashboardUser } from '../DashboardGate';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageBody,
  PageHeader,
  SearchInput,
  primaryButtonClass,
  unitLabel,
} from '../ui';
import { IngredientDialog } from './IngredientDialog';

function quantityText(value) {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

export function LibraryClient({ appStoreHref, playStoreHref }) {
  const user = useDashboardUser();
  const [library, setLibrary] = useState(null);
  const [symbol, setSymbol] = useState('$');
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showLimit, setShowLimit] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      const [loaded, currency] = await Promise.all([loadLibrary(user.id), loadAccountCurrency(user.id)]);
      setSymbol(currency.symbol);
      setLibrary(loaded);
    } catch {
      setLoadError(true);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads remote data once the user is known
    refresh();
  }, [refresh]);

  const items = useMemo(() => library?.items ?? [], [library]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase().replace(/\s+/g, ' ');
    return query ? items.filter((item) => item.name.toLowerCase().includes(query)) : items;
  }, [items, search]);
  const atLimit = Boolean(library?.isFree) && items.length >= FREE_INGREDIENT_LIMIT;

  function startAdd() {
    if (atLimit) {
      setShowLimit(true);
      return;
    }
    setEditing('new');
  }

  async function handleSave(values) {
    try {
      if (editing === 'new') await addIngredient(user.id, values);
      else await updateIngredient(editing.id, values);
    } catch (error) {
      if (error instanceof DashboardError && error.code === 'limit') {
        setEditing(null);
        setShowLimit(true);
        return;
      }
      throw new Error(error instanceof DashboardError ? error.message : 'Couldn’t save this ingredient. Please try again.');
    }
    setEditing(null);
    await refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteIngredient(pendingDelete.id);
      setPendingDelete(null);
      await refresh();
    } catch (error) {
      setDeleteError(error instanceof DashboardError ? error.message : 'Couldn’t delete this ingredient. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const subtitle = library
    ? `${items.length} item${items.length === 1 ? '' : 's'}${library.isFree ? ` of ${FREE_INGREDIENT_LIMIT} on the free plan` : ''} · Your buy prices — reuse across dishes`
    : 'Your buy prices — reuse across dishes';

  return (
    <PageBody>
      <PageHeader
        title="Library"
        subtitle={subtitle}
        action={library ? <button type="button" onClick={startAdd} className={primaryButtonClass}>Add to library</button> : null}
      />

      {showLimit ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="alert">
          <p className="text-sm font-bold text-amber-800">You have reached the {FREE_INGREDIENT_LIMIT} ingredients included in the free plan.</p>
          <p className="mt-1 text-xs text-amber-800/90">
            Upgrade to Hobbyist in the CostMyDish app for unlimited dishes and ingredients. Your account is the same on web and app.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={appStoreHref} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-xs font-bold text-text shadow-sm">App Store</a>
            <a href={playStoreHref} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-4 py-2 text-xs font-bold text-text shadow-sm">Google Play</a>
            <button type="button" onClick={() => setShowLimit(false)} className="px-2 text-xs font-semibold text-amber-800 underline">Dismiss</button>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        {loadError && !library ? (
          <ErrorState message="Couldn’t load your library." onRetry={refresh} />
        ) : !library ? (
          <ListSkeleton rows={6} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Library is empty"
            description="Add buy prices here, or save ingredients while you calculate food cost for a dish."
            actionLabel="Add to library"
            onAction={startAdd}
          />
        ) : (
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search library…" />
            {visible.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No results" description={`No items matching “${search.trim()}”.`} />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {visible.map((item) => (
                  <li key={item.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-alt"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-text">{item.name}</p>
                        <p className="mt-0.5 text-xs text-text-secondary">
                          {formatMoney(Number(item.purchase_price), symbol)} per {quantityText(item.purchase_quantity)} {unitLabel(item.purchase_unit)}
                          {Number(item.waste_percent) > 0 ? <span className="text-amber-700"> · {Number(item.waste_percent)}% waste</span> : null}
                          {item.dishCount > 0 ? ` · in ${item.dishCount} dish${item.dishCount === 1 ? '' : 'es'}` : ''}
                        </p>
                      </div>
                      <span className="hidden text-xs font-semibold text-primary sm:inline">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(item)}
                      aria-label={`Delete ${item.name}`}
                      className="flex min-h-16 min-w-14 items-center justify-center border-l border-border text-red-600 transition hover:bg-red-50"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {editing ? (
        <IngredientDialog
          ingredient={editing === 'new' ? null : editing}
          symbol={symbol}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Remove from library"
          message={
            pendingDelete.dishCount > 0
              ? `Remove “${pendingDelete.name}”? It’s used in ${pendingDelete.dishCount} dish${pendingDelete.dishCount === 1 ? '' : 'es'} — it will be taken out of them and their costs will change.`
              : `Remove “${pendingDelete.name}” from your library?`
          }
          confirmLabel="Delete"
          busy={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onClose={() => {
            setPendingDelete(null);
            setDeleteError('');
          }}
        />
      ) : null}
    </PageBody>
  );
}
