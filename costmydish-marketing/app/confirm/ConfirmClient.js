'use client';

import { useEffect, useState } from 'react';
import {
  AuthButton,
  AuthField,
  AuthLoading,
  AuthMessage,
  AuthShell,
} from '@/components/AuthShell';
import { APP_DEEP_LINK, establishSessionFromUrl } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export function ConfirmClient() {
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function verify() {
      try {
        const supabase = getSupabase();
        const { session, error } = await establishSessionFromUrl(supabase);

        if (!active) return;

        if (session) {
          setStatus('success');
          return;
        }

        setErrorMessage(error?.message ?? '');
        setStatus('error');
      } catch (err) {
        if (!active) return;
        setErrorMessage(err?.message ?? 'Could not verify link.');
        setStatus('error');
      }
    }

    verify();

    return () => {
      active = false;
    };
  }, []);

  async function handleResend(event) {
    event.preventDefault();
    setResendStatus('loading');
    setResendMessage('');

    if (!email.trim()) {
      setResendStatus('error');
      setResendMessage('Enter your email address.');
      return;
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        setResendStatus('error');
        setResendMessage(error.message);
        return;
      }

      setResendStatus('success');
      setResendMessage('Confirmation email sent. Check your inbox.');
    } catch {
      setResendStatus('error');
      setResendMessage('Could not resend confirmation. Try again.');
    }
  }

  if (status === 'loading') {
    return (
      <AuthShell title="Confirming your email" description="Please wait while we verify your link.">
        <AuthLoading />
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell
        title="Email confirmed!"
        description="Your account is ready. Open CostMyDish to get started."
      >
        <AuthButton href={APP_DEEP_LINK}>Open CostMyDish</AuthButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Link expired or invalid"
      description="This confirmation link may have expired. Request a new one below."
    >
      {errorMessage ? <AuthMessage>{errorMessage}</AuthMessage> : null}
      <form className={`space-y-4 ${errorMessage ? 'mt-4' : ''}`} onSubmit={handleResend}>
        <AuthField
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />

        {resendMessage ? (
          <AuthMessage variant={resendStatus === 'success' ? 'success' : 'error'}>
            {resendMessage}
          </AuthMessage>
        ) : null}

        <AuthButton type="submit" disabled={resendStatus === 'loading'}>
          {resendStatus === 'loading' ? 'Sending…' : 'Resend confirmation'}
        </AuthButton>
      </form>
    </AuthShell>
  );
}
