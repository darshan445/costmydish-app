import Link from 'next/link';
import { CtaSection } from '@/components/CtaSection';
import { FoodCostCalculator } from '@/components/FoodCostCalculator';
import { formatMoney } from '@/lib/food-cost';
import { PRICING_CATEGORIES, PRICING_ITEMS, computePricingExample } from '@/lib/pricing-items';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { siteConfig } from '@/lib/site';

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pluralUnit(unit) {
  return /(ch|sh|s|x)$/.test(unit) ? `${unit}es` : `${unit}s`;
}

function shortName(item) {
  return item.name.replace(/^an? /, '');
}

export function pricingItemTitle(item) {
  return `How to price ${item.name}`;
}

export function PricingItemPage({ item }) {
  const category = PRICING_CATEGORIES[item.category];
  const example = computePricingExample(item);
  const currency = item.currency ?? '$';
  const { recipe } = item;
  const unit = recipe.unitWord;
  const money = (value) => formatMoney(value, currency);
  const path = `/pricing/${item.slug}`;

  const faqs = [
    {
      q: `How much does it cost to make one ${unit}?`,
      a: `In our example (${recipe.dishName}, makes ${recipe.makes} ${recipe.makes === 1 ? unit : pluralUnit(unit)}), the ingredients cost ${money(example.totalCost)} in total, or ${money(example.costPerUnit)} per ${unit}. Enter your own prices in the calculator for your exact cost.`,
    },
    {
      q: `What food cost % should I use for ${item.name}?`,
      a: `For ${example.targetLabel} most businesses aim for ${example.range}. At ${example.target}%, the example works out to at least ${money(example.suggestedPrice)} per ${unit} before labour and overheads.`,
    },
    ...item.faqs,
  ];

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
            {pricingItemTitle(item)}: cost per {unit} and what to charge
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-text-secondary">{item.intro}</p>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Example batch cost', value: money(example.totalCost) },
              { label: `Cost per ${unit}`, value: money(example.costPerUnit) },
              { label: `Price at ${example.target}% food cost`, value: money(example.suggestedPrice) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-surface px-3 py-4">
                <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
                <p className="mt-1 text-xl font-extrabold text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <FoodCostCalculator
              recipe={recipe}
              defaultTarget={example.target}
              defaultCurrency={currency}
              title={`${capitalize(shortName(item))} cost calculator`}
            />
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-extrabold text-text">Worked example: {recipe.dishName}</h2>
            <p className="mt-4 leading-relaxed text-text-secondary">
              This batch makes {recipe.makes} {recipe.makes === 1 ? unit : pluralUnit(unit)}. Here is where the money goes, most expensive first:
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-left text-text-secondary">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Ingredient</th>
                    <th className="px-4 py-2.5 font-semibold">Used</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {example.lines.map((line) => (
                    <tr key={line.name} className="border-t border-border">
                      <td className="px-4 py-2.5 text-text">{line.name}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {line.useQty} {line.useUnit}
                        {line.wastePercent ? ` (+${line.wastePercent}% waste)` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-text">{money(line.cost)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-surface-alt font-bold">
                    <td className="px-4 py-2.5 text-text" colSpan={2}>Total for {recipe.makes} {unit}{recipe.makes === 1 ? '' : 's'}</td>
                    <td className="px-4 py-2.5 text-right text-text">{money(example.totalCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 leading-relaxed text-text-secondary">
              That is <strong className="text-text">{money(example.costPerUnit)} per {unit}</strong>. At a {example.target}% food cost the
              price should be at least <strong className="text-text">{money(example.suggestedPrice)}</strong>. Across the usual {example.range} range
              for {example.targetLabel}, that is {money(example.priceAtHighFoodCost)} (at {example.highPercent}%) to{' '}
              {money(example.priceAtLowFoodCost)} (at {example.lowPercent}%) per {unit} — before your time and overheads.
            </p>
          </section>

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
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-border bg-surface px-5 py-4">
                <summary className="cursor-pointer list-none font-semibold text-text marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {faq.q}
                    <span className="shrink-0 text-primary transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{faq.a}</p>
              </details>
            ))}
          </div>
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
          headline: `${pricingItemTitle(item)}: cost per ${unit} and what to charge`,
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
