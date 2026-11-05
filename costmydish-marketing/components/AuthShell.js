import Image from 'next/image';

export function AuthShell({ title, description, children }) {
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt="CostMyDish"
            width={64}
            height={64}
            className="mx-auto rounded-full"
          />
          <h1 className="mt-6 text-2xl font-extrabold text-text sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{description}</p>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

export function AuthButton({ href, children, variant = 'primary', type = 'button', disabled, onClick }) {
  const base =
    'inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60';
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white shadow-md hover:bg-primary-dark'
      : 'border border-border bg-surface text-text hover:border-primary/30';

  if (href) {
    return (
      <a href={href} className={`${base} ${styles}`}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  autoFocus,
  trailing,
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-text">
        {label}
      </label>
      <div
        className={`mt-2 flex items-center rounded-xl border bg-surface transition focus-within:ring-2 ${
          error
            ? 'border-red-400 focus-within:ring-red-100'
            : 'border-border focus-within:border-primary focus-within:ring-primary/20'
        }`}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="min-h-11 w-full rounded-xl bg-transparent px-4 py-3 text-sm text-text outline-none placeholder:text-text-secondary/60"
        />
        {trailing}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Password field with a show / hide toggle. */
export function AuthPasswordField({ visible, onToggle, ...props }) {
  return (
    <AuthField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={onToggle}
          className="min-h-11 shrink-0 px-4 text-xs font-semibold text-text-secondary transition hover:text-primary"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}

/** Tells people the web account and the phone app account are the same. */
export function SameAccountNote({ appStoreHref, playStoreHref }) {
  return (
    <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-center">
      <p className="text-sm font-bold text-primary-dark">One account for web, iPhone and Android</p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
        Use the same email and password in the CostMyDish app. Your dishes and ingredients stay in sync.
      </p>
      <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
        <a
          href={appStoreHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-text transition hover:border-primary/30"
        >
          App Store
        </a>
        <a
          href={playStoreHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-text transition hover:border-primary/30"
        >
          Google Play
        </a>
      </div>
    </div>
  );
}

export function AuthMessage({ variant = 'error', children }) {
  const styles =
    variant === 'success'
      ? 'border-primary/20 bg-primary/5 text-primary-dark'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <p className={`rounded-xl border px-4 py-3 text-sm ${styles}`} role="alert">
      {children}
    </p>
  );
}

export function AuthLoading({ label = 'Verifying link…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-sm text-text-secondary" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label}
    </div>
  );
}
