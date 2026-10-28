import Link from 'next/link';
import { CtaSection } from '@/components/CtaSection';
import { formatMoney } from '@/lib/food-cost';
import { PRICING_CATEGORIES, PRICING_ITEMS, computePricingExample } from '@/lib/pricing-items';
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site';

export const metadata = buildPageMetadata({
  title: 'How to Price Food: Pricing Guides for Baked Goods, Drinks & Dishes',
  description:
    'Free pricing guides with calculators: how to price cupcakes, cookies, brownies, sourdough, lattes, pizza, burgers, biryani and more. See cost per item and what to charge.',
  pathname: '/pricing',
});

export default function PricingHubPage() {
  const groups = Object.entries(PRICING_CATEGORIES).map(([key, category]) => ({
    key,
    category,
    items: PRICING_ITEMS.filter((item) => item.category === key).map((item) => ({
      item,
      example: computePricingExample(item),
    })),
  }));

  return (
    <>
      <section className="px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
        <div className="mx-auto max-w-5xl">
          <nav className="text-sm text-text-secondary" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-text">Pricing guides</span>
          </nav>
          <h1 className="mt-6 text-3xl font-extrabold leading-tight text-text sm:text-4xl lg:text-5xl">
            How to price food: guides for what you sell
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-text-secondary">
            Each guide has a real example recipe, its cost per item, the price that hits a healthy food cost %, and a free calculator
            loaded with the recipe — swap in your own prices to get your numbers.
          </p>

          {groups.map(({ key, category, items }) => (
            <section key={key} className="mt-12">
              <h2 className="text-2xl font-extrabold text-text">{category.label}</h2>
              <p className="mt-2 text-sm text-text-secondary">Typical food cost target: {category.range}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(({ item, example }) => {
                  const currency = item.currency ?? '$';
                  return (
                    <Link
                      key={item.slug}
                      href={`/pricing/${item.slug}`}
                      className="rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/30 hover:shadow-md"
                    >
                      <p className="font-bold text-text">How to price {item.name}</p>
                      <p className="mt-2 text-sm text-text-secondary">
                        Example: {formatMoney(example.costPerUnit, currency)} per {item.recipe.unitWord} → price from{' '}
                        <span className="font-semibold text-primary">{formatMoney(example.suggestedPrice, currency)}</span>
                      </p>
                    </Link>
                  );
                })}
                {key === 'bakery' ? (
                  <Link
                    href="/how-to-price-cakes"
                    className="rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/30 hover:shadow-md"
                  >
                    <p className="font-bold text-text">How to price cakes</p>
                    <p className="mt-2 text-sm text-text-secondary">Including your time, packaging and overheads</p>
                  </Link>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </section>

      <CtaSection campaign="pricing-hub" />

      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', href: '/' }, { name: 'Pricing guides', href: '/pricing' }])} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'How to price food',
          url: `${siteConfig.url}/pricing`,
          hasPart: PRICING_ITEMS.map((item) => ({
            '@type': 'Article',
            headline: `How to price ${item.name}`,
            url: `${siteConfig.url}/pricing/${item.slug}`,
          })),
        }}
      />
    </>
  );
}
