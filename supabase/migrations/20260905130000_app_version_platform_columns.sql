-- Platform-specific store versions (kept fresh by sync-app-versions edge function).
-- App prefers live App Store / Play fetch; these columns are fallback only.

ALTER TABLE public.app_version_config
  ADD COLUMN IF NOT EXISTS ios_latest_version text,
  ADD COLUMN IF NOT EXISTS android_latest_version text;

COMMENT ON COLUMN public.app_version_config.ios_latest_version IS
  'Latest App Store marketing version — auto-synced; client may also fetch live.';
COMMENT ON COLUMN public.app_version_config.android_latest_version IS
  'Latest Play Store marketing version — auto-synced; client may also fetch live.';
