import { Suspense } from 'react';
import { AuthLoading, AuthShell } from '@/components/AuthShell';
import { buildPageMetadata } from '@/lib/seo';
import { appStoreLink, playStoreLink } from '@/lib/site';
import { LoginClient } from './LoginClient';

export const metadata = buildPageMetadata({
  title: 'Sign in — CostMyDish',
  description: 'Sign in to CostMyDish on the web with the same email and password you use in the app.',
  pathname: '/login',
});

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Sign in to CostMyDish">
          <AuthLoading label="Loading…" />
        </AuthShell>
      }
    >
      <LoginClient appStoreHref={appStoreLink('login')} playStoreHref={playStoreLink('login')} />
    </Suspense>
  );
}
