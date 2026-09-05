-- Latest published store version — bump after App Store / Play release.
-- Clients compare to installed app.json version; Settings shows update only when behind.

CREATE TABLE IF NOT EXISTS public.app_version_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  latest_version text NOT NULL,
  message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_version_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app version config" ON public.app_version_config;
CREATE POLICY "Anyone can read app version config"
  ON public.app_version_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Match current shipping version so existing installs do not see a false update nudge.
INSERT INTO public.app_version_config (id, latest_version, message)
VALUES (
  1,
  '1.2.5',
  'A newer version of CostMyDish is available. Update for the latest fixes and improvements.'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.app_version_config IS
  'Single-row config: set latest_version after each store release. App shows Settings update banner when installed version is older.';
