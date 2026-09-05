-- Soft review prompt outcomes + cooldowns (per user, cloud — not device AsyncStorage)

CREATE TABLE IF NOT EXISTS public.review_prompt_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  never_ask boolean NOT NULL DEFAULT false,
  last_outcome text
    CHECK (last_outcome IS NULL OR last_outcome IN ('yes', 'declined', 'later')),
  last_soft_at timestamptz,
  last_native_at timestamptz,
  soft_ask_count integer NOT NULL DEFAULT 0
    CHECK (soft_ask_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_prompt_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own review prompt state" ON public.review_prompt_state;
CREATE POLICY "Users read own review prompt state"
  ON public.review_prompt_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own review prompt state" ON public.review_prompt_state;
CREATE POLICY "Users insert own review prompt state"
  ON public.review_prompt_state
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own review prompt state" ON public.review_prompt_state;
CREATE POLICY "Users update own review prompt state"
  ON public.review_prompt_state
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.review_prompt_state IS
  'Enjoying…? soft-ask outcomes and cooldowns. One row per user; synced across devices.';
