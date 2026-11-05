'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CURRENCIES, getCurrency } from '@/lib/currency';
import {
  changePassword,
  deleteAccount,
  loadSettings,
  sendFeedback,
  updateSettings,
} from '@/lib/dashboard-data';
import { foodCostPercentError, parseDecimal } from '@/lib/food-cost';
import { FREE_DISH_LIMIT, FREE_INGREDIENT_LIMIT, HOBBYIST_MONTHLY_PRICE } from '@/lib/plans';
import { passwordError, signOut } from '@/lib/web-auth';
import { useDashboardUser } from '../DashboardGate';
import { useGetApp } from '../DashboardShell';
import {
  Dialog,
  ErrorState,
  PageBody,
  PageHeader,
  SearchInput,
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui';

const UNIT_SYSTEMS = [
  { value: 'metric', label: 'Metric', hint: 'g, kg, ml, L' },
  { value: 'imperial', label: 'Imperial', hint: 'oz, lb, cups, fl oz' },
];
const HOBBYIST_FEATURES = ['Unlimited dishes & library items', 'Ingredient price history', 'Cloud sync across devices'];
const APPLE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions';
const GOOGLE_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions';
const FEEDBACK_MAX_LENGTH = 2000;

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function Section({ title, note, children }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</h2>
      {children}
      {note ? <p className="mt-2 px-1 text-xs leading-relaxed text-text-secondary">{note}</p> : null}
    </section>
  );
}

function Card({ children }) {
  return <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>;
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-secondary/70" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

const rowClass = 'flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left';

/** One settings row: a button when `onClick` is set, a link when `href` is set, plain text otherwise. */
function Row({ label, description, value, onClick, href, external, danger }) {
  const body = (
    <>
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${danger ? 'text-red-600' : 'text-text'}`}>{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-text-secondary">{description}</span> : null}
      </span>
      <span className="flex min-w-0 shrink-0 items-center gap-2">
        {value != null ? <span className="truncate text-sm text-text-secondary">{value}</span> : null}
        {onClick || href ? <Chevron /> : null}
      </span>
    </>
  );
  const interactive = `${rowClass} transition hover:bg-surface-alt`;
  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={interactive}>{body}</a>
    ) : (
      <Link href={href} className={interactive}>{body}</Link>
    );
  }
  if (onClick) return <button type="button" onClick={onClick} className={interactive}>{body}</button>;
  return <div className={rowClass}>{body}</div>;
}

function PlanBadge({ isFree, label }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isFree ? 'bg-surface-alt text-text-secondary' : 'bg-emerald-100 text-primary'}`}>
      {label ?? (isFree ? 'Free' : 'Hobbyist')}
    </span>
  );
}

function UsageBar({ label, used, limit }) {
  const full = used >= limit;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold text-text">{used} / {limit}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${full ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min((used / limit) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

function SubscriptionCard({ settings, onUpgrade }) {
  if (settings.isFree) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-bold text-text">Free plan</p>
            <p className="mt-0.5 text-sm text-text-secondary">Limited features</p>
          </div>
          <PlanBadge isFree />
        </div>
        <div className="mt-5 space-y-3">
          <UsageBar label="Dishes" used={settings.dishCount} limit={FREE_DISH_LIMIT} />
          <UsageBar label="Library" used={settings.ingredientCount} limit={FREE_INGREDIENT_LIMIT} />
        </div>
        <button type="button" onClick={onUpgrade} className={`${primaryButtonClass} mt-5 w-full`}>
          Upgrade to Hobbyist
        </button>
        <p className="mt-2 text-center text-xs text-text-secondary">
          From {HOBBYIST_MONTHLY_PRICE}/mo (USD). Upgrades are made in the CostMyDish app through the App Store or
          Google Play, where you’ll see the price in your currency. They apply here straight away.
        </p>
      </div>
    );
  }
  const paidThrough = settings.expiresAt ? formatDate(settings.expiresAt) : null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-bold text-text">Hobbyist plan</p>
          <p className="mt-0.5 text-sm text-text-secondary">{paidThrough ? `Paid through ${paidThrough}` : 'All features unlocked'}</p>
        </div>
        <PlanBadge isFree={false} label="Active" />
      </div>
      <ul className="mt-4 space-y-1.5">
        {HOBBYIST_FEATURES.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary" aria-hidden>
              <path d="m5 12 5 5 9-10" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-semibold text-text">Manage or cancel your subscription</p>
        <p className="mt-0.5 text-xs text-text-secondary">Use the store you subscribed with.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={APPLE_SUBSCRIPTIONS} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>App Store</a>
          <a href={GOOGLE_SUBSCRIPTIONS} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>Google Play</a>
        </div>
      </div>
    </div>
  );
}

