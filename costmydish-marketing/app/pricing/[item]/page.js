import { notFound } from 'next/navigation';
import { PricingItemPage } from '@/components/PricingItemPage';
import { formatMoney } from '@/lib/food-cost';
import { PRICING_ITEMS, computePricingExample, getPricingItem } from '@/lib/pricing-items';
import { buildPageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return PRICING_ITEMS.map((item) => ({ item: item.slug }));
}

function titleCase(text) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }) {
  const { item: slug } = await params;
  const item = getPricingItem(slug);
  if (!item) return {};
  const example = computePricingExample(item);
  const currency = item.currency ?? '$';
  const unit = item.recipe.unitWord;
  return buildPageMetadata({
    title: `How to Price ${titleCase(item.name.replace(/^an? /, ''))}: Cost Per ${titleCase(unit)} + Free Calculator`,
    description: `How much to charge for ${item.name}: our example costs ${formatMoney(example.costPerUnit, currency)} per ${unit} in ingredients, so price at least ${formatMoney(example.suggestedPrice, currency)} at ${example.target}% food cost. Cost your own recipe free.`,
    pathname: `/pricing/${slug}`,
  });
}

export default async function PricingItemRoute({ params }) {
  const { item: slug } = await params;
  const item = getPricingItem(slug);
  if (!item) notFound();
  return <PricingItemPage item={item} />;
}
