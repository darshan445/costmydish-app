import { AppAlertModal } from './AppAlertModal';
import useAppAlertStore from '../../stores/appAlertStore';

/** Mount once at app root to render global themed alerts. */
export function AppAlertHost() {
  const alert = useAppAlertStore((s) => s.alert);
  const dismiss = useAppAlertStore((s) => s.dismiss);

  if (!alert) return null;

  return (
    <AppAlertModal
      visible
      onClose={dismiss}
      title={alert.title}
      message={alert.message}
      variant={alert.variant}
      primaryLabel={alert.primaryLabel}
      onPrimary={alert.onPrimary}
      secondaryLabel={alert.secondaryLabel}
      onSecondary={alert.onSecondary}
    />
  );
}
