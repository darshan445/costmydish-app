'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AuthButton,
  AuthField,
  AuthLoading,
  AuthMessage,
  AuthPasswordField,
  AuthShell,
  SameAccountNote,
} from '@/components/AuthShell';
import {
  emailError,
  friendlyAuthError,
  safeNextPath,
  signInWithEmail,
  useAuthSession,
} from '@/lib/web-auth';

export function LoginClient({ appStoreHref, playStoreHref }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const { status } = useAuthSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'signedIn') router.replace(next);
  }, [status, next, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const fieldErrors = { email: emailError(email), password: password ? null : 'Password is required' };
    setErrors(fieldErrors);
    if (fieldErrors.email || fieldErrors.password) return;

    setSubmitting(true);
    try {
      await signInWithEmail({ email, password });
      router.replace(next);
    } catch (error) {
      setFormError(friendlyAuthError(error));
      setSubmitting(false);
    }
  }

  if (status !== 'signedOut') {
    return (
      <AuthShell title="Sign in to CostMyDish">
        <AuthLoading label={status === 'signedIn' ? 'Opening your dashboard…' : 'Loading…'} />
      </AuthShell>
    );
  }

  const signupHref = next === '/dashboard' ? '/signup' : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title="Sign in to CostMyDish"
      description="Use the same email and password as the CostMyDish app."
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
          autoFocus
        />
        <AuthPasswordField
          id="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          error={errors.password}
          visible={showPassword}
          onToggle={() => setShowPassword((visible) => !visible)}
        />
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {formError ? <AuthMessage>{formError}</AuthMessage> : null}

        <AuthButton type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        New to CostMyDish?{' '}
        <Link href={signupHref} className="font-semibold text-primary hover:underline">
          Create a free account
        </Link>
      </p>

      <SameAccountNote appStoreHref={appStoreHref} playStoreHref={playStoreHref} />
    </AuthShell>
  );
}
