import Link from 'next/link';
import { MARKETING_FAQ, SUPPORT_FAQ } from '@/lib/faqs';
import { buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'Contact & Support — CostMyDish Food Cost Calculator',
  description: 'Get help with CostMyDish. Contact support for app bugs, billing, subscriptions, and privacy requests.',
  pathname: '/contact',
});

const FAQ = [...MARKETING_FAQ, ...SUPPORT_FAQ];
export default function ContactPage() {
  const { supportEmail, privacyEmail } = siteConfig;

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">Support</p>
        <h1 className="mt-2 text-3xl font-extrabold text-text sm:text-4xl">Contact & Support</h1>
        <p className="mt-4 text-lg text-text-secondary">
          We&apos;re here to help — reach out any time.
        </p>

        <div className="mt-10 space-y-4">
          <article className="rounded-2xl border border-border border-l-4 border-l-primary bg-surface p-8 shadow-md">
            <h2 className="text-xl font-bold text-text">General support</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              For all questions — app bugs, login problems, billing, subscriptions, feature requests, and privacy requests. This is your main line to our team.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-5 inline-block text-sm font-semibold text-primary underline hover:text-primary-dark"
            >
              {supportEmail}
            </a>
          </article>

          <article className="rounded-2xl border border-border bg-surface-alt p-5">
            <h2 className="text-base font-semibold text-text-secondary">Formal privacy requests only</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary/90">
              For formal data access, correction, or deletion requests under GDPR or applicable privacy law.
            </p>
            <a
              href={`mailto:${privacyEmail}`}
              className="mt-4 inline-block text-sm font-medium text-text-secondary underline hover:text-primary"
            >
              {privacyEmail}
            </a>
          </article>

          <p className="text-xs leading-relaxed text-text-secondary">
            For general questions, {supportEmail} handles everything including privacy queries.
          </p>
        </div>

        <div className="mt-10 rounded-2xl bg-surface-alt p-6">
          <h2 className="text-lg font-bold text-text">Response time</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            We aim to reply within 1–2 business days. Include your account email and, if relevant,
            your device (iOS/Android) and app version so we can help faster.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-bold text-text">Frequently asked questions</h2>
          <div className="mt-6 space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-surface px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-semibold text-text marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-primary transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        <p className="mt-10 text-sm text-text-secondary">
          See also our{' '}
          <Link href="/terms" className="text-primary underline">Terms & Conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
