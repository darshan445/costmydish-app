-- The suggested price is saved as the default format's selling_price like any
-- other price, so no separate flag is needed. Restores save_recipe without
-- price_is_suggested, then drops the column.

CREATE OR REPLACE FUNCTION public.save_recipe(
  p_recipe_id uuid,
  p_recipe jsonb,
  p_ingredients jsonb,
  p_formats jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_recipe_id uuid;
  v_name text := btrim(coalesce(p_recipe->>'name', ''));
  v_ingredient_count int;
  v_owned_count int;
  v_default_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'Recipe name is required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_ingredients) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Ingredients must be an array' USING ERRCODE = '22023';
  END IF;

  IF p_recipe_id IS NULL AND jsonb_array_length(p_ingredients) = 0 THEN
    RAISE EXCEPTION 'At least one ingredient is required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_formats) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_formats) = 0 THEN
    RAISE EXCEPTION 'At least one selling format is required' USING ERRCODE = '22023';
  END IF;

  -- Ingredients must belong to the caller (recipe_ingredients RLS only checks the recipe).
  SELECT count(DISTINCT x.ingredient_id) INTO v_ingredient_count
  FROM jsonb_to_recordset(p_ingredients) AS x(ingredient_id uuid);

  SELECT count(*) INTO v_owned_count
  FROM public.ingredients i
  WHERE i.user_id = v_uid
    AND i.id IN (SELECT x.ingredient_id FROM jsonb_to_recordset(p_ingredients) AS x(ingredient_id uuid));

  IF v_owned_count <> v_ingredient_count THEN
    RAISE EXCEPTION 'Unknown ingredient' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) FILTER (WHERE coalesce(x.is_default, false))
  INTO v_default_count
  FROM jsonb_to_recordset(p_formats) AS x(is_default boolean);

  IF v_default_count > 1 THEN
    RAISE EXCEPTION 'Only one default selling format is allowed' USING ERRCODE = '22023';
  END IF;

  IF p_recipe_id IS NULL THEN
    INSERT INTO public.recipes (user_id, name, description, category, target_food_cost_percent)
    VALUES (
      v_uid,
      v_name,
      nullif(btrim(coalesce(p_recipe->>'description', '')), ''),
      coalesce((p_recipe->>'category')::public.recipe_category, 'other'),
      coalesce((p_recipe->>'target_food_cost_percent')::numeric, 30)
    )
    RETURNING id INTO v_recipe_id;
  ELSE
    UPDATE public.recipes r
    SET
      name = v_name,
      description = CASE
        WHEN p_recipe ? 'description' THEN nullif(btrim(coalesce(p_recipe->>'description', '')), '')
        ELSE r.description
      END,
      category = coalesce((p_recipe->>'category')::public.recipe_category, r.category),
      target_food_cost_percent = coalesce((p_recipe->>'target_food_cost_percent')::numeric, r.target_food_cost_percent)
    WHERE r.id = p_recipe_id
      AND r.user_id = v_uid
    RETURNING r.id INTO v_recipe_id;

    IF v_recipe_id IS NULL THEN
      RAISE EXCEPTION 'Recipe not found' USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM public.recipe_ingredients WHERE recipe_id = v_recipe_id;
    DELETE FROM public.recipe_selling_formats WHERE recipe_id = v_recipe_id;
  END IF;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes)
  SELECT v_recipe_id, x.ingredient_id, x.quantity, x.unit, nullif(btrim(coalesce(x.notes, '')), '')
  FROM jsonb_to_recordset(p_ingredients)
    AS x(ingredient_id uuid, quantity numeric, unit public.measurement_unit, notes text);

  INSERT INTO public.recipe_selling_formats (
    recipe_id, name, selling_unit_id, unit_quantity, selling_price, is_default
  )
  SELECT
    v_recipe_id,
    coalesce(nullif(btrim(coalesce(e.value->>'name', '')), ''), 'Default'),
    (e.value->>'selling_unit_id')::uuid,
    coalesce((e.value->>'unit_quantity')::numeric, 1),
    (e.value->>'selling_price')::numeric,
    CASE
      WHEN v_default_count = 0 THEN e.ord = 1
      ELSE coalesce((e.value->>'is_default')::boolean, false)
    END
  FROM jsonb_array_elements(p_formats) WITH ORDINALITY AS e(value, ord);

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_recipe(uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_recipe(uuid, jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_recipe(uuid, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_recipe(uuid, jsonb, jsonb, jsonb) TO service_role;

ALTER TABLE public.recipe_selling_formats DROP COLUMN IF EXISTS price_is_suggested;
