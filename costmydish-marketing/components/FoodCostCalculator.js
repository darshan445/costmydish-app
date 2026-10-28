'use client';

import { useMemo, useState } from 'react';
import {
  MARGIN_LABELS,
  UNIT_OPTIONS,
  dishSummary,
  formatMoney,
  formatPercent,
  ingredientLineCost,
  parsePositive,
} from '@/lib/food-cost';

const CURRENCIES = ['$', '£', '€', '₹', 'A$', 'C$', '₱', 'R', 'RM', 'AED'];

const PRESETS = {
  cookies: {
    dishName: 'Chocolate chip cookies',
    makes: '24',
    unitWord: 'cookie',
    rows: [
      ['All-purpose flour', '2.50', '1', 'kg', '250', 'g'],
      ['Butter', '8.00', '1', 'kg', '150', 'g'],
      ['Eggs', '0.30', '1', 'each', '2', 'each'],
      ['Sugar', '1.80', '1', 'kg', '100', 'g'],
      ['Chocolate chips', '12.00', '1', 'kg', '150', 'g'],
      ['Vanilla extract', '15.00', '1', 'l', '5', 'ml'],
      ['Baking powder', '5.00', '1', 'kg', '5', 'g'],
      ['Salt', '1.00', '1', 'kg', '3', 'g'],
    ],
  },
  cake: {
    dishName: 'Vanilla layer cake',
    makes: '12',
    unitWord: 'slice',
    rows: [
      ['Cake flour', '2.50', '1', 'kg', '300', 'g'],
      ['Sugar', '1.80', '1', 'kg', '250', 'g'],
      ['Butter', '8.00', '1', 'kg', '225', 'g'],
      ['Eggs', '3.60', '1', 'dozen', '4', 'each'],
      ['Milk', '1.20', '1', 'l', '240', 'ml'],
      ['Vanilla extract', '15.00', '1', 'l', '10', 'ml'],
      ['Icing sugar', '2.20', '1', 'kg', '400', 'g'],
      ['Cream cheese', '9.00', '1', 'kg', '225', 'g'],
    ],
  },
  pasta: {
    dishName: 'Chicken alfredo pasta',
    makes: '4',
    unitWord: 'plate',
    rows: [
      ['Fettuccine', '3.00', '500', 'g', '400', 'g'],
      ['Chicken breast', '9.00', '1', 'kg', '500', 'g', '10'],
      ['Heavy cream', '4.50', '1', 'l', '300', 'ml'],
      ['Parmesan', '22.00', '1', 'kg', '80', 'g'],
      ['Butter', '8.00', '1', 'kg', '40', 'g'],
      ['Garlic', '6.00', '1', 'kg', '15', 'g', '15'],
    ],
  },
};

let rowId = 0;
function makeRow([name = '', buyPrice = '', buyQty = '1', buyUnit = 'kg', useQty = '', useUnit = 'g', wastePercent = ''] = []) {
  rowId += 1;
  return { id: rowId, name, buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent };
}

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';
const labelClass = 'mb-1 block text-xs font-semibold text-text-secondary';