function CurrencyDialog({ current, dishCount, onSave, onClose }) {
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return CURRENCIES;
    return CURRENCIES.filter((c) => c.code.toLowerCase().includes(query) || c.label.toLowerCase().includes(query));
  }, [search]);

  async function apply(code) {
    setSaving(true);
    setError('');
    try {
      await onSave(code);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  function choose(code) {
    if (code === current) return onClose();
    if (dishCount > 0) return setPending(code);
    return apply(code);
  }

  if (pending) {
    const next = getCurrency(pending);
    return (
      <Dialog
        title="Change currency?"
        onClose={onClose}
        busy={saving}
        footer={(
          <>
            <button type="button" onClick={() => setPending(null)} disabled={saving} className={secondaryButtonClass}>Cancel</button>
            <button type="button" onClick={() => apply(pending)} disabled={saving} className={dangerButtonClass}>
              {saving ? 'Saving…' : `Change to ${next.code}`}
            </button>
          </>
        )}
      >
        <p className="text-sm leading-relaxed text-text-secondary">
          Changing currency won’t convert your existing dish prices. You’ll need to update them manually.
        </p>
        {error ? <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{error}</p> : null}
      </Dialog>
    );
  }

  return (
    <Dialog title="Select currency" onClose={onClose} busy={saving}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search currency or country" />
      {error ? <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{error}</p> : null}
      <ul className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-border" role="listbox" aria-label="Currencies">
        {results.map((c) => {
          const selected = c.code === current;
          return (
            <li key={c.code} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => choose(c.code)}
                disabled={saving}
                className={`flex min-h-12 w-full items-center gap-3 border-b border-border px-4 text-left text-sm last:border-b-0 hover:bg-surface-alt ${selected ? 'bg-emerald-50' : ''}`}
              >
                <span className="w-10 text-center font-bold text-primary">{c.symbol}</span>
                <span className="flex-1 text-text">{c.label} ({c.code})</span>
                {selected ? <span className="font-bold text-primary" aria-hidden>✓</span> : null}
              </button>
            </li>
          );
        })}
        {results.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-text-secondary">No currency matches “{search.trim()}”</li>
        ) : null}
      </ul>
    </Dialog>
  );
}

