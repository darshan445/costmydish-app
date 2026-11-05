'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, use, useCallback, useEffect, useState } from 'react';
import { signOut } from '@/lib/web-auth';
import { Dialog, primaryButtonClass, secondaryButtonClass } from './ui';

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <path d="M8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function DishesIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 21V3c-2 1-3.5 3.5-3.5 7s1.5 4 3.5 4" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
      <path d="M5 19 12 12" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="2.5" width="12" height="19" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
    </svg>
  );
}

const NAV = [
  { href: '/dashboard', label: 'Home', Icon: HomeIcon },
  { href: '/dashboard/dishes', label: 'Dishes', Icon: DishesIcon },
  { href: '/dashboard/calculate', label: 'Calculate', Icon: CalculatorIcon },
  { href: '/dashboard/library', label: 'Library', Icon: LibraryIcon },
  { href: '/dashboard/settings', label: 'Settings', Icon: SettingsIcon },
];

const GetAppContext = createContext(() => {});

/** Opens the "Get the app" dialog (QR code and store links). */
export function useGetApp() {
  return use(GetAppContext);
}

function GetAppDialog({ getApp, email, onClose }) {
  return (
    <Dialog
      title="Get CostMyDish on your phone"
      onClose={onClose}
      footer={<button type="button" onClick={onClose} className={secondaryButtonClass}>Close</button>}
    >
      <p className="text-sm leading-relaxed text-text-secondary">
        Same account, same dishes. Sign in with <strong className="text-text">{email}</strong> and everything you save
        here shows up in the app.
      </p>
      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="hidden flex-col items-center sm:flex">
          <div
            className="rounded-2xl border border-border bg-white p-2.5"
            role="img"
            aria-label="QR code to download CostMyDish"
            dangerouslySetInnerHTML={{ __html: getApp.qrSvg }}
          />
          <p className="mt-2 text-xs font-semibold text-text-secondary">Scan with your phone camera</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-1">
          <a href={getApp.appStoreHref} target="_blank" rel="noopener noreferrer" className={primaryButtonClass}>
            Download on the App Store
          </a>
          <a href={getApp.playStoreHref} target="_blank" rel="noopener noreferrer" className={primaryButtonClass}>
            Get it on Google Play
          </a>
          <p className="text-center text-xs text-text-secondary">Free to download · iPhone and Android</p>
        </div>
      </div>
    </Dialog>
  );
}

function isActive(pathname, href) {
  return href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function displayName(user) {
  return (user.user_metadata?.full_name ?? '').trim() || user.email;
}

function Avatar({ user, size = 'h-9 w-9' }) {
  const initial = displayName(user).trim().charAt(0).toUpperCase() || '?';
  return (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary`}>
      {initial}
    </span>
  );
}

function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      router.replace('/login');
    }
  }
  return { signingOut, handleSignOut };
}

const secondaryLinkClass =
  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-secondary transition hover:bg-surface-alt hover:text-text';

function Sidebar({ user, pathname }) {
  const { signingOut, handleSignOut } = useSignOut();
  const openGetApp = useGetApp();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <Link href="/dashboard" className="flex h-16 items-center gap-3 px-5">
        <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
        <span className="text-base font-bold text-text">CostMyDish</span>
      </Link>

      <nav aria-label="Dashboard" className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-alt hover:text-text'
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 px-3 pb-3">
        <button type="button" onClick={openGetApp} className={`${secondaryLinkClass} w-full`}>
          <PhoneIcon />
          Get the app
        </button>
        <Link href="/contact" className={secondaryLinkClass}>
          <HelpIcon />
          Help &amp; support
        </Link>
      </div>

      <div className="border-t border-border p-3">
        <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-surface-alt">
          <Avatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{displayName(user)}</p>
            <p className="truncate text-xs text-text-secondary">{user.email}</p>
          </div>
        </Link>
        <button type="button" onClick={handleSignOut} disabled={signingOut} className={`${secondaryLinkClass} w-full disabled:opacity-60`}>
          <SignOutIcon />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}

function MobileTopBar({ user }) {
  const { signingOut, handleSignOut } = useSignOut();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the menu after navigating
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={30} height={30} className="rounded-full" />
          <span className="text-base font-bold text-text">CostMyDish</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Account menu"
          className="flex min-h-11 min-w-11 items-center justify-center"
        >
          <Avatar user={user} size="h-8 w-8" />
        </button>
      </div>

      {open ? (
        <>
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 top-14 z-40 cursor-default bg-black/20" />
          <div role="menu" className="absolute right-3 top-14 z-50 w-64 rounded-2xl border border-border bg-surface p-2 shadow-xl">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-text">{displayName(user)}</p>
              <p className="truncate text-xs text-text-secondary">{user.email}</p>
            </div>
            <div className="my-1 border-t border-border" />
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /get redirects to the phone's app store */}
            <a role="menuitem" href="/get?c=dashboard-menu" className={secondaryLinkClass}>
              <PhoneIcon />
              Get the app
            </a>
            <Link role="menuitem" href="/contact" className={secondaryLinkClass}>
              <HelpIcon />
              Help &amp; support
            </Link>
            <button role="menuitem" type="button" onClick={handleSignOut} disabled={signingOut} className={`${secondaryLinkClass} w-full disabled:opacity-60`}>
              <SignOutIcon />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </>
      ) : null}
    </header>
  );
}

function MobileTabBar({ pathname }) {
  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
              active ? 'text-primary' : 'text-text-secondary'
            }`}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** App-style frame for signed-in pages: sidebar on desktop, top bar and bottom tabs on phones. */
export function DashboardShell({ user, getApp, children }) {
  const pathname = usePathname();
  const [showGetApp, setShowGetApp] = useState(false);
  const openGetApp = useCallback(() => setShowGetApp(true), []);
  const closeGetApp = useCallback(() => setShowGetApp(false), []);
  return (
    <GetAppContext value={openGetApp}>
      <div className="min-h-screen bg-background">
        <Sidebar user={user} pathname={pathname} />
        <div className="lg:pl-64">
          <MobileTopBar user={user} />
          <main className="pb-24 lg:pb-0">{children}</main>
        </div>
        <MobileTabBar pathname={pathname} />
      </div>
      {showGetApp ? <GetAppDialog getApp={getApp} email={user.email} onClose={closeGetApp} /> : null}
    </GetAppContext>
  );
}
