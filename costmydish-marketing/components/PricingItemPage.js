import Link from 'next/link';
import { CtaSection } from '@/components/CtaSection';
import { FoodCostCalculator } from '@/components/FoodCostCalculator';
import { PricingFaqList, PricingStats, PricingWorkedExample } from '@/components/PricingItemExample';
import { PRICING_CATEGORIES, PRICING_ITEMS, computePricingExample, pricingItemFaqs } from '@/lib/pricing-items';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { siteConfig } from '@/lib/site';

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shortName(item) {
  return item.name.replace(/^an? /, '');
}

export function pricingItemTitle(item) {
  return `How to price ${item.name}`;
}

function pricingItemHeading(item) {
  return item.h1 ?? `${pricingItemTitle(item)}: cost per ${item.recipe.unitWord} and what to charge`;
}

export function PricingItemPage({ item }) {
  const category = PRICING_CATEGORIES[item.category];
  const example = computePricingExample(item);
  const { recipe } = item;
  const path = `/pricing/${item.slug}`;
  // Static HTML and structured data use the item's own currency; the visible copy follows the visitor's
  const faqs = pricingItemFaqs(item);

  const related = PRICING_ITEMS.filter((other) => other.category === item.category && other.slug !== item.slug).slice(0, 8);

  return (
    <>
      <section className="px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
        <div className="mx-auto max-w-3xl">
          <nav className="text-sm text-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/pricing" className="hover:text-primary">Pricing guides</Link>
            <span className="mx-2">/</span>
            <span className="text-text">{capitalize(shortName(item))}</span>
          </nav>

          <p className="mt-6 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Pricing guide · {category.label}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-text sm:text-4xl lg:text-5xl">
            {pricingItemHeading(item)}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-text-secondary">{item.intro}</p>

          <PricingStats item={item} />

          <div className="mt-10">
            <FoodCostCalculator
              recipe={recipe}
              recipeCurrency={item.currency}
              defaultTarget={example.target}
              title={`${capitalize(shortName(item))} cost calculator`}
            />
          </div>

          <PricingWorkedExample item={item} />

          <section className="mt-12">
            <h2 className="text-2xl font-extrabold text-text">What drives the cost of {item.name}</h2>
            <ul className="mt-4 space-y-2">
              {item.drivers.map((driver) => (
                <li key={driver} className="flex gap-3 leading-relaxed text-text-secondary">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-extrabold text-text">Tips for pricing {item.name}</h2>
            <ul className="mt-4 space-y-2">
              {item.tips.map((tip) => (
                <li key={tip} className="flex gap-3 leading-relaxed text-text-secondary">
                  <span className="mt-0.5 text-primary">✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 leading-relaxed text-text-secondary">{item.sellWays}</p>
          </section>

          <section className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="text-xl font-bold text-primary-dark">Don’t forget your time and overheads</h2>
            <p className="mt-3 leading-relaxed text-text-secondary">{category.timeNote}</p>
            {item.category === 'bakery' ? (
              <p className="mt-3 text-sm">
                <Link href="/how-to-price-cakes" className="font-semibold text-primary underline">
                  See how to add labour and overheads to a bakery price →
                </Link>
              </p>
            ) : null}
          </section>

          <div className="mt-12 rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text">Keep your {shortName(item)} prices up to date</h2>
            <p className="mt-3 leading-relaxed text-text-secondary">
              Save this recipe in the free CostMyDish app. Your ingredient prices live in one Library — when {example.lines[0]?.name.toLowerCase()} goes up,
              every recipe that uses it recalculates, and you see which items need a new price.
            </p>
            <a
              href="#download"
              className="mt-5 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary-dark"
            >
              Get the free app
            </a>
          </div>
        </div>
      </section>

      <section className="bg-surface-alt px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold text-text">Common questions about pricing {item.name}</h2>
          <PricingFaqList item={item} />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-8 rounded-2xl border border-border bg-surface p-8 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-bold text-text">More {category.label.toLowerCase()} pricing guides</h2>
            <ul className="mt-3 space-y-2">
              {related.map((other) => (
                <li key={other.slug}>
                  <Link href={`/pricing/${other.slug}`} className="text-sm text-primary underline">{pricingItemTitle(other)}</Link>
                </li>
              ))}
              <li><Link href="/pricing" className="text-sm font-semibold text-primary underline">All pricing guides →</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Food costing basics</h2>
            <ul className="mt-3 space-y-2">
              <li><Link href="/food-cost-percentage" className="text-sm text-primary underline">Food cost percentage</Link></li>
              <li><Link href="/how-to-calculate-food-cost" className="text-sm text-primary underline">How to calculate food cost</Link></li>
              <li><Link href="/recipe-costing" className="text-sm text-primary underline">Recipe costing guide</Link></li>
              <li><Link href="/food-cost-calculator" className="text-sm text-primary underline">Free food cost calculator</Link></li>
            </ul>
          </div>
        </div>
      </section>

      <CtaSection campaign={`pricing-${item.slug}`} />

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Pricing guides', href: '/pricing' },
          { name: capitalize(shortName(item)), href: path },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: pricingItemHeading(item),
          description: item.intro,
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
        }}
      />
    </>
  );
}
