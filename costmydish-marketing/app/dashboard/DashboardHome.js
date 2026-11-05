'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { loadHome, worstFormat } from '@/lib/dashboard-data';
import { readDishDraft } from '@/lib/dish-draft';
import { formatMoney, formatPercent } from '@/lib/food-cost';
import { FREE_DISH_LIMIT, FREE_INGREDIENT_LIMIT } from '@/lib/plans';
import { useDashboardUser } from './DashboardGate';
import { useGetApp } from './DashboardShell';
import { DishRow } from './DishRow';
import { ErrorState, ListSkeleton, PageBody, primaryButtonClass, secondaryButtonClass } from './ui';

const RECENT_COUNT = 5;

function StatCard({ label, value, detail, href, tone = 'default' }) {
  const valueClass = tone === 'danger' ? 'text-red-600' : 'text-primary';
  return (
    <Link href={href} className="block rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/30 hover:shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${valueClass}`}>{value}</p>
      {detail ? <div className="mt-1 text-xs text-text-secondary">{detail}</div> : null}
    </Link>
  );
}

function AttentionRow({ dish, format, symbol }) {
  const over = format.foodCostPercent - format.target;
  const multiple = dish.cost.formats.length > 1;
  return (
    <li>
      <Link
        href={`/dashboard/dishes/view?id=${dish.id}`}
        className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-4 transition hover:border-red-300"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-text">{dish.name}</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Target {formatPercent(format.target)}
            {multiple && format.price != null ? ` · ${formatMoney(format.price, symbol)} format` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
            {format.status === 'loss' ? 'Selling at a loss' : `${formatPercent(format.foodCostPercent)} food cost`}
          </span>
          {over > 0 ? <span className="text-xs text-red-600">+{formatPercent(over)} over</span> : null}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-red-500" aria-hidden>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

function FirstDish() {
  return (
    <section className="mt-8 rounded-3xl border border-border bg-surface p-8 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Get started</p>
      <h2 className="mt-2 text-2xl font-extrabold text-text">Cost your first dish</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        Add what you paid for each ingredient and how much the dish uses. You’ll see the cost per serving, a suggested
        selling price and your food cost % — it takes about 2 minutes.
      </p>
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ['1', 'Name the dish', 'and how many it makes'],
          ['2', 'Add ingredients', 'with what you paid'],
          ['3', 'See your price', 'and food cost %'],
        ].map(([step, title, body]) => (
          <li key={step} className="flex items-start gap-3 rounded-2xl bg-surface-alt p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{step}</span>
            <span>
              <span className="block text-sm font-bold text-text">{title}</span>
              <span className="block text-xs text-text-secondary">{body}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/calculate" className={primaryButtonClass}>Calculate food cost</Link>
        <Link href="/dashboard/library" className={secondaryButtonClass}>Add ingredients first</Link>
      </div>
    </section>
  );
}

export function DashboardHome() {
  const user = useDashboardUser();
  const router = useRouter();
  const openGetApp = useGetApp();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === '1';

  const [home, setHome] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [draftName, setDraftName] = useState(null);

  const refresh = useCallback(async () => {
    setLoadError(false);
    setDraftName(readDishDraft()?.dish.name.trim() ?? null);
    try {
      setHome(await loadHome(user.id));
    } catch {
      setLoadError(true);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads remote data once the user is known
    refresh();
  }, [refresh]);

  const firstName = (user.user_metadata?.full_name ?? '').trim().split(/\s+/)[0];
  const dishes = home?.dishes ?? [];
  const attention = dishes.map((dish) => ({ dish, format: worstFormat(dish) })).filter((item) => item.format);
  const hasDishes = dishes.length > 0;

  return (
    <PageBody>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text sm:text-3xl">{firstName ? `Hi, ${firstName}` : 'Welcome'}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {hasDishes ? 'A quick look at your recent food costs' : 'Work out what your dishes cost and what to charge'}
          </p>
        </div>
        {hasDishes ? <Link href="/dashboard/calculate" className={primaryButtonClass}>Calculate food cost</Link> : null}
      </div>

      {isWelcome ? (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex sm:items-start sm:justify-between sm:gap-6">
          <div>
            <p className="font-bold text-primary-dark">Your account is ready</p>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              Everything you save here also shows up in the CostMyDish app — sign in there with{' '}
              <strong className="text-text">{user.email}</strong>.{' '}
              <button type="button" onClick={openGetApp} className="font-semibold text-primary hover:underline">Get the app</button>
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="mt-3 min-h-11 shrink-0 text-sm font-semibold text-primary hover:underline sm:mt-0"
          >
            Got it
          </button>
        </div>
      ) : null}

      {draftName != null ? (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-surface p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="font-bold text-text">{draftName ? `“${draftName}” is waiting to be saved` : 'Your dish is waiting to be saved'}</p>
            <p className="mt-1 text-sm text-text-secondary">You calculated it before signing in. Save it to your account now.</p>
          </div>
          <Link href="/dashboard/calculate" className={`${primaryButtonClass} mt-3 shrink-0 sm:mt-0`}>Save dish</Link>
        </div>
      ) : null}

      {loadError && !home ? (
        <div className="mt-8">
          <ErrorState message="Couldn’t load your dishes." onRetry={refresh} />
        </div>
      ) : !home ? (
        <div className="mt-8 space-y-6" aria-busy="true" aria-label="Loading">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl border border-border bg-surface" />)}
          </div>
          <ListSkeleton rows={4} />
        </div>
      ) : !hasDishes ? (
        <FirstDish />
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total dishes"
              href="/dashboard/dishes"
              value={dishes.length}
              detail={home.isFree ? `of ${FREE_DISH_LIMIT} on the free plan` : null}
            />
            <StatCard
              label="Over target"
              href="/dashboard/dishes"
              value={attention.length}
              tone={attention.length > 0 ? 'danger' : 'default'}
              detail={attention.length === 0 ? <span className="font-bold text-emerald-600">All good ✓</span> : 'Need a price check'}
            />
            <StatCard
              label="Library"
              href="/dashboard/library"
              value={home.ingredientCount}
              detail={home.isFree ? `of ${FREE_INGREDIENT_LIMIT} ingredients on the free plan` : 'ingredients'}
            />
            <StatCard
              label="Plan"
              href="/dashboard/settings"
              value={home.isFree ? 'Free' : 'Hobbyist'}
              detail={home.isFree ? 'See usage and upgrade' : 'Unlimited dishes'}
            />
          </div>

          {attention.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-lg font-extrabold text-red-600">Needs attention</h2>
              <p className="mt-0.5 text-sm text-text-secondary">These dishes cost more than your target. Raise the price or trim the cost.</p>
              <ul className="mt-3 space-y-3">
                {attention.map(({ dish, format }) => (
                  <AttentionRow key={dish.id} dish={dish} format={format} symbol={home.symbol} />
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-lg font-extrabold text-text">Recent food costs</h2>
              {dishes.length > RECENT_COUNT ? (
                <Link href="/dashboard/dishes" className="text-sm font-semibold text-primary hover:underline">
                  View all {dishes.length}
                </Link>
              ) : null}
            </div>
            <ul className="mt-3 space-y-3">
              {dishes.slice(0, RECENT_COUNT).map((dish) => <DishRow key={dish.id} dish={dish} symbol={home.symbol} />)}
            </ul>
            <Link
              href="/dashboard/calculate"
              className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-primary bg-primary/5 text-sm font-bold text-primary transition hover:bg-primary/10"
            >
              Calculate another food cost
            </Link>
          </section>
        </>
      )}
    </PageBody>
  );
}
