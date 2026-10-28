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

export function AuthField({ id, label, type = 'text', value, onChange, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-text">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
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

export function AuthLoading() {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-sm text-text-secondary">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      Verifying link…
    </div>
  );
}
