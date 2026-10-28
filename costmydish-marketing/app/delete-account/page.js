import Link from 'next/link';
import { siteConfig } from '@/lib/site';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = {
  ...buildPageMetadata({
    title: 'Delete Your Account — CostMyDish',
    description:
      'How to permanently delete your CostMyDish account, recipes, ingredients, and personal data.',
    pathname: '/delete-account',
  }),
  robots: { index: false, follow: false },
};

const DELETED_ITEMS = [
  'Your account and login credentials',
  'All recipes and ingredients you created',
  'Subscription data',
  'All associated personal data',
];

export default function DeleteAccountPage() {
  const { supportEmail } = siteConfig;
  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent('Delete My Account')}&body=${encodeURIComponent('Please delete my CostMyDish account.\n\nRegistered email: ')}`;

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold text-text sm:text-4xl">Delete Your Account</h1>
        <p className="mt-4 text-lg text-text-secondary">
          You can permanently delete your CostMyDish account at any time. Before you proceed, please
          understand what will be removed.
        </p>

        <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-bold text-text">What gets deleted</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Deleting your account will permanently remove:
          </p>
          <ul className="mt-4 space-y-2">
            {DELETED_ITEMS.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-text-secondary">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-text">How to delete your account</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <article className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Option 1</p>
              <h3 className="mt-2 text-lg font-bold text-text">Delete from within the app</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Open CostMyDish and go to{' '}
                <span className="font-semibold text-text">Settings → Account → Delete Account</span>.
                Follow the prompts to confirm deletion.
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Option 2</p>
              <h3 className="mt-2 text-lg font-bold text-text">Email request</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Send an email to{' '}
                <a
                  href={mailtoHref}
                  className="font-semibold text-primary underline hover:text-primary-dark"
                >
                  {supportEmail}
                </a>{' '}
                with the subject{' '}
                <span className="font-semibold text-text">&quot;Delete My Account&quot;</span> and
                include your registered email address in the body.
              </p>
            </article>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-bold text-red-800">Permanent deletion</h2>
            <p className="mt-2 text-sm leading-relaxed text-red-700">
              Account deletion is permanent and cannot be undone. Your recipes, ingredients, and
              account data will not be recoverable after deletion.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-alt p-6">
            <h2 className="text-lg font-bold text-text">Cancel subscriptions first</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              If you have an active Hobbyist subscription, cancel it before deleting your account.
              Subscriptions are managed through the App Store (iOS) or Google Play (Android) — open
              your store account → Subscriptions → CostMyDish → Cancel.
            </p>
          </div>
        </div>

        <p className="mt-10 text-sm text-text-secondary">
          See also our{' '}
          <Link href="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/contact" className="text-primary underline">
            Contact & Support
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
