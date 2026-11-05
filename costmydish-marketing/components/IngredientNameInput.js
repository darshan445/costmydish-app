'use client';

import { useId, useMemo, useState } from 'react';
import { formatMoney, UNIT_OPTIONS } from '@/lib/food-cost';
import { nameKey } from '@/lib/library-match';

const MAX_SUGGESTIONS = 6;
const UNIT_LABELS = Object.fromEntries(UNIT_OPTIONS.flatMap((group) => group.units));

/**
 * Ingredient name box that suggests Library items as you type. Picking one fills the row
 * with its saved price; typing a name that isn't listed simply adds a new ingredient.
 * usedKeys: names already on other rows, left out of the suggestions.
 */
export function IngredientNameInput({ value, onChange, onPick, library, usedKeys, currency, className, maxLength }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => {
    const query = nameKey(value);
    const available = library.filter((item) => !usedKeys.has(nameKey(item.name)) || nameKey(item.name) === query);
    const matches = query
      ? available.filter((item) => nameKey(item.name).includes(query))
      : available;
    return matches
      .sort((a, b) => Number(!nameKey(a.name).startsWith(query)) - Number(!nameKey(b.name).startsWith(query)) || a.name.localeCompare(b.name))
      .slice(0, MAX_SUGGESTIONS);
  }, [library, usedKeys, value]);

  const exact = suggestions.some((item) => nameKey(item.name) === nameKey(value));
  const showList = open && (suggestions.length > 0 || value.trim());

  function pick(item) {
    onPick(item);
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (!showList || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(suggestions[Math.min(active, suggestions.length - 1)]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative w-full">
      <input
        aria-label="Name"
        role="combobox"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className={className}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder="Type or pick from your Library"
        maxLength={maxLength}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-xl"
        >
          {suggestions.length > 0 ? (
            <li className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary" role="presentation">
              Your Library
            </li>
          ) : null}
          {suggestions.map((item, index) => (
            <li
              key={item.id}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(item)}
              onMouseEnter={() => setActive(index)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${index === active ? 'bg-primary/10' : ''}`}
            >
              <span className="truncate font-semibold text-text">{item.name}</span>
              <span className="shrink-0 text-xs text-text-secondary">
                {formatMoney(Number(item.purchase_price), currency)} / {Number(item.purchase_quantity)} {UNIT_LABELS[item.purchase_unit] ?? item.purchase_unit}
              </span>
            </li>
          ))}
          {value.trim() && !exact ? (
            <li
              role="presentation"
              className="border-t border-border px-3 py-2 text-xs text-text-secondary"
            >
              {suggestions.length > 0 ? 'Not listed? ' : 'Not in your Library. '}
              “{value.trim()}” will be added as a new ingredient — enter what you paid below.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
