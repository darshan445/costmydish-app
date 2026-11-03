'use client';

import { CURRENCIES } from '@/lib/currency';
import { setCurrencyCode, useCurrencyCode } from '@/lib/use-currency';

export function CurrencySelect({ label = 'Currency', className = '' }) {
  const code = useCurrencyCode();
  return (
    <label className={`flex items-center gap-2 text-sm font-medium text-text-secondary ${className}`}>
      {label}
      <select
        aria-label={label}
        value={code}
        onChange={(e) => setCurrencyCode(e.target.value)}
        className="max-w-[13rem] rounded-lg border border-border bg-surface px-2 py-2 text-sm font-semibold text-text"
      >
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code} — {currency.label}
          </option>
        ))}
      </select>
    </label>
  );
}
