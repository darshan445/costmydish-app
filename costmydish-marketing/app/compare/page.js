import Link from 'next/link';
import { CtaSection } from '@/components/CtaSection';
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'CostMyDish vs Spreadsheets & Enterprise Food Cost Software',
  description:
    'Compare CostMyDish to spreadsheets, meez, xtraCHEF, and other recipe costing tools. See why mobile-first food cost calculation wins for independent restaurants and bakers.',
  pathname: '/compare',
});

const COMPARISONS = [
  {
    name: 'Excel / Google Sheets',
    price: 'Free (your time)',
    bestFor: 'One-off calculations',
    downsides: ['Unit conversion errors', 'Manual updates when prices change', 'No margin alerts', 'Not usable on the line'],
    costmydish: 'Automatic unit conversion, live food cost %, margin badges, mobile',
  },
  {
    name: 'meez',
    price: 'From ~$75/mo',
    bestFor: 'Multi-location ops with invoice integrations',
    downsides: ['Expensive for independents', 'Browser-based, slow on tablet', 'Steep onboarding'],
    costmydish: 'Free tier, 3-step wizard, mobile app, start in minutes',
  },
  {
    name: 'xtraCHEF (Toast)',
    price: 'Quote-based',
    bestFor: 'Toast POS restaurants needing AP automation',
    downsides: ['POS ecosystem lock-in', 'Mixed support reviews', 'Overkill if you only need costing'],
    costmydish: 'POS-agnostic recipe costing focused on margin math',
  },
  {
    name: 'DishCost / Dishboard (web)',
    price: '~$39/mo',
    bestFor: 'Web-first menu engineering',
    downsides: ['Monthly fee from day one', 'Desktop workflow', 'Less mobile-native'],
    costmydish: 'Free plan + Hobbyist at $4.99/mo, built for phone',
  },
  {
    name: 'Fillet / niche apps',
    price: 'Varies',
    bestFor: 'Specific niches (chefs, bakers)',
    downsides: ['Inconsistent UX', 'Limited free tiers', 'Hard to compare formats'],
    costmydish: 'Multiple selling formats, clear food cost %, global currency',
  },
];

export default function ComparePage() {
  return (
    <>
      <div className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <nav className="text-sm text-text-secondary">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <span>Compare</span>
          </nav>

          <h1 className="mt-6 text-3xl font-extrabold text-text sm:text-4xl">
            CostMyDish vs spreadsheets &amp; other food cost tools
          </h1>
          <p className="mt-4 text-lg text-text-secondary">
            Independent restaurants, bakeries, and food trucks need accurate margins — not another $75/month platform or a fragile spreadsheet.
          </p>

          <div className="mt-12 space-y-6">
            {COMPARISONS.map((item) => (
              <article key={item.name} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-bold text-text">{item.name}</h2>
                  <span className="text-sm font-semibold text-primary">{item.price}</span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">Best for: {item.bestFor}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Pain points</p>
                    <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                      {item.downsides.map((d) => (
                        <li key={d}>• {d}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">CostMyDish</p>
                    <p className="mt-2 text-sm text-text">{item.costmydish}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <CtaSection />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Compare', href: '/compare' },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'CostMyDish vs alternatives',
          url: `${siteConfig.url}/compare`,
        }}
      />
    </>
  );
}
