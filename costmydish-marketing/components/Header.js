import Image from 'next/image';
import Link from 'next/link';

const NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/contact', label: 'Support' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="CostMyDish" width={40} height={40} className="rounded-full" />
          <span className="text-lg font-bold text-text">CostMyDish</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text-secondary transition hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#download"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Get the app
        </a>
      </div>
    </header>
  );
}
