---
name: Owner UX Full Plan
overview: "Two groups of changes: (A) recipe creation screen copy and defaults to eliminate confusion for a global restaurant owner, and (B) dashboard and recipes tab improvements to surface the metrics an owner actually acts on."
todos:
  - id: A1
    content: Rename BATCH SIZE section, rewrite input label and hint copy in create and edit screens
    status: completed
  - id: A2
    content: Change default batch unit to 'serving', reorder BATCH_UNITS chips in constants/units.js
    status: completed
  - id: A3
    content: Update selling price label to 'Menu price per portion' in create and edit screens
    status: completed
  - id: A4
    content: Improve target food cost % hint text in create and edit screens
    status: completed
  - id: B1
    content: Fix Dashboard stat cards — replace 'Your recipes' with 'Over Target' count
    status: completed
  - id: B2
    content: Add Needs Attention section on dashboard for over-target recipes
    status: completed
  - id: B3
    content: Show recipe impact bottom sheet after ingredient price update
    status: pending
  - id: B4
    content: Replace Recipes tab card list with compact menu-overview table layout
    status: completed
isProject: false
---

# Full Restaurant Owner UX Plan

---

## GROUP A — Recipe creation screen clarity

### A1 — Rename "BATCH SIZE" section and rewrite copy

**Files:** [`app/recipe/create.jsx`](app/recipe/create.jsx), [`app/recipe/edit/[id].jsx`](app/recipe/edit/[id].jsx)

| Location | Current | New |
|---|---|---|
| Section label | `BATCH SIZE` | `HOW MANY PORTIONS DOES THIS RECIPE MAKE?` |
| Input label | `"How many servings does this recipe make?"` or `"Batch size"` | `"Number of portions"` |
| Input hint | current text | `"Enter ingredients for the whole recipe above. We divide total cost by this number to get cost per portion."` |
| Unit label | `"Unit"` | `"Portion unit"` |

---

### A2 — Change default batch unit from `piece` to `serving`, reorder chips

**Files:** [`app/recipe/create.jsx`](app/recipe/create.jsx) (default value), [`constants/units.js`](constants/units.js) (`BATCH_UNITS` order)

Current `batch_unit` default: `'piece'`
New default: `'serving'`

Current `BATCH_UNITS` order: piece → dozen → pack → serving → batch
New order: **serving → piece → batch → dozen → pack**

Change in `constants/units.js`:
```js
export const BATCH_UNITS = [
  { value: 'serving', label: 'serving' },
  { value: 'piece',   label: 'piece' },
  { value: 'batch',   label: 'batch' },
  { value: 'dozen',   label: 'dozen' },
  { value: 'pack',    label: 'pack' },
];
```

Change in `create.jsx` `defaultValues`:
```js
batch_unit: 'serving',
```

---

### A3 — Fix hardcoded `$` in selling price label

**Files:** [`app/recipe/create.jsx`](app/recipe/create.jsx), [`app/recipe/edit/[id].jsx`](app/recipe/edit/[id].jsx)

Both screens already import `symbol` from `useSettingsStore`. The label already uses it:
```js
label={`Selling price per serving (${symbol}) — optional`}
```
Verify this is correct in both files and also update the label copy to say **"per portion"** instead of "per serving" to match the new section language:
```js
label={`Menu price per portion (${symbol}) — optional`}
```

---

### A4 — Improve target food cost % hint

**Files:** [`app/recipe/create.jsx`](app/recipe/create.jsx), [`app/recipe/edit/[id].jsx`](app/recipe/edit/[id].jsx)

Current hint: `"Industry standard: 25–35%"`

