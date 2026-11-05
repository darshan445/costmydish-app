'use client';

import Link from 'next/link';
import { useEffect, useId } from 'react';
import { MARGIN_LABELS, SELLING_UNITS, UNIT_OPTIONS } from '@/lib/food-cost';

export const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-bold text-text transition hover:border-primary/30 disabled:opacity-50';
export const dangerButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50';

const UNIT_LABELS = Object.fromEntries(UNIT_OPTIONS.flatMap((group) => group.units));

export function unitLabel(unit) {
  return UNIT_LABELS[unit] ?? unit;
}

/** "24 pieces", "1 whole dish" for a selling format. */
export function yieldText(quantity, unitName, unitLabelText) {
  const label = (unitLabelText ?? SELLING_UNITS.find(([value]) => value === unitName)?.[1] ?? 'serving').toLowerCase();
  const word = label === 'whole' ? 'whole dish' : label;
  const q = Number(quantity) || 1;
  if (q === 1 || ['dozen', 'whole dish'].includes(word)) return `${q} ${word}`;
  if (/(s|x|z|ch|sh)$/.test(word)) return `${q} ${word}es`;
  return `${q} ${word}s`;
}

export function unitWord(unitName, unitLabelText) {
  const label = (unitLabelText ?? SELLING_UNITS.find(([value]) => value === unitName)?.[1] ?? 'serving').toLowerCase();
  return label === 'whole' ? 'whole dish' : label;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-text sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageBody({ children }) {
  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  );
}

const STATUS_STYLES = {
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  loss: 'bg-red-50 text-red-700 border-red-200',
};

export function StatusPill({ status }) {
  if (!status) return null;
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[status]}`}>
      {MARGIN_LABELS[status]}
    </span>
  );
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-2 text-sm text-text outline-none"
      />
    </label>
  );
}

export function EmptyState({ title, description, actionLabel, actionHref, onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p className="text-base font-bold text-text">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">{description}</p> : null}
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={`${primaryButtonClass} mt-5`}>{actionLabel}</Link>
      ) : actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={`${primaryButtonClass} mt-5`}>{actionLabel}</button>
      ) : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">
      {message}{' '}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-semibold underline">Try again</button>
      ) : null}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}

/** Centered dialog; Escape and the backdrop close it unless `busy`. */
export function Dialog({ title, onClose, busy = false, children, footer }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={busy ? undefined : onClose} className="absolute inset-0 cursor-default bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <h2 id={titleId} className="text-lg font-extrabold text-text">{title}</h2>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, busy, error, onConfirm, onClose }) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={dangerButtonClass}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </>
      )}
    >
      <p className="text-sm leading-relaxed text-text-secondary">{message}</p>
      {error ? <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{error}</p> : null}
    </Dialog>
  );
}
