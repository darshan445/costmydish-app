import { ConfirmClient } from './ConfirmClient';

export const metadata = {
  title: 'Confirm Email — CostMyDish',
  description: 'Confirm your CostMyDish account email address.',
  robots: { index: false, follow: false },
};

export default function ConfirmPage() {
  return <ConfirmClient />;
}
