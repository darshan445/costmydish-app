import Link from 'next/link';
import { formatMoney, formatPercent } from '@/lib/food-cost';
import { StatusPill, unitWord, yieldText } from './ui';

export function DishRow({ dish, symbol }) {
  const { main } = dish.cost;
  const word = unitWord(main.unitName, main.unitLabel);
  const price = main.price ?? main.suggestedPrice;
  return (
    <li>
      <Link
        href={`/dashboard/dishes/view?id=${dish.id}`}
        className="grid gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/30 hover:shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-text">{dish.name}</p>
            <StatusPill status={main.status} />
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            Makes {yieldText(main.quantity, main.unitName, main.unitLabel)} · {dish.cost.lines.length} ingredient
            {dish.cost.lines.length === 1 ? '' : 's'}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-left sm:min-w-[22rem] sm:text-right">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Cost / {word}</dt>
            <dd className="mt-0.5 text-sm font-bold text-text">{formatMoney(main.costPerUnit, symbol)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{main.price != null ? 'Price' : 'Suggested'}</dt>
            <dd className="mt-0.5 text-sm font-bold text-text">{formatMoney(price, symbol)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Food cost</dt>
            <dd className="mt-0.5 text-sm font-bold text-text">{formatPercent(main.foodCostPercent)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}
