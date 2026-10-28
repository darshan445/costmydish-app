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

const MIN_PASSWORD_LENGTH = 6;

export function UpdatePasswordClient() {
  const [status, setStatus] = useState('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const supabase = getSupabase();
        const { session } = await establishSessionFromUrl(supabase);

        if (!active) return;

        if (session) {
          setStatus('ready');
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (!active) return;

        if (data.session) {
          setStatus('ready');
          return;
        }

        setStatus('no-session');
      } catch {
        if (active) setStatus('no-session');
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(error.message);
        setSubmitting(false);
        return;
      }

      setStatus('success');
    } catch {
      setFormError('Could not update password. Try again.');
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <AuthShell title="Update your password" description="Checking your session.">
        <AuthLoading />
      </AuthShell>
    );
  }

  if (status === 'no-session') {
    return (
      <AuthShell
        title="Link expired"
        description="Your reset session has expired. Request a new password reset link from the app."
      >
        <AuthButton href={APP_DEEP_LINK}>Back to app</AuthButton>
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell
        title="Password updated!"
        description="Your new password is set. Open the app to sign in."
      >
        <AuthButton href={APP_DEEP_LINK}>Open the app</AuthButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" description="Choose a strong password for your account.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthField
          id="password"
          label="New password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        <AuthField
          id="confirm-password"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
        />

        {formError ? <AuthMessage>{formError}</AuthMessage> : null}

        <AuthButton type="submit" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </AuthButton>
      </form>
    </AuthShell>
  );
}
