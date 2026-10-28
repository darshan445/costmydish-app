import { SeoLandingPage } from '@/components/SeoLandingPage';
import { getLandingPage } from '@/lib/landing-pages';
import { buildPageMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return [
    { slug: 'food-cost-calculator' },
    { slug: 'recipe-cost-calculator' },
    { slug: 'bakery-pricing-calculator' },
    { slug: 'restaurant-menu-costing' },
  ];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) return {};
  return buildPageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    pathname: `/${slug}`,
  });
}

export default async function LandingRoute({ params }) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) notFound();
  return <SeoLandingPage page={page} />;
}
