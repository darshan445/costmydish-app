'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, use, useEffect } from 'react';
import { AuthLoading } from '@/components/AuthShell';
import { useAuthSession } from '@/lib/web-auth';
import { DashboardShell } from './DashboardShell';

const DashboardUserContext = createContext(null);

/** Signed-in Supabase user for pages inside /dashboard. */
export function useDashboardUser() {
  return use(DashboardUserContext);
}

/** Sends signed-out visitors to /login and comes back here after they sign in. */
export function DashboardGate({ getApp, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuthSession();

  useEffect(() => {
    if (status === 'signedOut') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status !== 'signedIn' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <AuthLoading label={status === 'signedOut' ? 'Taking you to sign in…' : 'Loading your account…'} />
      </div>
    );
  }

  return (
    <DashboardUserContext value={user}>
      <DashboardShell user={user} getApp={getApp}>{children}</DashboardShell>
    </DashboardUserContext>
  );
}
