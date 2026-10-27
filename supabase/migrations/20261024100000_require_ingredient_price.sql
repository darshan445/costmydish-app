-- Purchase price and quantity are required again (as before 20261023120000).
-- Unpriced rows only came from test builds; they are removed with their dish lines.

DELETE FROM public.recipe_ingredients ri
USING public.ingredients i
WHERE ri.ingredient_id = i.id
  AND (i.purchase_price IS NULL OR i.purchase_quantity IS NULL);

DELETE FROM public.ingredients
WHERE purchase_price IS NULL OR purchase_quantity IS NULL;

ALTER TABLE public.ingredients
  DROP CONSTRAINT IF EXISTS ingredients_purchase_pair_check,
  DROP CONSTRAINT IF EXISTS ingredients_purchase_price_check,
  DROP CONSTRAINT IF EXISTS ingredients_purchase_quantity_check;

ALTER TABLE public.ingredients
  ALTER COLUMN purchase_price SET NOT NULL,
  ALTER COLUMN purchase_quantity SET NOT NULL;

ALTER TABLE public.ingredients
  ADD CONSTRAINT ingredients_purchase_price_check CHECK (purchase_price > 0),
  ADD CONSTRAINT ingredients_purchase_quantity_check CHECK (purchase_quantity > 0);

COMMENT ON COLUMN public.ingredients.purchase_price IS
  'Price paid for purchase_quantity of purchase_unit.';
