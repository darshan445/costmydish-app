'use client';

import { useMemo } from 'react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { BASE_CURRENCY, getCurrency } from '@/lib/currency';
import { formatMoney } from '@/lib/food-cost';
import { computePricingExample, pluralUnit, pricingItemFaqs } from '@/lib/pricing-items';
import { useCurrencyCode } from '@/lib/use-currency';

function useExample(item) {
  const code = useCurrencyCode();
  const example = useMemo(() => computePricingExample(item, code), [item, code]);
  const { symbol } = getCurrency(code);
  return { code, example, money: (value) => formatMoney(value, symbol) };
}

export function PricingStats({ item }) {
  const { example, money } = useExample(item);
  const unit = item.recipe.unitWord;
  return (
    <div className="mt-8 grid grid-cols-3 gap-3 text-center">
      {[
        { label: 'Example batch cost', value: money(example.totalCost) },
        { label: `Cost per ${unit}`, value: money(example.costPerUnit) },
        { label: `Price at ${example.target}% food cost`, value: money(example.suggestedPrice) },
      ].map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-surface px-3 py-4">
          <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
          <p className="mt-1 text-xl font-extrabold text-primary">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export function PricingWorkedExample({ item }) {
  const { code, example, money } = useExample(item);
  const { recipe } = item;
  const unit = recipe.unitWord;
  const units = recipe.makes === 1 ? unit : pluralUnit(unit);
  const converted = code !== (item.currency ?? BASE_CURRENCY);

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-text">Worked example: {recipe.dishName}</h2>
        <CurrencySelect label="Show in" />
      </div>
      <p className="mt-4 leading-relaxed text-text-secondary">
        This batch makes {recipe.makes} {units}. Here is where the money goes, most expensive first:
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-text-secondary">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Ingredient</th>
              <th className="px-4 py-2.5 font-semibold">Bought</th>
              <th className="px-4 py-2.5 font-semibold">Used</th>
              <th className="px-4 py-2.5 text-right font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {example.lines.map((line) => (
              <tr key={line.name} className="border-t border-border">
                <td className="px-4 py-2.5 text-text">{line.name}</td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {money(line.price)} / {line.buyQty === '1' ? '' : `${line.buyQty} `}{line.buyUnit}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">
                  {line.useQty} {line.useUnit}
                  {line.wastePercent ? ` (+${line.wastePercent}% waste)` : ''}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-text">{money(line.cost)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-surface-alt font-bold">
              <td className="px-4 py-2.5 text-text" colSpan={3}>Total for {recipe.makes} {units}</td>
              <td className="px-4 py-2.5 text-right text-text">{money(example.totalCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {converted ? (
        <p className="mt-2 text-xs text-text-secondary">
          Example prices are typical local prices in {code} ({getCurrency(code).symbol}), not live exchange rates. Put your own prices in the calculator above.
        </p>
      ) : null}
      <p className="mt-4 leading-relaxed text-text-secondary">
        That is <strong className="text-text">{money(example.costPerUnit)} per {unit}</strong>. At a {example.target}% food cost the
        price should be at least <strong className="text-text">{money(example.suggestedPrice)}</strong>. Across the usual {example.range} range
        for {example.targetLabel}, that is {money(example.priceAtHighFoodCost)} (at {example.highPercent}%) to{' '}
        {money(example.priceAtLowFoodCost)} (at {example.lowPercent}%) per {unit} — before your time and overheads.
      </p>
    </section>
  );
}

export function PricingFaqList({ item }) {
  const code = useCurrencyCode();
  const faqs = useMemo(() => pricingItemFaqs(item, code), [item, code]);
  return (
    <div className="mt-8 space-y-4">
      {faqs.map((faq) => (
        <details key={faq.q} className="group rounded-xl border border-border bg-surface px-5 py-4">
          <summary className="cursor-pointer list-none font-semibold text-text marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-4">
              {faq.q}
              <span className="shrink-0 text-primary transition group-open:rotate-45">+</span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
