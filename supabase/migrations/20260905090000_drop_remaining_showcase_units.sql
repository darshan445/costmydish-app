-- Remap leftover showcase selling units onto canonical ones, then delete them

UPDATE public.recipe_selling_formats rsf
SET selling_unit_id = canon.id
FROM public.selling_units showcase
JOIN public.selling_units canon ON canon.name = CASE showcase.name
  WHEN 'showcase_cake' THEN 'whole'
  WHEN 'showcase_pizza' THEN 'whole'
  WHEN 'showcase_burger' THEN 'piece'
  WHEN 'showcase_taco' THEN 'piece'
  ELSE 'serving'
END
WHERE rsf.selling_unit_id = showcase.id
  AND showcase.name LIKE 'showcase_%';

DELETE FROM public.selling_units
WHERE name LIKE 'showcase_%';
