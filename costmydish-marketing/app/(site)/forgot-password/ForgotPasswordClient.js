'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthButton, AuthField, AuthMessage, AuthShell } from '@/components/AuthShell';
import { emailError, friendlyAuthError, sendPasswordReset } from '@/lib/web-auth';

export function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const error = emailError(email);
    setFieldError(error);
    if (error) return;

    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSentTo(email.trim());
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        description={`If an account exists for ${sentTo}, we sent a link to reset your password. The new password works on the web and in the app.`}
      >
        <AuthButton href="/login" variant="secondary">
          Back to sign in
        </AuthButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter the email you use for CostMyDish and we will send you a reset link."
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
          error={fieldError}
          autoFocus
        />
        {formError ? <AuthMessage>{formError}</AuthMessage> : null}
        <AuthButton type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </AuthButton>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