function UnitSelect({ value, onChange, label }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {UNIT_OPTIONS.map((group) => (
        <optgroup key={group.group} label={group.group}>
          {group.units.map(([unitValue, unitLabel]) => (
            <option key={unitValue} value={unitValue}>{unitLabel}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function StatusPill({ status }) {
  if (!status) return null;
  const styles = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    loss: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {MARGIN_LABELS[status]}
    </span>
  );
}

function ResultRow({ label, value, strong = false, tone }) {
  const toneClass = tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : 'text-text';
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={`${strong ? 'text-xl font-extrabold' : 'text-base font-bold'} ${toneClass}`}>{value}</span>
    </div>
  );
}

function SaveInAppCta() {
  return (
    <div className="mt-5 rounded-xl bg-primary/5 p-4">
      <a
        href="#download"
        className="block rounded-full bg-primary px-5 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-primary-dark"
      >
        Save this dish in the free app
      </a>
      <p className="mt-3 text-xs leading-relaxed text-text-secondary">
        The app keeps your ingredient prices. When butter goes up, every dish that uses it updates — no re-typing.
      </p>
    </div>
  );
}

function QuickCalculator({ currency }) {
  const [plateCost, setPlateCost] = useState('3.20');
  const [sellingPrice, setSellingPrice] = useState('12.00');
  const [target, setTarget] = useState('30');

  const cost = parsePositive(plateCost) ?? 0;
  const summary = dishSummary({ totalCost: cost, quantityMade: 1, targetPercent: target, sellingPrice });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className={labelClass}>Ingredient cost per plate ({currency})</span>
          <input inputMode="decimal" className={inputClass} value={plateCost} onChange={(e) => setPlateCost(e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Selling price ({currency})</span>
          <input inputMode="decimal" className={inputClass} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="Optional" />
        </label>
        <label>
          <span className={labelClass}>Target food cost %</span>
          <input inputMode="decimal" className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <p className="text-xs leading-relaxed text-text-secondary sm:col-span-3">
          Food cost % = ingredient cost ÷ selling price × 100. Don’t know your plate cost yet? Use the recipe calculator below
          to add up each ingredient.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <ResultRow label="Food cost %" value={formatPercent(summary.foodCostPercent)} strong />
        <ResultRow
          label="Profit per plate"
          value={formatMoney(summary.profit, currency)}
          tone={summary.profit != null ? (summary.profit < 0 ? 'bad' : 'good') : undefined}
        />
        <ResultRow label={`Price for ${summary.target}% food cost`} value={formatMoney(summary.suggestedPrice, currency)} />
        <div className="mt-3"><StatusPill status={summary.status} /></div>
      </div>
    </div>
  );
}

function RecipeCalculator({ currency, preset, recipe, defaultTarget }) {
  const start = recipe ?? PRESETS[preset] ?? PRESETS.cookies;
  const [dishName, setDishName] = useState(start.dishName);
  const [makes, setMakes] = useState(String(start.makes));
  const [unitWord, setUnitWord] = useState(start.unitWord);
  const [target, setTarget] = useState(String(defaultTarget ?? 30));
  const [sellingPrice, setSellingPrice] = useState('');
  const [rows, setRows] = useState(() => start.rows.map(makeRow));

  const updateRow = (id, field, value) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  const removeRow = (id) => setRows((current) => current.filter((row) => row.id !== id));
  const addRow = () => setRows((current) => [...current, makeRow()]);
  const clearAll = () => {
    setDishName('');
    setSellingPrice('');
    setRows([makeRow()]);
  };

  const { lines, totalCost } = useMemo(() => {
    const computed = rows.map((row) => ({ id: row.id, ...ingredientLineCost(row) }));
    const total = computed.reduce((sum, line) => sum + (line.cost ?? 0), 0);
    return { lines: Object.fromEntries(computed.map((line) => [line.id, line])), totalCost: total };
  }, [rows]);

  const summary = dishSummary({ totalCost, quantityMade: makes, targetPercent: target, sellingPrice });
  const word = unitWord.trim() || 'serving';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px_140px]">
          <label>
            <span className={labelClass}>What are you making?</span>
            <input className={inputClass} value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="e.g. Brownies" />
          </label>
          <label>
            <span className={labelClass}>It makes</span>
            <input inputMode="decimal" className={inputClass} value={makes} onChange={(e) => setMakes(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Unit</span>
            <input className={inputClass} value={unitWord} onChange={(e) => setUnitWord(e.target.value)} placeholder="slice, plate…" />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h3 className="text-base font-bold text-text">Ingredients</h3>
          <button type="button" onClick={clearAll} className="text-xs font-semibold text-text-secondary underline hover:text-primary">
            Clear and start my own
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {rows.map((row) => {
            const line = lines[row.id];
            return (
              <div key={row.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Ingredient name"
                    className={`${inputClass} font-semibold`}
                    value={row.name}
                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                    placeholder="Ingredient, e.g. Flour"
                  />
                  <span className="w-20 shrink-0 text-right text-sm font-bold text-text">
                    {line?.cost != null ? formatMoney(line.cost, currency) : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label={`Remove ${row.name || 'ingredient'}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg text-text-secondary transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_80px]">
                  <label>
                    <span className={labelClass}>You paid ({currency})</span>
                    <input inputMode="decimal" className={inputClass} value={row.buyPrice} onChange={(e) => updateRow(row.id, 'buyPrice', e.target.value)} />
                  </label>
                  <label>
                    <span className={labelClass}>For</span>
                    <input inputMode="decimal" className={inputClass} value={row.buyQty} onChange={(e) => updateRow(row.id, 'buyQty', e.target.value)} />
                  </label>
                  <label>
                    <span className={labelClass}>Unit</span>
                    <UnitSelect label="Purchase unit" value={row.buyUnit} onChange={(v) => updateRow(row.id, 'buyUnit', v)} />
                  </label>
                  <label>
                    <span className={labelClass}>You use</span>
                    <input inputMode="decimal" className={inputClass} value={row.useQty} onChange={(e) => updateRow(row.id, 'useQty', e.target.value)} />
                  </label>
                  <label>
                    <span className={labelClass}>Unit</span>
                    <UnitSelect label="Recipe unit" value={row.useUnit} onChange={(v) => updateRow(row.id, 'useUnit', v)} />
                  </label>
                  <label>
                    <span className={labelClass}>Waste %</span>
                    <input inputMode="decimal" className={inputClass} value={row.wastePercent} onChange={(e) => updateRow(row.id, 'wastePercent', e.target.value)} placeholder="0" />
                  </label>
                </div>
                {line?.error ? <p className="mt-2 text-xs font-semibold text-red-600">{line.error}</p> : null}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 w-full rounded-xl border-2 border-dashed border-primary/30 py-3 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary/5"
        >
          + Add ingredient
        </button>

        <a
          href="#calculator-result"
          className="sticky bottom-3 z-10 mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary-dark px-5 py-3 text-white shadow-lg lg:hidden"
        >
          <span>
            <span className="block text-[11px] text-white/75">Cost per {word}</span>
            <span className="block text-lg font-extrabold">{formatMoney(totalCost > 0 ? summary.costPerUnit : null, currency)}</span>
          </span>
          <span className="text-right">
            <span className="block text-[11px] text-white/75">Suggested per {word}</span>
            <span className="block text-lg font-extrabold">{formatMoney(summary.suggestedPrice, currency)}</span>
          </span>
        </a>
      </div>

      <div id="calculator-result" className="scroll-mt-20 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">{dishName || 'Your dish'}</p>
          <ResultRow label="Total ingredient cost" value={formatMoney(totalCost, currency)} />
          <ResultRow label={`Cost per ${word}`} value={formatMoney(totalCost > 0 ? summary.costPerUnit : null, currency)} strong />
          <div className="grid grid-cols-2 gap-3 py-3">
            <label>
              <span className={labelClass}>Target food cost %</span>
              <input inputMode="decimal" className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <label>
              <span className={labelClass}>Your price per {word}</span>
              <input inputMode="decimal" className={inputClass} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="Optional" />
            </label>
          </div>
          <ResultRow label={`Suggested price per ${word}`} value={formatMoney(summary.suggestedPrice, currency)} strong tone="good" />
          {summary.foodCostPercent != null ? (
            <>
              <ResultRow label="Your food cost %" value={formatPercent(summary.foodCostPercent)} />
              <ResultRow
                label={`Profit per ${word}`}
                value={formatMoney(summary.profit, currency)}
                tone={summary.profit < 0 ? 'bad' : 'good'}
              />
              <div className="mt-3"><StatusPill status={summary.status} /></div>
            </>
          ) : (
            <p className="mt-2 text-xs text-text-secondary">Enter your price to see food cost % and profit.</p>
          )}
          <SaveInAppCta />
        </div>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {'recipe'|'quick'} [props.mode]
 * @param {'cookies'|'cake'|'pasta'} [props.preset]
 * @param {{ dishName: string, makes: number|string, unitWord: string, rows: Array }} [props.recipe] overrides preset
 * @param {number} [props.defaultTarget]
 * @param {string} [props.defaultCurrency]
 * @param {string} [props.title]
 */
export function FoodCostCalculator({ mode = 'recipe', preset = 'cookies', recipe, defaultTarget, defaultCurrency = '$', title }) {
  const [currency, setCurrency] = useState(defaultCurrency);

  return (
    <section id="calculator" className="scroll-mt-20 rounded-3xl border border-border bg-surface-alt p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-text">{title ?? (mode === 'quick' ? 'Food cost % calculator' : 'Free recipe cost calculator')}</h2>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          Currency
          <select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-2 text-sm font-semibold text-text">
            {CURRENCIES.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
          </select>
        </label>
      </div>
      {mode === 'quick' ? (
        <QuickCalculator currency={currency} />
      ) : (
        <RecipeCalculator currency={currency} preset={preset} recipe={recipe} defaultTarget={defaultTarget} />
      )}
    </section>
  );
}
