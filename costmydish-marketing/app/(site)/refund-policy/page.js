import { siteConfig } from '@/lib/site';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Refund Policy — CostMyDish',
  description: 'How refunds work for CostMyDish Hobbyist subscriptions bought on the website, App Store, or Google Play.',
  pathname: '/refund-policy',
});

export default function RefundPolicyPage() {
  const { supportEmail } = siteConfig;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-text">Refund Policy</h1>
      <p className="mt-2 text-sm text-text-secondary">Last updated: November 5, 2026</p>

      <div className="prose-legal mt-8 space-y-4 text-sm">
        <p>
          This policy explains how refunds work for paid CostMyDish &quot;Hobbyist&quot; subscriptions. How you
          request a refund depends on where you bought your subscription.
        </p>

        <h2>1. Subscriptions bought on our website</h2>
        <p>
          Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record
          for all our website orders. Paddle provides all customer service inquiries and handles returns.
        </p>
        <ul>
          <li>You can request a full refund within 14 days of your first purchase or of any renewal payment.</li>
          <li>
            To request a refund, reply to your Paddle receipt email, visit{' '}
            <a href="https://paddle.net" className="text-primary underline" target="_blank" rel="noopener noreferrer">paddle.net</a>, or email us at{' '}
            <a href={`mailto:${supportEmail}`} className="text-primary underline">{supportEmail}</a> and we&apos;ll help.
          </li>
          <li>Refunds go back to the original payment method. Once refunded, your account returns to the free plan.</li>
        </ul>

        <h2>2. Subscriptions bought in the mobile app</h2>
        <p>
          Purchases made in the iOS or Android app are processed by Apple or Google, and refunds are handled by
          them under their own policies. We can&apos;t issue refunds for these purchases directly.
        </p>
        <ul>
          <li>
            App Store: request a refund at{' '}
            <a href="https://reportaproblem.apple.com" className="text-primary underline" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a>.
          </li>
          <li>
            Google Play: request a refund from your{' '}
            <a href="https://play.google.com/store/account/orderhistory" className="text-primary underline" target="_blank" rel="noopener noreferrer">Google Play order history</a>.
          </li>
        </ul>

        <h2>3. Cancelling</h2>
        <p>
          You can cancel at any time. Cancelling stops future renewals, and you keep Hobbyist features until the end
          of the period you&apos;ve already paid for. Website subscriptions can be cancelled from your account
          settings or via your Paddle receipt; app subscriptions from your App Store or Google Play account.
        </p>

        <h2>4. Your legal rights</h2>
        <p>
          Nothing in this policy limits any rights you have under the consumer laws of your country.
        </p>

        <h2>5. Contact</h2>
        <p>
          Questions about refunds? Email{' '}
          <a href={`mailto:${supportEmail}`} className="text-primary underline">{supportEmail}</a>.
        </p>
      </div>
    </article>
  );
}
