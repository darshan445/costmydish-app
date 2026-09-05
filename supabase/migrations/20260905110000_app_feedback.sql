-- In-app feedback / support messages (replaces mailto support)

CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source text NOT NULL
    CHECK (source IN (
      'yes_prompt',
      'declined_prompt',
      'send_feedback_link',
      'settings'
    )),
  message text NOT NULL,
  dont_ask_again boolean NOT NULL DEFAULT false,
  platform text,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_feedback_user_id_idx
  ON public.app_feedback (user_id);

CREATE INDEX IF NOT EXISTS app_feedback_created_at_idx
  ON public.app_feedback (created_at DESC);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feedback" ON public.app_feedback;
CREATE POLICY "Users insert own feedback"
  ON public.app_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own feedback" ON public.app_feedback;
CREATE POLICY "Users read own feedback"
  ON public.app_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.app_feedback IS
  'User feedback and support messages from in-app forms (review prompt + Settings).';
