-- Unit system preference + additional measurement units

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS unit_system text NOT NULL DEFAULT 'metric';

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_unit_system_check;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_unit_system_check
  CHECK (unit_system IN ('metric', 'imperial'));

UPDATE public.user_settings
SET unit_system = 'metric'
WHERE unit_system IS NULL;

-- Add gallon, quart, pint, dozen to measurement_unit enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'measurement_unit' AND e.enumlabel = 'gallon'
  ) THEN
    ALTER TYPE public.measurement_unit ADD VALUE 'gallon';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'measurement_unit' AND e.enumlabel = 'quart'
  ) THEN
    ALTER TYPE public.measurement_unit ADD VALUE 'quart';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'measurement_unit' AND e.enumlabel = 'pint'
  ) THEN
    ALTER TYPE public.measurement_unit ADD VALUE 'pint';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'measurement_unit' AND e.enumlabel = 'dozen'
  ) THEN
    ALTER TYPE public.measurement_unit ADD VALUE 'dozen';
  END IF;
END $$;