New hint:
```
"Of every $1 you charge, this % goes to ingredients. Restaurants typically target 28–35%."
```
(The `$` here is figurative/generic — acceptable in hint text since it's explaining a ratio concept, not a currency amount.)

---

## GROUP B — Dashboard and Recipes tab

### B1 — Fix Dashboard stat cards

**File:** [`app/(tabs)/index.jsx`](app/(tabs)/index.jsx)

Replace the two confusing cards:

| Before | After |
|---|---|
| "Recipes" (total) | "Total Recipes" (same number, clearer label) |
| "Your recipes" (non-sample count) | "Over Target" — count of recipes with `marginStatus === 'danger'`, value shown in red when > 0, green `✓` label when 0 |

The "Over Target" card is only meaningful when recipes have a selling price set. When count is 0, show a small green label "All good".

---

### B2 — "Needs Attention" section on Dashboard

**File:** [`app/(tabs)/index.jsx`](app/(tabs)/index.jsx)

Add a section between the stat cards and "Recent Recipes", only rendered when at least one recipe has `marginStatus === 'danger'`:

```
NEEDS ATTENTION  (red label)
┌──────────────────────────────────────┐
│ Butter Chicken    38.2%  +8.2% over  │  → tap opens recipe detail
└──────────────────────────────────────┘
```

Each row: recipe name + actual food cost % badge (red) + how many points over target. Tapping navigates to `/recipe/[id]`.

When all dishes are on target, show nothing (the "Over Target = 0 / All good" stat card already communicates this).

---

### B3 — Show recipe impact after ingredient price change

**Files:** [`app/ingredient/edit/[id].jsx`](app/ingredient/edit/[id].jsx)

After a successful price save:

1. Query `recipe_ingredients` for all `recipe_id` values where `ingredient_id = id`
2. Call `fetchRecipes()` to recompute `costSummaries` with the new price
3. Cross-reference affected recipe IDs with fresh `costSummaries`
4. Show a themed bottom sheet (using existing `Modal` component) before navigating back:

```
Price Updated
─────────────────────────────
Chicken updated to ₹320 / kg

2 recipes affected
  Butter Chicken  →  38.2%  ⚠ over target
  Dal Makhani     →  27.1%  ✓ on target

[Got it]
```

If zero recipes are affected, skip the modal and navigate back immediately.

**Supabase SQL required** (run before this change works):
```sql
-- RLS: let users query recipe_ingredients for their own recipes
CREATE POLICY "Users can view their own recipe_ingredients"
ON public.recipe_ingredients FOR SELECT
USING (
  recipe_id IN (SELECT id FROM public.recipes WHERE user_id = auth.uid())
);

-- Index for fast ingredient → recipe lookup
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id
ON public.recipe_ingredients (ingredient_id);
```

---

### B4 — Recipes tab compact menu-overview table

**File:** [`app/(tabs)/recipes.jsx`](app/(tabs)/recipes.jsx)

Replace the `RecipeCard` list with a compact table. Add a sticky column header, then one slim row per recipe:

```
DISH             COST/PORTION   PRICE    MARGIN
────────────────────────────────────────────────
Butter Chicken   ₹48            ₹320     85%  ✓
Dal Makhani      ₹32            —        —
Cookies          ₹14.50         ₹48      70%  ✓
```

- Columns: Name | Cost/portion | Menu price (or `—`) | Margin % with color dot
- Margin dot: green = good, amber = warning, red = danger
- Tap row → `/recipe/[id]`
- Delete icon stays at far right of each row
- `RecipeCard` component is untouched — still used on the Dashboard

---

## Files changed summary

**Group A (recipe form):**
- [`app/recipe/create.jsx`](app/recipe/create.jsx) — section label, input label/hint, default batch unit, selling price label
- [`app/recipe/edit/[id].jsx`](app/recipe/edit/[id].jsx) — same changes mirrored
- [`constants/units.js`](constants/units.js) — BATCH_UNITS reorder

**Group B (dashboard + recipes tab):**
- [`app/(tabs)/index.jsx`](app/(tabs)/index.jsx) — stat cards + Needs Attention section
- [`app/(tabs)/recipes.jsx`](app/(tabs)/recipes.jsx) — table layout
- [`app/ingredient/edit/[id].jsx`](app/ingredient/edit/[id].jsx) — price impact modal

**Supabase SQL (run before B3):**
- RLS policy on `recipe_ingredients`
- Index on `recipe_ingredients.ingredient_id`
