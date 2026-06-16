import useAppAlertStore from '../stores/appAlertStore';

/**
 * Show a themed in-app alert (replaces Alert.alert for subscription flows).
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {'success'|'info'|'warning'|'error'} [options.variant]
 * @param {string} [options.primaryLabel]
 * @param {() => void} [options.onPrimary]
 * @param {string} [options.secondaryLabel]
 * @param {() => void} [options.onSecondary]
 */
export function showAppAlert({
  title,
  message,
  variant = 'info',
  primaryLabel = 'OK',
  onPrimary,
  secondaryLabel,
  onSecondary,
}) {
  useAppAlertStore.getState().show({
    title,
    message,
    variant,
    primaryLabel,
    onPrimary,
    secondaryLabel,
    onSecondary,
  });
}
