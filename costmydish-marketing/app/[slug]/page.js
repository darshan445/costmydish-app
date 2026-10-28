import { SeoLandingPage } from '@/components/SeoLandingPage';
import { SEO_LANDING_PAGES, getLandingPage } from '@/lib/landing-pages';
import { buildPageMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_LANDING_PAGES.map((page) => ({ slug: page.slug }));
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
