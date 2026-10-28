'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthButton, AuthLoading, AuthMessage, AuthShell } from '@/components/AuthShell';
import { APP_DEEP_LINK, establishSessionFromUrl } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export function ResetPasswordClient() {
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function verify() {
      try {
        const supabase = getSupabase();
        const { session, error } = await establishSessionFromUrl(supabase);

        if (!active) return;

        if (session) {
          router.replace('/update-password');
          return;
        }

        setErrorMessage(error?.message ?? '');
        setStatus('error');
      } catch (err) {
        if (!active) return;
        setErrorMessage(err?.message ?? 'Could not verify reset link.');
        setStatus('error');
      }
    }

    verify();

    return () => {
      active = false;
    };
  }, [router]);

  if (status === 'loading') {
    return (
      <AuthShell title="Reset your password" description="Verifying your reset link.">
        <AuthLoading />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Link expired"
      description="This password reset link is invalid or has expired. Request a new one from the app."
    >
      {errorMessage ? <AuthMessage>{errorMessage}</AuthMessage> : null}
      <div className={errorMessage ? 'mt-4' : ''}>
        <AuthButton href={APP_DEEP_LINK}>Back to app</AuthButton>
      </div>
    </AuthShell>
  );
}
