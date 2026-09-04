-- Cloud-backed unfinished "calculate food cost" wizard draft (one per user)

CREATE TABLE IF NOT EXISTS public.food_cost_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  step smallint NOT NULL DEFAULT 1
    CHECK (step >= 1 AND step <= 3),
  dish jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  selling_formats jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_cost_drafts_updated_at_idx
  ON public.food_cost_drafts (updated_at DESC);

ALTER TABLE public.food_cost_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own food cost drafts" ON public.food_cost_drafts;
CREATE POLICY "Users manage own food cost drafts"
  ON public.food_cost_drafts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.food_cost_drafts IS
  'In-progress calculate-food-cost wizard state. One row per user; cleared when the dish is saved or discarded.';
