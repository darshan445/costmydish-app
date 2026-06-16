const t0 = Date.now();

const BOOT_TIMEOUT_MS = 10_000;

/** Timestamped boot trace — uses console.warn so it appears in release APK logcat. */
export function bootLog(step, extra) {
  const suffix = extra !== undefined ? ` ${JSON.stringify(extra)}` : '';
  console.warn(`[Boot +${Date.now() - t0}ms] ${step}${suffix}`);
}

export function isBootDebug() {
  return __DEV__ || process.env.EXPO_PUBLIC_BOOT_DEBUG === 'true';
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
