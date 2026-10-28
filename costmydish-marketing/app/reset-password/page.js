import { ResetPasswordClient } from './ResetPasswordClient';

export const metadata = {
  title: 'Reset Password — CostMyDish',
  description: 'Reset your CostMyDish account password.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
