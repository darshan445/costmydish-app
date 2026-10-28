import { siteConfig } from '@/lib/site';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Privacy Policy — CostMyDish',
  description: 'How CostMyDish collects, uses, and protects your personal information.',
  pathname: '/privacy',
});

export default function PrivacyPage() {
  const { privacyEmail } = siteConfig;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-text">Privacy Policy</h1>
      <p className="mt-2 text-sm text-text-secondary">Last updated: June 9, 2026</p>

      <div className="prose-legal mt-8 space-y-4 text-sm">
        <p>
          CostMyDish (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains what data we collect,
          why we collect it, and your choices when using our mobile app and website.
        </p>

        <h2>1. Information we collect</h2>
        <p><strong>Account information</strong></p>
        <ul>
          <li>Email address and password (via Supabase Auth)</li>
          <li>Optional display name</li>
          <li>Subscription status (free or Hobbyist)</li>
        </ul>
        <p><strong>App data you provide</strong></p>
        <ul>
          <li>Ingredients, recipes, selling formats, and settings (currency, food cost targets)</li>
          <li>Ingredient price history when prices change</li>
        </ul>
        <p><strong>Payment information</strong></p>
        <p>
          We do not collect or store payment card details. Purchases are handled entirely by Apple App Store
          or Google Play through RevenueCat. We receive subscription status only.
        </p>
        <p><strong>Technical data</strong></p>
        <ul>
          <li>Device type and app version for support and stability</li>
          <li>Standard server logs from our hosting providers</li>
        </ul>

        <h2>2. How we use your information</h2>
        <ul>
          <li>Provide and sync your recipes and ingredients across devices</li>
          <li>Authenticate your account and enforce subscription features</li>
          <li>Calculate costs and display margins within the app</li>
          <li>Improve reliability and fix bugs</li>
          <li>Respond to support requests</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>

        <h2>3. Third-party services</h2>
        <p>We use trusted providers to operate CostMyDish:</p>
        <ul>
          <li><strong>Supabase</strong> — authentication, database, and file storage (data encrypted in transit)</li>
          <li><strong>RevenueCat</strong> — subscription management linked to your App Store / Play account</li>
          <li><strong>Apple / Google</strong> — payment processing for subscriptions</li>
        </ul>
        <p>Each provider has its own privacy policy governing their handling of data.</p>

        <h2>4. Data retention & deletion</h2>
        <p>
          We retain your data while your account is active. You may delete your account from the app Settings
          screen, which permanently removes your recipes, ingredients, and profile data from our systems,
          subject to short backup retention periods.
        </p>

        <h2>5. Security</h2>
        <p>
          We use industry-standard measures including HTTPS, row-level security on database tables so users
          only access their own data, and secure authentication tokens. No method of transmission over the
          internet is 100% secure; we cannot guarantee absolute security.
        </p>

        <h2>6. Your rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access or export your data</li>
          <li>Correct inaccurate information</li>
          <li>Delete your account and associated data</li>
          <li>Object to or restrict certain processing</li>
        </ul>
        <p>
          Contact us at{' '}
          <a href={`mailto:${privacyEmail}`} className="text-primary underline">{privacyEmail}</a>{' '}
          to exercise these rights.
        </p>

        <h2>7. Children</h2>
        <p>
          CostMyDish is not directed at children under 13. We do not knowingly collect personal information
          from children. Contact us if you believe a child has provided us data.
        </p>

        <h2>8. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy periodically. The &quot;Last updated&quot; date at the top will
          reflect changes. Significant updates may be notified in-app.
        </p>

        <h2>9. Contact</h2>
        <p>
          Privacy questions:{' '}
          <a href={`mailto:${privacyEmail}`} className="text-primary underline">{privacyEmail}</a>
        </p>
      </div>
    </article>
  );
}
