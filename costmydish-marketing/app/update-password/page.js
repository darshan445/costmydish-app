import { UpdatePasswordClient } from './UpdatePasswordClient';

export const metadata = {
  title: 'Update Password — CostMyDish',
  description: 'Set a new password for your CostMyDish account.',
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return <UpdatePasswordClient />;
}
