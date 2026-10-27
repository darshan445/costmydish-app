const t0 = Date.now();

const BOOT_TIMEOUT_MS = 10_000;

const BOOT_DEBUG = process.env.EXPO_PUBLIC_BOOT_DEBUG === 'true';

/** Opt-in via EXPO_PUBLIC_BOOT_DEBUG=true (set in the EAS preview profile). */
export function isBootDebug() {
  return BOOT_DEBUG;
}

/**
 * Timestamped boot trace. Release builds use console.warn so it shows in logcat;
 * dev uses console.log so it doesn't raise LogBox warnings over the app.
 */
export function bootLog(step, extra) {
  if (!BOOT_DEBUG) return;
  const suffix = extra !== undefined ? ` ${JSON.stringify(extra)}` : '';
  const line = `[Boot +${Date.now() - t0}ms] ${step}${suffix}`;
  if (__DEV__) console.log(line);
  else console.warn(line);
}

/** Reject if promise does not settle within ms (boot safety net). */
export function withBootTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export { BOOT_TIMEOUT_MS };
