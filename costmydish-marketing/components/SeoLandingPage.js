import Link from 'next/link';
import { CtaSection } from '@/components/CtaSection';
import { FoodCostCalculator } from '@/components/FoodCostCalculator';
import { SEO_LANDING_PAGES } from '@/lib/landing-pages';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { siteConfig } from '@/lib/site';

function GuideSection({ section }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold text-text">{section.h2}</h2>
      {section.formula ? (
        <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 font-semibold text-primary-dark">
          {section.formula}
        </p>
      ) : null}
      {section.body?.map((paragraph) => (
        <p key={paragraph} className="mt-4 leading-relaxed text-text-secondary">{paragraph}</p>
      ))}
      {section.list ? (
        <ul className="mt-4 space-y-2">
          {section.list.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-text-secondary">
              <span className="mt-0.5 text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function RelatedLinks({ currentSlug }) {
  const others = SEO_LANDING_PAGES.filter((page) => page.slug !== currentSlug);
  const groups = [
    { title: 'Free calculators', pages: others.filter((page) => page.kind === 'tool') },
    { title: 'Food costing guides', pages: others.filter((page) => page.kind === 'guide') },
  ];

  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-4xl gap-8 rounded-2xl border border-border bg-surface p-8 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title}>
            <h2 className="text-lg font-bold text-text">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.pages.map((page) => (
                <li key={page.slug}>
                  <Link href={`/${page.slug}`} className="text-sm text-primary underline">{page.navLabel}</Link>
                </li>
              ))}
              {group.title === 'Free calculators' ? (
                <li><Link href="/compare" className="text-sm text-primary underline">CostMyDish vs alternatives</Link></li>
              ) : (
                <li><Link href="/pricing" className="text-sm font-semibold text-primary underline">How to price cupcakes, pizza, lattes & more →</Link></li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SeoLandingPage({ page }) {
  const path = `/${page.slug}`;
  const isGuide = page.kind === 'guide';
  const sections = page.sections ?? [];
  const calculatorIndex = page.calculatorAfterSection;
  const calculatorAtTop = calculatorIndex == null;
  const calculator = page.calculator ? (
    <div className="mt-10">
      <FoodCostCalculator {...page.calculator} />
    </div>
  ) : null;

  return (
    <>
      <section className="px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
        <div className={`mx-auto ${isGuide ? 'max-w-3xl' : 'max-w-6xl'}`}>
          <nav className="text-sm text-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-text">{page.navLabel}</span>
          </nav>

          <p className="mt-6 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            {page.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-text sm:text-4xl lg:text-5xl">
            {page.h1}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-text-secondary">{page.subtitle}</p>

          {calculatorAtTop ? calculator : null}

          {sections.map((section, index) => (
            <div key={section.h2}>
              <GuideSection section={section} />
              {index === calculatorIndex ? calculator : null}
            </div>
          ))}

          {page.secondCalculator ? (
            <div className="mt-12">
              <FoodCostCalculator {...page.secondCalculator} />
            </div>
          ) : null}

          <div className={`mt-12 rounded-2xl border border-border bg-surface p-6 sm:p-8 ${isGuide ? '' : 'max-w-4xl'}`}>
            <h2 className="text-xl font-bold text-text">{page.bulletsTitle}</h2>
            <ul className="mt-5 space-y-3">
              {page.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-text sm:text-base">
                  <span className="mt-0.5 text-primary">✓</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href="#download"
                className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary-dark"
              >
                Get the free app
              </a>
              <Link
                href="/compare"
                className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-bold text-text transition hover:border-primary/30"
              >
                Compare vs spreadsheets
              </Link>
            </div>
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

      <RelatedLinks currentSlug={page.slug} />

      <CtaSection campaign={page.slug} />

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: page.navLabel, href: path },
        ])}
      />
      <JsonLd data={faqJsonLd(page.faqs)} />
      <JsonLd
        data={
          isGuide
            ? {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: page.h1,
                description: page.metaDescription,
                url: `${siteConfig.url}${path}`,
                mainEntityOfPage: `${siteConfig.url}${path}`,
                image: `${siteConfig.url}/og-image.png`,
                author: { '@type': 'Organization', name: 'CostMyDish', url: siteConfig.url },
                publisher: {
                  '@type': 'Organization',
                  name: 'CostMyDish',
                  logo: { '@type': 'ImageObject', url: `${siteConfig.url}/logo.png` },
                },
                datePublished: '2026-10-28',
                dateModified: '2026-10-28',
              }
            : {
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: page.h1,
                description: page.metaDescription,
                url: `${siteConfig.url}${path}`,
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Any (web browser)',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                isPartOf: { '@type': 'WebSite', name: 'CostMyDish', url: siteConfig.url },
              }
        }
      />
    </>
  );
}
