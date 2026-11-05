import { Suspense } from 'react';
import { AuthLoading, AuthShell } from '@/components/AuthShell';
import { buildPageMetadata } from '@/lib/seo';
import { appStoreLink, playStoreLink } from '@/lib/site';
import { SignupClient } from './SignupClient';

export const metadata = buildPageMetadata({
  title: 'Create a free account — CostMyDish',
  description:
    'Create a free CostMyDish account. Cost dishes on the web and in the iPhone and Android app with one login.',
  pathname: '/signup',
});

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Create your free account">
          <AuthLoading label="Loading…" />
        </AuthShell>
      }
    >
      <SignupClient appStoreHref={appStoreLink('signup')} playStoreHref={playStoreLink('signup')} />
    </Suspense>
  );
}
