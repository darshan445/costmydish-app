'use client';

import { useMemo, useState } from 'react';
import {
  MARGIN_LABELS,
  NAME_MAX_LENGTH,
  SELLING_UNITS,
  UNIT_OPTIONS,
  cakePrice,
  compatibleUnitOptions,
  defaultUsedUnit,
  dishSummary,
  foodCostPercentError,
  formatMoney,
  formatPercent,
  ingredientLineCost,
  parsePositive,
  positiveNumberError,
  priceError,
  sellingUnitWord,
  toSellingUnit,
  typedError,
  unitFamily,
  wastePercentError,
  wholeNumberError,
} from '@/lib/food-cost';
import { CurrencySelect } from '@/components/CurrencySelect';
import { IngredientNameInput } from '@/components/IngredientNameInput';
import { PublicSaveDish } from '@/components/PublicSaveDish';
import { libraryRowFields, nameKey, sameAsLibrary } from '@/lib/library-match';
import { BASE_CURRENCY, getCurrency, localPriceText, localizeRows } from '@/lib/currency';
import { CAKE_EXTRAS, PRESETS } from '@/lib/presets';
import { useCurrencyCode } from '@/lib/use-currency';

let rowId = 0;
function nextRowId() {
  rowId += 1;
  return `row-${rowId}`;
}

function makeRow([name = '', buyPrice = '', buyQty = '1', buyUnit = 'kg', useQty = '', useUnit = 'g', wastePercent = ''] = [], id = nextRowId()) {
  return { id, name, buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent };
}

/** An example value that follows the visitor's currency until they type over it. */
function useExampleValue(example, code, from = BASE_CURRENCY) {
  const [typed, setTyped] = useState(null);
  return [typed ?? localPriceText(example, code, from), setTyped];
}

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';
const labelClass = 'mb-1 block text-xs font-semibold text-text-secondary';
const sectionLabelClass = 'mb-2 block text-[11px] font-bold uppercase tracking-wider text-primary';

