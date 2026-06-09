---
name: Restaurant Owner UX
overview: "Five targeted improvements to make the app genuinely useful to a restaurant owner: fix misleading dashboard stats, surface over-target dishes immediately, show recipe impact after a price change, clarify batch size input, and give the Recipes tab a menu-health overview layout."
todos:
  - id: "1"
    content: Fix dashboard stat cards — replace 'Your recipes' with 'Over Target' count
    status: pending
  - id: "2"
    content: Add 'Needs Attention' section on dashboard for over-target recipes
    status: pending
  - id: "3"
    content: Show recipe impact bottom sheet after ingredient price update
    status: pending
  - id: "4"
    content: Update batch size hint text on create and edit recipe screens
    status: pending
  - id: "5"
    content: Replace Recipes tab card list with compact menu-overview table layout
    status: pending
isProject: false
---

# Restaurant Owner UX Improvements

## Change 1 — Fix Dashboard stats

**File:** [`app/(tabs)/index.jsx`](app/(tabs)/index.jsx)

Replace the two confusing stat cards ("Recipes" + "Your recipes") with two meaningful ones:

- **Total Recipes** — `recipes.length`
- **Over Target** — count of recipes where `costSummaries[id]?.marginStatus === 'danger'`, shown in red when non-zero

Remove the redundant "Your recipes" card entirely.

---

## Change 2 — "Needs Attention" section on Dashboard

**File:** [`app/(tabs)/index.jsx`](app/(tabs)/index.jsx)

Add a section directly below the stat cards, only visible when at least one recipe is over target:

```
NEEDS ATTENTION
┌─────────────────────────────────────┐
│ Butter Chicken   38.2% food cost    │  ← red badge
│ Target was 30%                      │
└─────────────────────────────────────┘
```

- Filter `costSummaries` for `marginStatus === 'danger'`
- Each row shows recipe name + actual food cost % + how far above target
- Tap row navigates to `/recipe/[id]`
- Section is hidden when all dishes are on target (good state = green message "All dishes on target")

---

## Change 3 — Recipe impact after ingredient price change

**Files:** [`app/ingredient/edit/[id].jsx`](app/ingredient/edit/[id].jsx), [`stores/recipeStore.js`](stores/recipeStore.js)

After a successful `updateIngredient` save:

1. Query `recipe_ingredients` to find which recipe IDs use this ingredient
2. Call `fetchRecipes()` to recompute all cost summaries with the new price
3. Cross-reference — show a bottom sheet before navigating back:

```
Price Updated
─────────────────────────────
Chicken updated to ₹320/kg

2 recipes affected
  Butter Chicken  → now 38% ⬆ over target
  Chicken Biryani → 27% ✓ still on target

[Got it]
```

- This is a read-only modal — no action needed, just awareness
- The helper function lives in the ingredient edit screen, querying Supabase + reading the refreshed `costSummaries`

---

## Change 4 — Batch size helper text

**Files:** [`app/recipe/create.jsx`](app/recipe/create.jsx), [`app/recipe/edit/[id].jsx`](app/recipe/edit/[id].jsx)

Update the `hint` prop on the batch size `Input` to:

> "Enter total ingredients for the whole batch — we'll calculate cost per serving."

(Already partially done with a different message — just update the copy.)

---

## Change 5 — Recipes tab menu overview

**File:** [`app/(tabs)/recipes.jsx`](app/(tabs)/recipes.jsx)

Replace the card-based FlatList with a compact table layout. Add a sticky column header row, then one compact row per recipe:

```
DISH              COST/SRV   PRICE    MARGIN
─────────────────────────────────────────────
Butter Chicken    ₹96        ₹320     70%  ✓
Rotli             ₹0.70      —        —
Cookies           ₹14.50     ₹48      70%  ✓
```

- Columns: Dish name | Cost/serving | Selling price (or "—") | Margin % with color badge
- Tapping a row still navigates to the recipe detail
- Delete icon remains at the far right
- This replaces `RecipeCard` in this screen only — `RecipeCard` stays for the dashboard

---

---

## Supabase DB changes required

### 1. RLS policy on `recipe_ingredients` — required for Change 3

Change 3 queries `recipe_ingredients` by `ingredient_id` to find which recipes use a given ingredient. This query runs as the logged-in user, so the table needs an RLS SELECT policy. Run this in the SQL Editor:

```sql
-- Allow users to read recipe_ingredients that belong to their own recipes
CREATE POLICY "Users can view their own recipe_ingredients"
ON public.recipe_ingredients
FOR SELECT
USING (
  recipe_id IN (
    SELECT id FROM public.recipes WHERE user_id = auth.uid()
  )
);
```

If this policy already exists from initial setup, skip it — no harm in checking with `\d recipe_ingredients` in the SQL editor.

### 2. Index on `recipe_ingredients.ingredient_id` — recommended for Change 3

The impact query filters `recipe_ingredients` by `ingredient_id`. Without an index this is a full table scan. Add it once:

```sql
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id
ON public.recipe_ingredients (ingredient_id);
```

### 3. No other schema changes needed

- No new tables or columns
- No changes to the `recipe_cost_summary` view (not used — costs are calculated client-side)
- No enum changes (all unit types already added)
- No trigger changes

---

## Files changed summary

- [`app/(tabs)/index.jsx`](app/(tabs)/index.jsx) — stat cards + Needs Attention section
- [`app/(tabs)/recipes.jsx`](app/(tabs)/recipes.jsx) — table layout
- [`app/ingredient/edit/[id].jsx`](app/ingredient/edit/[id].jsx) — impact modal after price save
- [`app/recipe/create.jsx`](app/recipe/create.jsx) — batch hint text
- [`app/recipe/edit/[id].jsx`](app/recipe/edit/[id].jsx) — batch hint text