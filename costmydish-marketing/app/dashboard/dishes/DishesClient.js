'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadAccountCurrency, loadDishes } from '@/lib/dashboard-data';
import { useDashboardUser } from '../DashboardGate';
import { DishRow } from '../DishRow';
import { EmptyState, ErrorState, ListSkeleton, PageBody, PageHeader, SearchInput, primaryButtonClass } from '../ui';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'on_target', label: 'On target' },
  { key: 'over_target', label: 'Over target' },
];

export function DishesClient() {
  const user = useDashboardUser();
  const [dishes, setDishes] = useState(null);
  const [symbol, setSymbol] = useState('$');
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      const [list, currency] = await Promise.all([loadDishes(), loadAccountCurrency(user.id)]);
      setSymbol(currency.symbol);
      setDishes(list);
    } catch {
      setLoadError(true);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads remote data once the user is known
    refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (dishes ?? []).filter((dish) => {
      if (query && !dish.name.toLowerCase().includes(query)) return false;
      return filter === 'all' || dish.cost.listStatus === filter;
    });
  }, [dishes, search, filter]);

  return (
    <PageBody>
      <PageHeader
        title="Dishes"
        subtitle={dishes ? `${dishes.length} dish${dishes.length === 1 ? '' : 'es'} · Your food cost results` : 'Your food cost results'}
        action={<Link href="/dashboard/calculate" className={primaryButtonClass}>Calculate food cost</Link>}
      />

      <div className="mt-6">
        {loadError && !dishes ? (
          <ErrorState message="Couldn’t load your dishes." onRetry={refresh} />
        ) : !dishes ? (
          <ListSkeleton />
        ) : dishes.length === 0 ? (
          <EmptyState
            title="No food costs yet"
            description="Calculate food cost for your first dish to see cost, food cost % and profit."
            actionLabel="Calculate food cost"
            actionHref="/dashboard/calculate"
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput value={search} onChange={setSearch} placeholder="Search dishes…" />
              <div className="flex gap-2" role="group" aria-label="Filter dishes">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    aria-pressed={filter === item.key}
                    className={`min-h-11 flex-1 whitespace-nowrap rounded-xl border px-4 text-sm font-semibold transition sm:flex-none ${
                      filter === item.key ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-secondary hover:text-text'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No dishes match"
                  description={
                    search.trim()
                      ? `No dishes matching “${search.trim()}”.`
                      : filter === 'on_target'
                        ? 'No dishes are on target right now.'
                        : 'No dishes are over target right now.'
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {visible.map((dish) => <DishRow key={dish.id} dish={dish} symbol={symbol} />)}
              </ul>
            )}
          </>
        )}
      </div>
    </PageBody>
  );
}
