// Matching calculator rows to Library items by name, shared by the editor UI and the save logic.
// No Supabase here, so it can load on any page.

import { parseDecimal, parsePositive } from '@/lib/food-cost';

export const normalizeName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim();
export const nameKey = (name) => normalizeName(name).toLowerCase();

/** Library item → calculator row purchase fields (strings, as the form holds them). */
export function libraryRowFields(item) {
  const waste = Number(item.waste_percent ?? 0);
  return {
    name: item.name,
    buyPrice: String(Number(item.purchase_price)),
    buyQty: String(Number(item.purchase_quantity)),
    buyUnit: item.purchase_unit,
    wastePercent: waste > 0 ? String(waste) : '',
  };
}

/** True when the row's purchase details equal the Library item's. */
export function sameAsLibrary(item, row) {
  return (
    Number(item.purchase_price) === parsePositive(row.buyPrice)
    && Number(item.purchase_quantity) === parsePositive(row.buyQty)
    && item.purchase_unit === row.buyUnit
    && Number(item.waste_percent ?? 0) === (parseDecimal(row.wastePercent) || 0)
  );
}
