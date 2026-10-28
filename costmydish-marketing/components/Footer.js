import Image from 'next/image';
import Link from 'next/link';
import { SEO_LANDING_PAGES } from '@/lib/landing-pages';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="CostMyDish" width={36} height={36} className="rounded-full" />
              <span className="text-lg font-bold">CostMyDish</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Free food cost calculator for chefs, home bakers, caterers and food truck owners. Know your food cost %. Price with confidence.
            </p>
          </div>

          <div className="flex flex-wrap gap-16 md:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/#features" className="text-text-secondary hover:text-primary">Features</Link></li>
                <li><Link href="/#how-it-works" className="text-text-secondary hover:text-primary">How it works</Link></li>
                <li><Link href="/#pricing" className="text-text-secondary hover:text-primary">Pricing</Link></li>
                <li><Link href="/compare" className="text-text-secondary hover:text-primary">Compare</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Free calculators</p>
              <ul className="mt-3 space-y-2 text-sm">
                {SEO_LANDING_PAGES.filter((page) => page.kind === 'tool').map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="text-text-secondary hover:text-primary">{page.navLabel}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Guides</p>
              <ul className="mt-3 space-y-2 text-sm">
                {SEO_LANDING_PAGES.filter((page) => page.kind === 'guide').map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="text-text-secondary hover:text-primary">{page.navLabel}</Link>
                  </li>
                ))}
                <li><Link href="/pricing" className="font-semibold text-text-secondary hover:text-primary">Pricing guides (cupcakes, pizza, lattes…)</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Support</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/contact" className="text-text-secondary hover:text-primary">Contact & Support</Link></li>
                <li><Link href="/terms" className="text-text-secondary hover:text-primary">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="text-text-secondary hover:text-primary">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-text-secondary">
          © {new Date().getFullYear()} CostMyDish. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
