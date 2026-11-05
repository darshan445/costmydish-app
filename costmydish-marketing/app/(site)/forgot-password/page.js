import { ForgotPasswordClient } from './ForgotPasswordClient';

export const metadata = {
  title: 'Forgot password — CostMyDish',
  description: 'Get a link to reset your CostMyDish password.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
