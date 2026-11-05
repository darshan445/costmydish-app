import { SettingsClient } from './SettingsClient';

export const metadata = {
  title: 'Settings — CostMyDish',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsClient />;
}
