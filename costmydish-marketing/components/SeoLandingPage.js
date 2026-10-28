import Link from 'next/link';
import { CtaSection } from '@/components/CtaSection';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { siteConfig } from '@/lib/site';

export function SeoLandingPage({ page }) {
  const path = `/${page.slug}`;

  return (
    <>
      <section className="px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-4xl">
          <nav className="text-sm text-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-text">{page.eyebrow}</span>
          </nav>

          <p className="mt-6 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            {page.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-text sm:text-4xl lg:text-5xl">
            {page.h1}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-text-secondary">
            {page.subtitle}
          </p>

          <ul className="mt-10 space-y-3">
            {page.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-text sm:text-base">
                <span className="mt-1 text-primary">✓</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#download"
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary-dark"
            >
              Download free
            </a>
            <Link
              href="/compare"
              className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-bold text-text transition hover:border-primary/30"
            >
              Compare vs spreadsheets
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-surface-alt px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold text-text">Common questions</h2>
          <div className="mt-8 space-y-4">
            {page.faqs.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border bg-surface px-5 py-4">
                <summary className="cursor-pointer list-none font-semibold text-text marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="shrink-0 text-primary transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface p-8">
          <h2 className="text-xl font-bold text-text">More food costing guides</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            <li><Link href="/food-cost-calculator" className="text-sm text-primary underline">Food cost calculator</Link></li>
            <li><Link href="/recipe-cost-calculator" className="text-sm text-primary underline">Recipe cost calculator</Link></li>
            <li><Link href="/bakery-pricing-calculator" className="text-sm text-primary underline">Bakery pricing calculator</Link></li>
            <li><Link href="/restaurant-menu-costing" className="text-sm text-primary underline">Restaurant menu costing</Link></li>
            <li><Link href="/compare" className="text-sm text-primary underline">CostMyDish vs alternatives</Link></li>
          </ul>
        </div>
      </section>

      <CtaSection />

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: page.eyebrow, href: path },
        ])}
      />
      <JsonLd data={faqJsonLd(page.faqs)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: page.h1,
          description: page.metaDescription,
          url: `${siteConfig.url}${path}`,
          isPartOf: { '@type': 'WebSite', name: 'CostMyDish', url: siteConfig.url },
        }}
      />
    </>
  );
}
