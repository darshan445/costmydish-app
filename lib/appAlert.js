import { Alert } from 'react-native';
import useAppAlertStore from '../stores/appAlertStore';
import { isNativeModalOpen } from './nativeModal';

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
  // A themed alert can't open over another modal on iOS; the system alert always shows on top
  if (isNativeModalOpen()) {
    const buttons = [];
    if (secondaryLabel) buttons.push({ text: secondaryLabel, style: 'cancel', onPress: onSecondary });
    buttons.push({ text: primaryLabel, onPress: onPrimary });
    Alert.alert(title, message, buttons);
    return;
  }
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
