'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DashboardError, deleteDish, loadAccountCurrency, loadDish } from '@/lib/dashboard-data';
import { formatMoney, formatPercent } from '@/lib/food-cost';
import { useDashboardUser } from '../../DashboardGate';
import {
  ConfirmDialog,
  ErrorState,
  ListSkeleton,
  PageBody,
  StatusPill,
  primaryButtonClass,
  secondaryButtonClass,
  unitLabel,
  unitWord,
  yieldText,
} from '../../ui';

function Stat({ label, value, tone, hint }) {
  const toneClass = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : 'text-text';
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}

function quantityText(quantity) {
  return Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(3)));
}

export function DishDetailClient() {
  const user = useDashboardUser();
  const router = useRouter();
  const id = useSearchParams().get('id');
  const [dish, setDish] = useState(null);
  const [symbol, setSymbol] = useState('$');
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const refresh = useCallback(async () => {
    setError(null);
    if (!id) {
      setError({ code: 'not_found' });
      return;
    }
    try {
      const [loaded, currency] = await Promise.all([loadDish(id), loadAccountCurrency(user.id)]);
      setSymbol(currency.symbol);
      setDish(loaded);
    } catch (loadError) {
      setError({ code: loadError instanceof DashboardError ? loadError.code : 'failed' });
    }
  }, [id, user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads remote data once the user is known
    refresh();
  }, [refresh]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteDish(dish.id);
      router.replace('/dashboard/dishes');
    } catch (failure) {
      setDeleteError(failure instanceof DashboardError ? failure.message : 'Couldn’t delete this dish. Please try again.');
      setDeleting(false);
    }
  }

  const backLink = (
    <Link href="/dashboard/dishes" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-secondary hover:text-primary">
      ← All dishes
    </Link>
  );

  if (error) {
    return (
      <PageBody>
        {backLink}
        <div className="mt-4">
          {error.code === 'not_found'
            ? <ErrorState message="This dish doesn’t exist or was deleted." />
            : <ErrorState message="Couldn’t load this dish." onRetry={refresh} />}
        </div>
      </PageBody>
    );
  }

  if (!dish) {
    return (
      <PageBody>
        {backLink}
        <div className="mt-4"><ListSkeleton rows={4} /></div>
      </PageBody>
    );
  }

  const { cost } = dish;
  const { main } = cost;
  const word = unitWord(main.unitName, main.unitLabel);
  const missingCosts = cost.lines.some((line) => line.cost == null);

  return (
    <PageBody>
      {backLink}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text sm:text-3xl">{dish.name}</h1>
            <StatusPill status={main.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Makes {yieldText(main.quantity, main.unitName, main.unitLabel)} · Target food cost {formatPercent(cost.target)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/dishes/edit?id=${dish.id}`} className={primaryButtonClass}>
            Edit dish
          </Link>
          <button type="button" onClick={() => setConfirming(true)} className={`${secondaryButtonClass} text-red-600`}>
            Delete
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total cost" value={formatMoney(cost.totalCost, symbol)} hint="All ingredients" />
        <Stat label={`Cost per ${word}`} value={formatMoney(main.costPerUnit, symbol)} />
        <Stat
          label={main.price != null ? `Price per ${word}` : 'Suggested price'}
          value={formatMoney(main.price ?? main.suggestedPrice, symbol)}
          hint={main.price != null ? `Suggested ${formatMoney(main.suggestedPrice, symbol)}` : `At ${formatPercent(cost.target)} food cost`}
        />
        <Stat
          label="Food cost"
          value={formatPercent(main.foodCostPercent)}
          tone={main.profit != null ? (main.profit < 0 ? 'bad' : 'good') : undefined}
          hint={main.profit != null ? `Profit ${formatMoney(main.profit, symbol)} per ${word}` : 'Add a price to see profit'}
        />
      </div>

      {cost.formats.length > 1 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-text">Ways you sell it</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Format</th>
                  <th className="px-4 py-3 text-right font-semibold">Cost each</th>
                  <th className="px-4 py-3 text-right font-semibold">Price</th>
                  <th className="px-4 py-3 text-right font-semibold">Food cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {cost.formats.map((format) => (
                  <tr key={format.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">
                      {yieldText(format.quantity, format.unitName, format.unitLabel)}
                      {format.isDefault ? <span className="ml-2 text-xs text-text-secondary">(main)</span> : null}
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(format.costPerUnit, symbol)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(format.price, symbol)}</td>
                    <td className="px-4 py-3 text-right">{formatPercent(format.foodCostPercent)}</td>
                    <td className="px-4 py-3 text-right"><StatusPill status={format.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-text">Ingredient costs</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Ingredient</th>
                <th className="px-4 py-3 text-right font-semibold">Used</th>
                <th className="px-4 py-3 text-right font-semibold">Cost</th>
                <th className="px-4 py-3 text-right font-semibold">Share</th>
              </tr>
            </thead>
            <tbody>
              {cost.lines.map((line) => (
                <tr key={line.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-medium text-text">
                    {line.name}
                    {line.error ? <span className="mt-0.5 block text-xs font-normal text-red-600">{line.error}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">{quantityText(line.quantity)} {unitLabel(line.unit)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(line.cost, symbol)}</td>
                  <td className="px-4 py-3 text-right text-text-secondary">
                    {line.cost != null && cost.totalCost > 0 ? formatPercent((line.cost / cost.totalCost) * 100) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-bold text-text" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(cost.totalCost, symbol)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {missingCosts ? (
          <p className="mt-2 text-xs text-amber-700">Some ingredients have no cost yet, so the total may be low. Edit the dish to fix them.</p>
        ) : null}
        <p className="mt-3 text-xs text-text-secondary">
          Change a buy price in your <Link href="/dashboard/library" className="font-semibold text-primary underline">Library</Link> and
          this dish updates. To change quantities or ingredients,{' '}
          <Link href={`/dashboard/dishes/edit?id=${dish.id}`} className="font-semibold text-primary underline">edit the dish</Link>.
        </p>
      </section>

      {confirming ? (
        <ConfirmDialog
          title="Delete dish"
          message={`Delete “${dish.name}”? This removes it from the web and the app. Your Library ingredients stay.`}
          confirmLabel="Delete"
          busy={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onClose={() => {
            setConfirming(false);
            setDeleteError('');
          }}
        />
      ) : null}
    </PageBody>
  );
}
