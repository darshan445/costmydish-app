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
import { useCurrencyCode } from '@/lib/use-currency';
import {
  MIN_PASSWORD_LENGTH,
  emailError,
  friendlyAuthError,
  passwordError,
  safeNextPath,
  signUpWithEmail,
  useAuthSession,
} from '@/lib/web-auth';

const NAME_MAX_LENGTH = 80;

function nameError(name) {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length > NAME_MAX_LENGTH) return `Use ${NAME_MAX_LENGTH} characters or fewer`;
  return null;
}

export function SignupClient({ appStoreHref, playStoreHref }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const currencyCode = useCurrencyCode();
  const { status } = useAuthSession();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  useEffect(() => {
    if (status === 'signedIn' && !submitting) router.replace(next);
  }, [status, submitting, next, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const fieldErrors = {
      fullName: nameError(fullName),
      email: emailError(email),
      password: passwordError(password),
    };
    setErrors(fieldErrors);
    if (fieldErrors.fullName || fieldErrors.email || fieldErrors.password) return;

    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUpWithEmail({ fullName, email, password, currencyCode });
      if (needsConfirmation) {
        setConfirmEmail(email.trim());
        setSubmitting(false);
        return;
      }
      const separator = next.includes('?') ? '&' : '?';
      router.replace(next === '/dashboard' ? '/dashboard?welcome=1' : `${next}${separator}welcome=1`);
    } catch (error) {
      setFormError(friendlyAuthError(error));
      setSubmitting(false);
    }
  }

  if (confirmEmail) {
    return (
      <AuthShell
        title="Check your email"
        description={`We sent a confirmation link to ${confirmEmail}. Open it to finish creating your account.`}
      >
        <AuthButton href="/login" variant="secondary">
          Back to sign in
        </AuthButton>
      </AuthShell>
    );
  }

  if (status === 'loading' || (status === 'signedIn' && !submitting)) {
    return (
      <AuthShell title="Create your free account">
        <AuthLoading label={status === 'signedIn' ? 'Opening your dashboard…' : 'Loading…'} />
      </AuthShell>
    );
  }

  const loginHref = next === '/dashboard' ? '/login' : `/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title="Create your free account"
      description="Cost your dishes on the web and in the app — one account for both."
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="full-name"
          label="Your name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
          placeholder="Chef John"
          error={errors.fullName}
          autoFocus
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
        />
        <AuthPasswordField
          id="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
          error={errors.password}
          visible={showPassword}
          onToggle={() => setShowPassword((visible) => !visible)}
        />

        <p className="text-xs leading-relaxed text-text-secondary">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="font-semibold text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        {formError ? <AuthMessage>{formError}</AuthMessage> : null}

        <AuthButton type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create free account'}
        </AuthButton>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already use the app?{' '}
        <Link href={loginHref} className="font-semibold text-primary hover:underline">
          Sign in with the same account
        </Link>
      </p>

      <SameAccountNote appStoreHref={appStoreHref} playStoreHref={playStoreHref} />
    </AuthShell>
  );
}
