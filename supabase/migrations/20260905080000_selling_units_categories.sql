-- Expand recipe categories + clean selling unit catalog for menus

ALTER TYPE public.recipe_category ADD VALUE IF NOT EXISTS 'appetizer';
ALTER TYPE public.recipe_category ADD VALUE IF NOT EXISTS 'salad';
ALTER TYPE public.recipe_category ADD VALUE IF NOT EXISTS 'soup';
ALTER TYPE public.recipe_category ADD VALUE IF NOT EXISTS 'pasta';
ALTER TYPE public.recipe_category ADD VALUE IF NOT EXISTS 'pizza';
ALTER TYPE public.recipe_category ADD VALUE IF NOT EXISTS 'sandwich';
ALTER TYPE public.recipe_category ADD VALUE IF NOT EXISTS 'side';
ALTER TYPE public.recipe_category ADD VALUE IF NOT EXISTS 'bread';

-- Ensure canonical selling units exist (non-showcase)
INSERT INTO public.selling_units (name, label, is_system, sort_order)
SELECT v.name, v.label, true, v.sort_order
FROM (VALUES
  ('piece', 'Piece', 1),
  ('slice', 'Slice', 2),
  ('pack', 'Pack', 3),
  ('box', 'Box', 4),
  ('jar', 'Jar', 5),
  ('plate', 'Plate', 6),
  ('serving', 'Serving', 7),
  ('whole', 'Whole', 8),
  ('dozen', 'Dozen', 9),
  ('cup', 'Cup', 10)
) AS v(name, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.selling_units su WHERE su.name = v.name
);

-- Remap formats that used showcase_* duplicates onto canonical units (same label)
UPDATE public.recipe_selling_formats rsf
SET selling_unit_id = canon.id
FROM public.selling_units showcase
JOIN public.selling_units canon
  ON lower(canon.label) = lower(showcase.label)
 AND canon.name NOT LIKE 'showcase_%'
WHERE rsf.selling_unit_id = showcase.id
  AND showcase.name LIKE 'showcase_%';

-- Drop unused showcase duplicate units
DELETE FROM public.selling_units su
WHERE su.name LIKE 'showcase_%'
  AND NOT EXISTS (
    SELECT 1 FROM public.recipe_selling_formats rsf WHERE rsf.selling_unit_id = su.id
  );
