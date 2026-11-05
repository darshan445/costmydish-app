'use client';

import { useState } from 'react';
import {
  NAME_MAX_LENGTH,
  UNIT_OPTIONS,
  parseDecimal,
  positiveNumberError,
  priceError,
  wastePercentError,
} from '@/lib/food-cost';
import { Dialog, primaryButtonClass, secondaryButtonClass, unitLabel } from '../ui';

const NOTES_MAX_LENGTH = 200;
const inputClass = 'w-full rounded-lg bg-transparent px-3 py-2.5 text-sm text-text outline-none';

function Field({ label, error, prefix, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-text-secondary">{label}</span>
      <span className={`flex items-center rounded-lg border bg-surface focus-within:ring-2 ${error ? 'border-red-500 focus-within:ring-red-500/15' : 'border-border focus-within:border-primary focus-within:ring-primary/15'}`}>
        {prefix ? <span className="pl-3 text-sm font-medium text-text">{prefix}</span> : null}
        {children}
      </span>
      {error ? <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-text-secondary">{hint}</span> : null}
    </label>
  );
}

function nameError(name) {
  if (!name.trim()) return 'Enter a name';
  if (name.trim().length > NAME_MAX_LENGTH) return `Keep it under ${NAME_MAX_LENGTH} characters`;
  return null;
}

/**
 * Add or edit a Library item. `ingredient` is null when adding.
 * onSave(values) must throw an Error with a user-friendly message on failure.
 */
export function IngredientDialog({ ingredient, symbol, onSave, onClose }) {
  const [name, setName] = useState(ingredient?.name ?? '');
  const [price, setPrice] = useState(ingredient ? String(ingredient.purchase_price) : '');
  const [quantity, setQuantity] = useState(ingredient ? String(ingredient.purchase_quantity) : '1');
  const [unit, setUnit] = useState(ingredient?.purchase_unit ?? 'kg');
  const [waste, setWaste] = useState(ingredient && Number(ingredient.waste_percent) > 0 ? String(ingredient.waste_percent) : '');
  const [notes, setNotes] = useState(ingredient?.notes ?? '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {
      name: nameError(name),
      price: priceError(price),
      quantity: positiveNumberError(quantity, 'quantity'),
      waste: wastePercentError(waste),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    setFormError('');
    try {
      await onSave({
        name: name.trim().replace(/\s+/g, ' '),
        purchase_price: parseDecimal(price),
        purchase_quantity: parseDecimal(quantity),
        purchase_unit: unit,
        waste_percent: waste.trim() ? parseDecimal(waste) : 0,
        notes: notes.trim() || null,
      });
    } catch (error) {
      setFormError(error.message || 'Couldn’t save this ingredient. Please try again.');
      setSaving(false);
    }
  }

  const priceHint = parseDecimal(price) > 0 && parseDecimal(quantity) > 0
    ? `Bought ${quantity} ${unitLabel(unit)} for ${symbol}${price}`
    : `e.g. bought 1 ${unitLabel(unit)} for ${symbol}2.50`;

  return (
    <Dialog
      title={ingredient ? 'Edit ingredient' : 'Add to library'}
      onClose={onClose}
      busy={saving}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="ingredient-form" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Saving…' : ingredient ? 'Save changes' : 'Add to library'}
          </button>
        </>
      )}
    >
      <form id="ingredient-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Name" error={errors.name}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Butter" maxLength={NAME_MAX_LENGTH} autoFocus />
        </Field>
        <div className="grid grid-cols-[1fr_1fr_7rem] gap-3">
          <Field label="Price paid" error={errors.price} prefix={symbol}>
            <input className={inputClass} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Quantity bought" error={errors.quantity}>
            <input className={inputClass} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" />
          </Field>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-secondary">Unit</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="min-h-[42px] w-full rounded-lg border border-border bg-surface px-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {UNIT_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.units.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <p className="-mt-2 text-xs text-text-secondary">{priceHint}</p>
        <Field label="Waste % (optional)" error={errors.waste} hint="Trim, peel or bones you throw away. Raises the real cost.">
          <input className={inputClass} inputMode="decimal" value={waste} onChange={(e) => setWaste(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Notes (optional)">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Brand, supplier…" maxLength={NOTES_MAX_LENGTH} />
        </Field>
        {ingredient?.dishCount > 0 ? (
          <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary-dark">
            Used in {ingredient.dishCount} dish{ingredient.dishCount === 1 ? '' : 'es'} — they update with the new price.
          </p>
        ) : null}
        {formError ? <p className="text-sm font-semibold text-red-600" role="alert">{formError}</p> : null}
      </form>
    </Dialog>
  );
}
