export const UNIT_SYSTEMS = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
];

export const UNIT_LABELS = {
  kg: 'kg',
  g: 'g',
  lb: 'lb',
  oz: 'oz',
  l: 'L',
  ml: 'ml',
  fl_oz: 'fl oz',
  cup: 'cup',
  tbsp: 'tbsp',
  tsp: 'tsp',
  gallon: 'gallon',
  quart: 'quart',
  pint: 'pint',
  piece: 'piece',
  each: 'each',
  dozen: 'dozen',
  pack: 'pack',
  other: 'other',
};

const METRIC_WEIGHT = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
];

const IMPERIAL_WEIGHT = [
  { value: 'lb', label: 'lb' },
  { value: 'oz', label: 'oz' },
];

const METRIC_VOLUME = [
  { value: 'l', label: 'L' },
  { value: 'ml', label: 'ml' },
];

const IMPERIAL_VOLUME = [
  { value: 'gallon', label: 'gallon' },
  { value: 'quart', label: 'quart' },
  { value: 'pint', label: 'pint' },
  { value: 'cup', label: 'cup' },
  { value: 'fl_oz', label: 'fl oz' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'tsp', label: 'tsp' },
];

const COUNT_UNITS = [
  { value: 'dozen', label: 'dozen' },
  { value: 'piece', label: 'piece' },
  { value: 'each', label: 'each' },
];

export const UNIT_GROUPS_BY_SYSTEM = {
  metric: [
    { label: 'WEIGHT', units: METRIC_WEIGHT },
    { label: 'VOLUME', units: METRIC_VOLUME },
    { label: 'COUNT', units: COUNT_UNITS },
  ],
  imperial: [
    { label: 'WEIGHT', units: IMPERIAL_WEIGHT },
    { label: 'VOLUME', units: IMPERIAL_VOLUME },
    { label: 'COUNT', units: COUNT_UNITS },
  ],
};

// All units across both systems — used for family lookup and stored data
export const UNIT_FAMILIES = {
  weight: [...METRIC_WEIGHT, ...IMPERIAL_WEIGHT].map((u) => u.value),
  volume: [...METRIC_VOLUME, ...IMPERIAL_VOLUME].map((u) => u.value),
  count: COUNT_UNITS.map((u) => u.value),
};

export const ALL_UNITS = [
  ...METRIC_WEIGHT.map((u) => ({ ...u, family: 'weight' })),
  ...IMPERIAL_WEIGHT.map((u) => ({ ...u, family: 'weight' })),
  ...METRIC_VOLUME.map((u) => ({ ...u, family: 'volume' })),
  ...IMPERIAL_VOLUME.map((u) => ({ ...u, family: 'volume' })),
  ...COUNT_UNITS.map((u) => ({ ...u, family: 'count' })),
];

const UNITS_BY_SYSTEM = {
  metric: new Set([
    ...METRIC_WEIGHT.map((u) => u.value),
    ...METRIC_VOLUME.map((u) => u.value),
    ...COUNT_UNITS.map((u) => u.value),
  ]),
  imperial: new Set([
    ...IMPERIAL_WEIGHT.map((u) => u.value),
    ...IMPERIAL_VOLUME.map((u) => u.value),
    ...COUNT_UNITS.map((u) => u.value),
  ]),
};

export function normalizeUnitSystem(unitSystem) {
  return unitSystem === 'imperial' ? 'imperial' : 'metric';
}

export function getUnitGroupsForSystem(unitSystem) {
  return UNIT_GROUPS_BY_SYSTEM[normalizeUnitSystem(unitSystem)];
}

export function getFlatUnitsForSystem(unitSystem) {
  return getUnitGroupsForSystem(unitSystem).flatMap((group) =>
    group.units.map((u) => ({ ...u, family: group.label.toLowerCase() }))
  );
}

export function getDefaultPurchaseUnit(unitSystem) {
  return normalizeUnitSystem(unitSystem) === 'imperial' ? 'lb' : 'kg';
}

export function formatUnitLabel(unit) {
  if (!unit) return '';
  return UNIT_LABELS[unit] ?? String(unit).replace(/_/g, ' ');
}

export function getUnitFamily(unit) {
  for (const [family, units] of Object.entries(UNIT_FAMILIES)) {
    if (units.includes(unit)) return family;
  }
  return null;
}

export function isUnitInSystem(unit, unitSystem) {
  return UNITS_BY_SYSTEM[normalizeUnitSystem(unitSystem)]?.has(unit) ?? false;
}

/**
 * Infer metric vs imperial from a stored unit.
 * Count units exist in both systems — fall back to the user's preference.
 */
export function inferUnitSystem(unit, fallback = 'metric') {
  const preferred = normalizeUnitSystem(fallback);
  if (!unit) return preferred;
  const inMetric = isUnitInSystem(unit, 'metric');
  const inImperial = isUnitInSystem(unit, 'imperial');
  if (inMetric && !inImperial) return 'metric';
  if (inImperial && !inMetric) return 'imperial';
  return preferred;
}

/**
 * Units pickable for an ingredient/recipe row in the user's unit system.
 * Same family as purchase unit; count units always available.
 */
export function getCompatibleUnitsForIngredient(purchaseUnit, unitSystem) {
  const system = normalizeUnitSystem(unitSystem);
  const family = getUnitFamily(purchaseUnit);
  const groups = getUnitGroupsForSystem(system);

  if (family === 'count') {
    return (groups.find((g) => g.label === 'COUNT')?.units ?? COUNT_UNITS).map((u) => ({
      value: u.value,
      label: u.label,
      family: 'count',
    }));
  }

  if (family) {
    const groupLabel = family.toUpperCase();
    return (groups.find((g) => g.label === groupLabel)?.units ?? []).map((u) => ({
      value: u.value,
      label: u.label,
      family,
    }));
  }

  return getFlatUnitsForSystem(system).map((u) => ({
    value: u.value,
    label: u.label,
    family: getUnitFamily(u.value),
  }));
}

// Units valid for recipe batch size — must match yield_units table in Supabase
export const BATCH_UNITS = [
  { value: 'piece', label: 'piece' },
  { value: 'whole', label: 'whole' },
  { value: 'batch', label: 'batch' },
];

// recipe_category enum values — must match Supabase enum exactly
export const RECIPE_CATEGORIES = [
  { value: 'bakery', label: 'Bakery' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'main_course', label: 'Main course' },
  { value: 'snack', label: 'Snack' },
  { value: 'sauce_condiment', label: 'Sauce / Condiment' },
  { value: 'other', label: 'Other' },
];
