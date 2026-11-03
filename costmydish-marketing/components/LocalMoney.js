'use client';

import { getCurrency, localPrice } from '@/lib/currency';
import { formatMoney } from '@/lib/food-cost';
import { LOCAL_ANSWERS } from '@/lib/faqs';
import { pizzaExample } from '@/lib/presets';
import { useCurrencyCode } from '@/lib/use-currency';

/** FAQ answer text; answers marked `localAnswer` show their example in the visitor's currency. */
export function FaqAnswerText({ item }) {
  const code = useCurrencyCode();
  const build = item.localAnswer ? LOCAL_ANSWERS[item.localAnswer] : null;
  return build ? build(code) : item.a;
}

function usePizza() {
  const code = useCurrencyCode();
  const { symbol } = getCurrency(code);
  return { pizza: pizzaExample(code), money: (value) => formatMoney(value, symbol) };
}

export function HeroStats() {
  const { pizza, money } = usePizza();
  return (
    <div className="mt-6 grid grid-cols-3 gap-3 text-center">
      {[
        { label: 'Food cost %', value: '30%' },
        { label: 'Profit / slice', value: money(pizza.sliceProfit) },
        { label: 'Total cost', value: money(pizza.totalCost) },
      ].map((stat) => (
        <div key={stat.label} className="rounded-xl bg-surface-alt px-2 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{stat.label}</p>
          <p className="mt-1 text-sm font-bold text-primary">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export function PizzaExampleText() {
  const { pizza, money } = usePizza();
  const percent = (value) => `${Math.round(value)}%`;
  return (
    <>
      Cost flour, sauce, mozzarella, and olive oil → total recipe cost {money(pizza.totalCost)}. Sell 8 slices at {money(pizza.slicePrice)} →{' '}
      {percent(pizza.slicePercent)} food cost, {money(pizza.sliceProfit)} profit per slice. Sell a whole pizza at {money(pizza.wholePrice)} →{' '}
      {percent(pizza.wholePercent)} food cost, {money(pizza.wholeProfit)} profit. One recipe, two ways to sell, full clarity.
    </>
  );
}

/** "Flour at $3.99 for 2 kg, milk at $1.20 a litre" in the visitor's currency. */
export function IngredientPriceExample() {
  const code = useCurrencyCode();
  const { symbol } = getCurrency(code);
  return `Flour at ${formatMoney(localPrice(3.99, code), symbol)} for 2 kg, milk at ${formatMoney(localPrice(1.2, code), symbol)} a litre`;
}