function UnitSystemDialog({ current, onSave, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function choose(value) {
    if (value === current) return onClose();
    setSaving(true);
    setError('');
    try {
      await onSave(value);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Dialog title="Select unit system" onClose={onClose} busy={saving}>
      <p className="text-sm text-text-secondary">Sets which units the CostMyDish app lists first when you add ingredients.</p>
      <div className="mt-4 space-y-2">
        {UNIT_SYSTEMS.map((system) => {
          const selected = system.value === current;
          return (
            <button
              key={system.value}
              type="button"
              onClick={() => choose(system.value)}
              disabled={saving}
              aria-pressed={selected}
              className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 text-left transition ${selected ? 'border-primary bg-emerald-50' : 'border-border hover:bg-surface-alt'}`}
            >
              <span>
                <span className="block text-sm font-semibold text-text">{system.label}</span>
                <span className="block text-xs text-text-secondary">{system.hint}</span>
              </span>
              {selected ? <span className="font-bold text-primary" aria-hidden>✓</span> : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{error}</p> : null}
    </Dialog>
  );
}

function FoodCostDialog({ current, onSave, onClose }) {
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = foodCostPercentError(value);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      await onSave(parseDecimal(value));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Dialog title="Default food cost %" onClose={onClose} busy={saving}>
      <form onSubmit={handleSubmit} noValidate>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text-secondary">Target food cost percentage</span>
          <span className="flex items-center rounded-lg border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
            <input
              value={value}
              onChange={(event) => { setValue(event.target.value); setError(''); }}
              inputMode="decimal"
              autoFocus
              className="w-full rounded-lg bg-transparent px-3 py-2.5 text-sm text-text outline-none"
            />
            <span className="pr-3 text-sm font-medium text-text-secondary">%</span>
          </span>
          {error ? (
            <span className="mt-1 block text-xs font-semibold text-red-600" role="alert">{error}</span>
          ) : (
            <span className="mt-1 block text-xs text-text-secondary">Typical range: 25–35%. Used for new dishes.</span>
          )}
        </label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function PasswordDialog({ email, onDone, onClose }) {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => {
    setValues((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: null }));
    setFormError('');
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {
      current: values.current ? null : 'Current password is required',
      next: passwordError(values.next),
      confirm: !values.confirm ? 'Confirm your new password' : values.confirm !== values.next ? 'Passwords do not match' : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setSaving(true);
    try {
      await changePassword(email, values.current, values.next);
      onDone();
    } catch (err) {
      if (err.code === 'wrong_password') setErrors({ current: err.message });
      else setFormError(err.message);
      setSaving(false);
    }
  }

  const fields = [
    ['current', 'Current password', 'current-password', 'Your current password'],
    ['next', 'New password', 'new-password', 'Min. 6 characters'],
    ['confirm', 'Confirm new password', 'new-password', 'Repeat new password'],
  ];

  return (
    <Dialog title="Change password" onClose={onClose} busy={saving}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <p className="text-sm text-text-secondary">Enter your current password, then choose a new one. It changes in the app too.</p>
        {fields.map(([key, label, autoComplete, placeholder]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-semibold text-text-secondary">{label}</span>
            <input
              type="password"
              value={values[key]}
              onChange={set(key)}
              autoComplete={autoComplete}
              placeholder={placeholder}
              className={`${inputClass} ${errors[key] ? 'border-red-500' : ''}`}
            />
            {errors[key] ? <span className="mt-1 block text-xs font-semibold text-red-600">{errors[key]}</span> : null}
          </label>
        ))}
        {formError ? <p className="text-sm font-semibold text-red-600" role="alert">{formError}</p> : null}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Updating…' : 'Update password'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function FeedbackDialog({ userId, onDone, onClose }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim()) return setError('Please write a short message.');
    setSending(true);
    try {
      await sendFeedback(userId, message);
      onDone();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  return (
    <Dialog title="Send feedback" onClose={onClose} busy={sending}>
      <form onSubmit={handleSubmit} noValidate>
        <label className="block">
          <span className="mb-1 block text-sm text-text-secondary">Questions, bugs or ideas — we read every message.</span>
          <textarea
            value={message}
            onChange={(event) => { setMessage(event.target.value); setError(''); }}
            rows={5}
            maxLength={FEEDBACK_MAX_LENGTH}
            autoFocus
            placeholder="Tell us what’s on your mind…"
            className={`${inputClass} mt-2 resize-y`}
          />
        </label>
        {error ? <p className="mt-2 text-sm font-semibold text-red-600" role="alert">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={sending} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" disabled={sending} className={primaryButtonClass}>{sending ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function ConfirmAction({ title, message, confirmLabel, busyLabel, cancelLabel = 'Cancel', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>{cancelLabel}</button>
          <button type="button" onClick={handleConfirm} disabled={busy} className={dangerButtonClass}>{busy ? busyLabel : confirmLabel}</button>
        </>
      )}
    >
      <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{message}</p>
      {error ? <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{error}</p> : null}
    </Dialog>
  );
}

export function SettingsClient() {
  const user = useDashboardUser();
  const openGetApp = useGetApp();
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState('');

  const refresh = useCallback(async () => {
    setLoadError(false);
    try {
      setSettings(await loadSettings(user.id));
    } catch {
      setLoadError(true);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads remote data once the user is known
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const closeDialog = useCallback(() => setDialog(null), []);

  function done(message) {
    setDialog(null);
    setToast(message);
  }

  async function save(updates, local, message) {
    await updateSettings(user.id, updates);
    setSettings((prev) => ({ ...prev, ...local }));
    done(message);
  }

  async function handleSignOut() {
    await signOut();
    window.location.replace('/login');
  }

  async function handleDelete() {
    await deleteAccount();
    window.location.replace('/');
  }

  const currency = settings ? getCurrency(settings.currency) : null;

  return (
    <PageBody>
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Settings" subtitle="Your account, plan and preferences. Changes apply in the app too." />

        {loadError && !settings ? (
          <div className="mt-8">
            <ErrorState message="Couldn’t load your settings." onRetry={refresh} />
          </div>
        ) : !settings ? (
          <div className="mt-8 space-y-6" aria-busy="true" aria-label="Loading">
            {[0, 1, 2].map((n) => <div key={n} className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />)}
          </div>
        ) : (
          <>
            <Section title="Account">
              <Card>
                <Row label="Email" value={user.email} />
                <Row label="Plan" value={<PlanBadge isFree={settings.isFree} />} />
                <Row label="Change password" onClick={() => setDialog('password')} />
              </Card>
            </Section>

            <Section title="Subscription">
              <SubscriptionCard settings={settings} onUpgrade={openGetApp} />
            </Section>

            <Section title="Preferences">
              <Card>
                <Row label="Currency" value={`${currency.code} (${currency.symbol})`} onClick={() => setDialog('currency')} />
                <Row
                  label="Unit system"
                  value={UNIT_SYSTEMS.find((s) => s.value === settings.unitSystem)?.label}
                  onClick={() => setDialog('units')}
                />
                <Row label="Default food cost %" value={`${settings.target}%`} onClick={() => setDialog('foodCost')} />
              </Card>
            </Section>

            <Section title="Help & support" note="We read every message — thanks for helping us improve.">
              <Card>
                <Row label="Send feedback" description="Questions, bugs or ideas" onClick={() => setDialog('feedback')} />
                <Row label="Help & FAQs" description="Answers to common questions" href="/contact" />
                <Row label="Get the app" description="iPhone and Android, same account" onClick={openGetApp} />
              </Card>
            </Section>

            <Section title="Account actions" note="Deleting your account permanently removes all your dishes, library items and data.">
              <Card>
                <Row label="Sign out" onClick={() => setDialog('signOut')} />
                <Row label="Delete account" onClick={() => setDialog('delete')} danger />
              </Card>
            </Section>

            <Section title="Legal">
              <Card>
                <Row label="Privacy Policy" href="/privacy" />
                <Row label="Terms of Service" href="/terms" />
              </Card>
            </Section>
          </>
        )}
      </div>

      {dialog === 'password' ? (
        <PasswordDialog email={user.email} onDone={() => done('Password updated')} onClose={closeDialog} />
      ) : null}
      {dialog === 'currency' ? (
        <CurrencyDialog
          current={settings.currency}
          dishCount={settings.dishCount}
          onSave={(code) => save({ currency: code }, { currency: code }, `Currency set to ${code}`)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog === 'units' ? (
        <UnitSystemDialog
          current={settings.unitSystem}
          onSave={(value) => save({ unit_system: value }, { unitSystem: value }, 'Unit system updated')}
          onClose={closeDialog}
        />
      ) : null}
      {dialog === 'foodCost' ? (
        <FoodCostDialog
          current={settings.target}
          onSave={(value) => save({ default_food_cost_percent: value }, { target: value }, `Default food cost set to ${value}%`)}
          onClose={closeDialog}
        />
      ) : null}
      {dialog === 'feedback' ? (
        <FeedbackDialog userId={user.id} onDone={() => done('Thanks — we got your feedback')} onClose={closeDialog} />
      ) : null}
      {dialog === 'signOut' ? (
        <ConfirmAction
          title="Sign out"
          message="You’ll need to sign in again to see your dishes and library."
          confirmLabel="Sign out"
          busyLabel="Signing out…"
          cancelLabel="Stay signed in"
          onConfirm={handleSignOut}
          onClose={closeDialog}
        />
      ) : null}
      {dialog === 'delete' ? (
        <ConfirmAction
          title="Delete account"
          message={'This will permanently delete all your dishes, library items and account data — on the web and in the app.\n\nThis cannot be undone. If you have a subscription, cancel it in the App Store or Google Play too.'}
          confirmLabel="Yes, delete everything"
          busyLabel="Deleting…"
          cancelLabel="Keep my account"
          onConfirm={handleDelete}
          onClose={closeDialog}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-[70] mx-auto max-w-sm rounded-xl bg-text px-4 py-3 text-center text-sm font-semibold text-white shadow-lg lg:bottom-8"
        >
          {toast}
        </div>
      ) : null}
    </PageBody>
  );
}
