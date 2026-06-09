// Unit families for measurement_unit enum — must match Supabase enum exactly
export const UNIT_FAMILIES = {
  weight: ['kg', 'g', 'lb', 'oz'],
  volume: ['l', 'ml', 'fl_oz', 'cup', 'tbsp', 'tsp'],
  count: ['piece', 'each'],
};

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
  piece: 'piece',
  each: 'each',
};

// All valid measurement_unit enum values (ingredients + recipe_ingredients)
export const ALL_UNITS = [
  { value: 'kg', label: 'kg', family: 'weight' },
  { value: 'g', label: 'g', family: 'weight' },
  { value: 'lb', label: 'lb', family: 'weight' },
  { value: 'oz', label: 'oz', family: 'weight' },
  { value: 'l', label: 'L', family: 'volume' },
  { value: 'ml', label: 'ml', family: 'volume' },
  { value: 'fl_oz', label: 'fl oz', family: 'volume' },
  { value: 'cup', label: 'cup', family: 'volume' },
  { value: 'tbsp', label: 'tbsp', family: 'volume' },
  { value: 'tsp', label: 'tsp', family: 'volume' },
  { value: 'piece', label: 'piece', family: 'count' },
  { value: 'each', label: 'each', family: 'count' },
];

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