/** Text or number field with the app's inline error style (red border + message under the box). */
function Field({ label, value, onChange, error, hint, placeholder, numeric = 'decimal', prefix, suffix, maxLength, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      <span className={`flex items-center rounded-lg border bg-surface transition focus-within:ring-2 ${error ? 'border-red-500 focus-within:ring-red-500/15' : 'border-border focus-within:border-primary focus-within:ring-primary/15'}`}>
        {prefix ? <span className="pl-3 text-sm font-medium text-text">{prefix}</span> : null}
        <input
          inputMode={numeric === 'integer' ? 'numeric' : numeric === 'decimal' ? 'decimal' : 'text'}
          className="w-full min-w-0 rounded-lg bg-transparent px-3 py-2.5 text-sm text-text outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
        />
        {suffix ? <span className="pr-3 text-sm text-text-secondary">{suffix}</span> : null}
      </span>
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}

function UnitSelect({ value, onChange, label, options = UNIT_OPTIONS }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {options.map((group) => (
        <optgroup key={group.group} label={group.group}>
          {group.units.map(([unitValue, unitLabel]) => (
            <option key={unitValue} value={unitValue}>{unitLabel}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function SellingUnitSelect({ value, onChange }) {
  return (
    <select aria-label="Unit" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {SELLING_UNITS.map(([unitValue, unitLabel]) => (
        <option key={unitValue} value={unitValue}>{unitLabel}</option>
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

function QuickCalculator({ currency, code }) {
  const [plateCost, setPlateCost] = useExampleValue('3.20', code);
  const [sellingPrice, setSellingPrice] = useExampleValue('12.00', code);
  const [target, setTarget] = useState('30');

  const costError = typedError(priceError, plateCost);
  const cost = costError ? 0 : (parsePositive(plateCost) ?? 0);
  const summary = dishSummary({ totalCost: cost, quantityMade: 1, targetPercent: target, sellingPrice });

  return (
    <div className="grid gap-6 @4xl/calc:grid-cols-[1fr_320px]">
      <div className="grid gap-4 @xl:grid-cols-3">
        <Field label="Cost per plate" prefix={currency} value={plateCost} onChange={setPlateCost} error={costError} placeholder="0.00" />
        <Field label="Your price per plate" prefix={currency} value={sellingPrice} onChange={setSellingPrice} error={typedError(priceError, sellingPrice)} placeholder="Optional" />
        <Field label="Food cost target" suffix="%" value={target} onChange={setTarget} error={typedError(foodCostPercentError, target)} placeholder="30" hint="A common food cost target is 25–35%." />
        <p className="text-xs leading-relaxed text-text-secondary @xl:col-span-3">
          Food cost % = ingredient cost ÷ selling price × 100. Don’t know your plate cost yet? Use the recipe calculator below
          to add up each ingredient.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <ResultRow label="Food cost" value={formatPercent(summary.foodCostPercent)} strong />
        <ResultRow
          label="Profit per plate"
          value={formatMoney(summary.profit, currency)}
          tone={summary.profit != null ? (summary.profit < 0 ? 'bad' : 'good') : undefined}
        />
        <ResultRow label="Suggested per plate" value={formatMoney(summary.suggestedPrice, currency)} />
        <div className="mt-3"><StatusPill status={summary.status} /></div>
      </div>
    </div>
  );
}

function CakePricingPanel({ currency, code, totalCost, makes, word }) {
  const [packaging, setPackaging] = useExampleValue(CAKE_EXTRAS.packaging, code);
  const [hours, setHours] = useState(CAKE_EXTRAS.hours);
  const [hourlyRate, setHourlyRate] = useExampleValue(CAKE_EXTRAS.hourlyRate, code);
  const [overheadPercent, setOverheadPercent] = useState(CAKE_EXTRAS.overheadPercent);
  const [profitPercent, setProfitPercent] = useState(CAKE_EXTRAS.profitPercent);

  const result = useMemo(
    () => cakePrice({ ingredientCost: totalCost, packaging, hours, hourlyRate, overheadPercent, profitPercent, portions: makes }),
    [totalCost, packaging, hours, hourlyRate, overheadPercent, profitPercent, makes],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 py-3">
        <Field label="Packaging" prefix={currency} value={packaging} onChange={setPackaging} error={typedError((v) => positiveNumberError(v, 'amount', 1000000), packaging)} placeholder="0" />
        <Field label="Hours of work" value={hours} onChange={setHours} error={typedError((v) => positiveNumberError(v, 'number', 10000), hours)} placeholder="0" />
        <Field label="Your hourly rate" prefix={currency} value={hourlyRate} onChange={setHourlyRate} error={typedError((v) => positiveNumberError(v, 'rate', 1000000), hourlyRate)} placeholder="0" />
        <Field label="Overheads" suffix="%" value={overheadPercent} onChange={setOverheadPercent} error={typedError((v) => positiveNumberError(v, '%', 1000), overheadPercent)} placeholder="0" />
        <Field label="Profit" suffix="%" value={profitPercent} onChange={setProfitPercent} error={typedError((v) => positiveNumberError(v, '%', 1000), profitPercent)} placeholder="0" className="col-span-2" />
      </div>
      <ResultRow label="Your time" value={formatMoney(result.labour, currency)} />
      <ResultRow label="Overheads" value={formatMoney(result.overhead, currency)} />
      <ResultRow label="Total cost" value={formatMoney(result.totalCost, currency)} />
      <ResultRow label="Profit" value={formatMoney(result.price != null ? result.profit : null, currency)} tone="good" />
      <ResultRow label="Price to charge" value={formatMoney(result.price, currency)} strong tone="good" />
      <ResultRow label={`Price per ${word}`} value={formatMoney(result.pricePerPortion, currency)} />
      {result.ingredientShare != null ? (
        <p className="mt-2 text-xs text-text-secondary">
          Ingredients are {formatPercent(result.ingredientShare)} of this price.
        </p>
      ) : null}
    </>
  );
}

const BLANK_START = { dishName: '', makes: '', unitWord: 'piece', rows: [[]] };

/** True when every visible field is valid and at least one ingredient is complete. */
function dishIsSaveable({ rows, lines, makes, target, sellingPrice }) {
  if (wholeNumberError(makes) || foodCostPercentError(target) || (sellingPrice.trim() && priceError(sellingPrice))) return false;
  const filled = rows.filter((row) => row.name.trim() || row.buyPrice.trim() || row.useQty.trim());
  if (filled.length === 0) return false;
  return filled.every((row) => (
    row.name.trim()
    && !priceError(row.buyPrice)
    && !positiveNumberError(row.buyQty, 'quantity')
    && !positiveNumberError(row.useQty, 'quantity')
    && !wastePercentError(row.wastePercent)
    && lines[row.id]?.cost != null
  ));
}

/** A dish in the save shape (see renderSave) as calculator start values. */
function startFromDish(dish) {
  return {
    dishName: dish.name ?? '',
    makes: dish.yieldQty ?? '',
    unitWord: dish.yieldUnit,
    rows: dish.ingredients.map((row) => [row.name, row.buyPrice, row.buyQty, row.buyUnit, row.useQty, row.useUnit, row.wastePercent]),
  };
}

/** Under a dashboard row: whether it uses a Library item as saved, differs from it, or is new. */
function LibraryNote({ row, item, currency, onUseLibrary }) {
  if (!row.name.trim()) return null;
  if (!item) {
    return <p className="mt-2 text-xs text-text-secondary">New ingredient — it will be added to your Library when you save.</p>;
  }
  if (sameAsLibrary(item, row)) {
    return <p className="mt-2 text-xs font-semibold text-primary">✓ From your Library</p>;
  }
  const unit = UNIT_OPTIONS.flatMap((group) => group.units).find(([value]) => value === item.purchase_unit)?.[1] ?? item.purchase_unit;
  return (
    <p className="mt-2 text-xs text-amber-700">
      Your Library has {formatMoney(Number(item.purchase_price), currency)} per {Number(item.purchase_quantity)} {unit}
      {Number(item.waste_percent) > 0 ? `, ${Number(item.waste_percent)}% waste` : ''}. You’ll be asked whether to update it when you save.{' '}
      <button type="button" onClick={() => onUseLibrary(row.id, item)} className="font-semibold underline">
        Use Library price
      </button>
    </p>
  );
}

function RecipeCalculator({ currency, code, preset, recipe, recipeCurrency = BASE_CURRENCY, defaultTarget, pricing, blank = false, initial, library, renderSave }) {
  const [initialStart] = useState(() => (initial ? startFromDish(initial) : null));
  const start = initialStart ?? (blank ? BLANK_START : recipe ?? PRESETS[preset] ?? PRESETS.cookies);
  const fixedPrices = blank || Boolean(initialStart);
  const from = recipe ? recipeCurrency : BASE_CURRENCY;
  const [dishName, setDishName] = useState(start.dishName);
  const [makes, setMakesText] = useState(String(start.makes));
  const [yieldUnit, setYieldUnit] = useState(() => toSellingUnit(start.unitWord));
  const [target, setTargetText] = useState(String(initial?.targetPercent || defaultTarget || 30));
  const [sellingPrice, setSellingPrice] = useState(initial?.sellingPrice ?? '');
  // As in the app: while a field shows an error, results keep its last valid value
  const [validMakes, setValidMakes] = useState(makes);
  const [validTarget, setValidTarget] = useState(target);
  const setMakes = (value) => {
    setMakesText(value);
    if (value.trim() !== '' && !wholeNumberError(value)) setValidMakes(value);
  };
  const setTarget = (value) => {
    setTargetText(value);
    if (value.trim() !== '' && !foodCostPercentError(value)) setValidTarget(value);
  };
  // Example rows show local prices until the visitor edits them; after that only the symbol changes, as in the app
  const exampleRows = useMemo(
    () => (fixedPrices ? start.rows : localizeRows(start.rows, code, from)).map((row, index) => makeRow(row, `example-${index}`)),
    [fixedPrices, start, code, from],
  );
  const [editedRows, setEditedRows] = useState(null);
  const rows = editedRows ?? exampleRows;
  const setRows = (update) => setEditedRows((current) => update(current ?? exampleRows));

  const updateRow = (id, field, value) =>
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: value };
      // Same as the app: changing the purchase unit resets the used unit to a matching one
      if (field === 'buyUnit' && unitFamily(value) !== unitFamily(row.useUnit)) next.useUnit = defaultUsedUnit(value);
      return next;
    }));
  const removeRow = (id) => setRows((current) => current.filter((row) => row.id !== id));
  const libraryByKey = useMemo(() => new Map((library ?? []).map((item) => [nameKey(item.name), item])), [library]);
  const usedKeysExcept = (id) => new Set(rows.filter((row) => row.id !== id && row.name.trim()).map((row) => nameKey(row.name)));
  // Same as picking from the app's Library list: purchase details come from the Library item
  const pickLibraryItem = (id, item) =>
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, ...libraryRowFields(item) };
      if (unitFamily(next.buyUnit) !== unitFamily(row.useUnit)) next.useUnit = defaultUsedUnit(next.buyUnit);
      return next;
    }));
  const addRow = () => setRows((current) => [...current, makeRow()]);
  const clearAll = () => {
    setDishName('');
    setSellingPrice('');
    setEditedRows([makeRow()]);
  };

  const { lines, totalCost } = useMemo(() => {
    const computed = rows.map((row) => ({ id: row.id, ...ingredientLineCost(row) }));
    const total = computed.reduce((sum, line) => sum + (line.cost ?? 0), 0);
    return { lines: Object.fromEntries(computed.map((line) => [line.id, line])), totalCost: total };
  }, [rows]);

  const makesError = typedError(wholeNumberError, makes);
  const targetError = typedError(foodCostPercentError, target);
  const sellingPriceError = typedError(priceError, sellingPrice);

  const summary = dishSummary({
    totalCost,
    quantityMade: validMakes,
    targetPercent: validTarget,
    sellingPrice: sellingPriceError ? '' : sellingPrice,
  });
  const word = sellingUnitWord(yieldUnit);

  return (
    <div className="grid gap-6 @4xl/calc:grid-cols-[1fr_340px]">
      <div className="@container">
        <div className="grid gap-4 @md:grid-cols-[1fr_120px_140px]">
          <Field
            label="What are you making?"
            numeric="text"
            value={dishName}
            onChange={setDishName}
            placeholder="e.g. Brownies"
            maxLength={NAME_MAX_LENGTH}
          />
          <Field
            label="Yield"
            numeric="integer"
            value={makes}
            onChange={setMakes}
            error={makesError}
            hint="How many this recipe makes"
            placeholder="e.g. 12"
            maxLength={6}
          />
          <label className="block">
            <span className={labelClass}>Unit</span>
            <SellingUnitSelect value={yieldUnit} onChange={setYieldUnit} />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h3 className="text-base font-bold text-text">Ingredients</h3>
          <button type="button" onClick={clearAll} className="text-xs font-semibold text-text-secondary underline hover:text-primary">
            {blank ? 'Clear all' : 'Clear and start my own'}
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {rows.map((row) => {
            const line = lines[row.id];
            return (
              <div key={row.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  {library ? (
                    <IngredientNameInput
                      value={row.name}
                      onChange={(value) => updateRow(row.id, 'name', value)}
                      onPick={(item) => pickLibraryItem(row.id, item)}
                      library={library}
                      usedKeys={usedKeysExcept(row.id)}
                      currency={currency}
                      className={`${inputClass} font-semibold`}
                      maxLength={NAME_MAX_LENGTH}
                    />
                  ) : (
                    <input
                      aria-label="Name"
                      className={`${inputClass} font-semibold`}
                      value={row.name}
                      onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                      placeholder="e.g. Butter"
                      maxLength={NAME_MAX_LENGTH}
                    />
                  )}
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
                {library ? <LibraryNote row={row} item={libraryByKey.get(nameKey(row.name))} currency={currency} onUseLibrary={pickLibraryItem} /> : null}
                <div className="mt-4 grid gap-4 @2xl:grid-cols-[3fr_2fr]">
                  <div>
                    <span className={sectionLabelClass}>What you bought</span>
                    <div className="grid grid-cols-2 gap-3 @xl:grid-cols-[1fr_1fr_1fr_1fr]">
                      <Field
                        label="Purchased cost"
                        prefix={currency}
                        value={row.buyPrice}
                        onChange={(v) => updateRow(row.id, 'buyPrice', v)}
                        error={typedError(priceError, row.buyPrice)}
                        placeholder="0.00"
                      />
                      <Field
                        label="Purchased quantity"
                        value={row.buyQty}
                        onChange={(v) => updateRow(row.id, 'buyQty', v)}
                        error={typedError((v) => positiveNumberError(v, 'quantity'), row.buyQty)}
                        placeholder="0"
                      />
                      <label className="block">
                        <span className={labelClass}>Purchased unit</span>
                        <UnitSelect label="Purchased unit" value={row.buyUnit} onChange={(v) => updateRow(row.id, 'buyUnit', v)} />
                      </label>
                      <Field
                        label="Waste %"
                        value={row.wastePercent}
                        onChange={(v) => updateRow(row.id, 'wastePercent', v)}
                        error={typedError(wastePercentError, row.wastePercent)}
                        placeholder="0"
                        hint="optional"
                      />
                    </div>
                  </div>
                  <div>
                    <span className={sectionLabelClass}>Used in this dish</span>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Used quantity"
                        value={row.useQty}
                        onChange={(v) => updateRow(row.id, 'useQty', v)}
                        error={typedError((v) => positiveNumberError(v, 'quantity'), row.useQty)}
                        placeholder="0"
                      />
                      <label className="block">
                        <span className={labelClass}>Used unit</span>
                        <UnitSelect
                          label="Used unit"
                          value={row.useUnit}
                          onChange={(v) => updateRow(row.id, 'useUnit', v)}
                          options={compatibleUnitOptions(row.buyUnit)}
                        />
                      </label>
                    </div>
                  </div>
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
          className="sticky bottom-3 z-10 mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary-dark px-5 py-3 text-white shadow-lg @4xl/calc:hidden"
        >
          <span>
            <span className="block text-[11px] text-white/75">Cost per {word}</span>
            <span className="block text-lg font-extrabold">{formatMoney(totalCost > 0 ? summary.costPerUnit : null, currency)}</span>
          </span>
          {pricing === 'cake' ? (
            <span className="text-right">
              <span className="block text-[11px] text-white/75">Ingredients total</span>
              <span className="block text-lg font-extrabold">{formatMoney(totalCost, currency)}</span>
            </span>
          ) : (
            <span className="text-right">
              <span className="block text-[11px] text-white/75">Suggested per {word}</span>
              <span className="block text-lg font-extrabold">{formatMoney(summary.suggestedPrice, currency)}</span>
            </span>
          )}
        </a>
      </div>

      <div id="calculator-result" className="scroll-mt-20 @4xl/calc:sticky @4xl/calc:top-24 @4xl/calc:self-start">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">{dishName || 'Your dish'}</p>
          <ResultRow label="Total ingredient cost" value={formatMoney(totalCost, currency)} />
          <ResultRow label={`Cost per ${word}`} value={formatMoney(totalCost > 0 ? summary.costPerUnit : null, currency)} strong />
          {pricing === 'cake' ? (
            <CakePricingPanel currency={currency} code={code} totalCost={totalCost} makes={validMakes} word={word} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 py-3">
                <Field
                  label="Food cost target"
                  suffix="%"
                  value={target}
                  onChange={setTarget}
                  error={targetError}
                  placeholder="30"
                />
                <Field
                  label={`Your price per ${word}`}
                  prefix={currency}
                  value={sellingPrice}
                  onChange={setSellingPrice}
                  error={sellingPriceError}
                  placeholder="Optional"
                />
              </div>
              <p className="-mt-1 mb-2 text-xs text-text-secondary">A common food cost target is 25–35%. Leave the price empty to use the suggested price.</p>
              <ResultRow label={`Suggested per ${word}`} value={formatMoney(summary.suggestedPrice, currency)} strong tone="good" />
              {summary.foodCostPercent != null ? (
                <>
                  <ResultRow label="Food cost" value={formatPercent(summary.foodCostPercent)} />
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
            </>
          )}
          {(renderSave ?? ((state) => <PublicSaveDish {...state} currencyCode={code} />))({
            canSave: dishIsSaveable({ rows, lines, makes, target, sellingPrice }),
            dish: {
              name: dishName,
              yieldQty: makes,
              yieldUnit,
              targetPercent: validTarget,
              sellingPrice: sellingPriceError ? '' : sellingPrice,
              suggestedPrice: summary.suggestedPrice,
              ingredients: rows
                .filter((row) => row.name.trim() || row.buyPrice.trim() || row.useQty.trim())
                .map(({ name, buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent }) => ({ name, buyPrice, buyQty, buyUnit, useQty, useUnit, wastePercent })),
            },
          })}
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
 * @param {string} [props.recipeCurrency] currency code the recipe rows are priced in (default USD)
 * @param {number} [props.defaultTarget]
 * @param {string} [props.title]
 * @param {'food-cost'|'cake'} [props.pricing] 'cake' prices with packaging, time, overheads and profit
 * @param {boolean} [props.blank] start with an empty dish instead of an example (dashboard)
 * @param {string} [props.currencyCode] fixed currency (the signed-in user's), hides the currency picker
 * @param {(state: { canSave: boolean, dish: object }) => import('react').ReactNode} [props.renderSave]
 *   replaces the public save button (sign-up prompt when signed out)
 * @param {object} [props.initial] a dish in the renderSave `dish` shape to start from, prices as typed
 * @param {Array} [props.library] the signed-in user's Library items: name suggestions and price checks
 */
export function FoodCostCalculator({
  mode = 'recipe',
  preset = 'cookies',
  recipe,
  recipeCurrency,
  defaultTarget,
  title,
  pricing = 'food-cost',
  blank = false,
  currencyCode,
  initial,
  library,
  renderSave,
}) {
  const visitorCode = useCurrencyCode();
  const code = currencyCode ?? visitorCode;
  const currency = getCurrency(code).symbol;

  return (
    <section id="calculator" className="@container/calc scroll-mt-20 rounded-3xl border border-border bg-surface-alt p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-text">{title ?? (mode === 'quick' ? 'Food cost % calculator' : 'Free recipe cost calculator')}</h2>
        {currencyCode ? null : <CurrencySelect />}
      </div>
      {mode === 'quick' ? (
        <QuickCalculator currency={currency} code={code} />
      ) : (
        <RecipeCalculator
          currency={currency}
          code={code}
          preset={preset}
          recipe={recipe}
          recipeCurrency={recipeCurrency}
          defaultTarget={defaultTarget}
          pricing={pricing}
          blank={blank}
          initial={initial}
          library={library}
          renderSave={renderSave}
        />
      )}
    </section>
  );
}
