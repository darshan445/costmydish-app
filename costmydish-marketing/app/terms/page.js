import { siteConfig } from '@/lib/site';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Terms & Conditions — CostMyDish',
  description: 'Terms and conditions for using the CostMyDish mobile application and services.',
  pathname: '/terms',
});

export default function TermsPage() {
  const { supportEmail } = siteConfig;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-text">Terms & Conditions</h1>
      <p className="mt-2 text-sm text-text-secondary">Last updated: June 9, 2026</p>

      <div className="prose-legal mt-8 space-y-4 text-sm">
        <p>
          These Terms & Conditions (&quot;Terms&quot;) govern your use of the CostMyDish mobile application
          and related services (&quot;Service&quot;) operated by CostMyDish (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
          By creating an account or using the Service, you agree to these Terms.
        </p>

        <h2>1. The Service</h2>
        <p>
          CostMyDish is a recipe and ingredient costing tool. It helps you track ingredient purchase prices,
          calculate recipe costs, analyse selling formats, and estimate margins based on food cost targets you set.
          Calculations are estimates for planning purposes — you are responsible for verifying prices and costs
          in your own kitchen or business.
        </p>

        <h2>2. Accounts</h2>
        <p>You must provide accurate information when registering. You are responsible for:</p>
        <ul>
          <li>Keeping your login credentials secure</li>
          <li>All activity under your account</li>
          <li>Notifying us of unauthorised access</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these Terms or applicable law.</p>

        <h2>3. Subscriptions & billing</h2>
        <p>
          CostMyDish offers a free tier and paid &quot;Hobbyist&quot; subscriptions. Paid plans are processed by
          Apple App Store or Google Play via RevenueCat. Payment, renewal, cancellation, and refunds are
          subject to the store&apos;s terms — not CostMyDish directly.
        </p>
        <ul>
          <li>Free plan: limited recipes and ingredients as described in the app</li>
          <li>Hobbyist plan: unlimited recipes and ingredients, price history, and cloud sync</li>
          <li>Subscriptions auto-renew unless cancelled through your store account settings</li>
        </ul>

        <h2>4. Your data</h2>
        <p>
          You retain ownership of recipes, ingredients, and other content you enter. You grant us a licence
          to store, process, and display that data solely to provide the Service. See our{' '}
          <a href="/privacy" className="text-primary underline">Privacy Policy</a> for how we handle personal information.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for unlawful purposes</li>
          <li>Attempt to access other users&apos; data or our systems without authorisation</li>
          <li>Reverse engineer, scrape, or resell the Service</li>
          <li>Upload malicious code or interfere with Service operation</li>
        </ul>

        <h2>6. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. We do not guarantee that
          cost calculations, margin estimates, or suggested prices will be accurate for your specific suppliers,
          yields, or market conditions. CostMyDish is not financial, tax, or professional food-service advice.
        </p>

        <h2>7. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, CostMyDish shall not be liable for indirect, incidental,
          special, or consequential damages arising from your use of the Service, including lost profits or
          pricing errors. Our total liability shall not exceed the amount you paid us in the twelve months
          preceding the claim, or USD $50 if you use the free plan.
        </p>

        <h2>8. Changes</h2>
        <p>
          We may update these Terms from time to time. Material changes will be communicated in-app or on
          this page. Continued use after changes constitutes acceptance.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions about these Terms? Email{' '}
          <a href={`mailto:${supportEmail}`} className="text-primary underline">{supportEmail}</a>.
        </p>
      </div>
    </article>
  );
}
