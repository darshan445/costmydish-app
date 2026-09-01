import { PostHogProvider } from 'posthog-react-native';
import { posthogStorage } from './posthogStorage';

export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
export const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

/** Send events to PostHog in release builds when API key is set. */
export const POSTHOG_CAPTURE_ENABLED = true;

export function isPostHogConfigured() {
  return POSTHOG_API_KEY.length > 0;
}

export function PostHogRoot({ children }) {
  if (!isPostHogConfigured()) {
    return children;
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        customStorage: posthogStorage,
        disabled: !POSTHOG_CAPTURE_ENABLED || __DEV__,
        enableSessionReplay: false,
      }}
    >
      {children}
    </PostHogProvider>
  );
}
