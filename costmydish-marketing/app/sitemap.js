import { SEO_LANDING_PAGES } from '@/lib/landing-pages';
import { PRICING_ITEMS } from '@/lib/pricing-items';
import { siteConfig } from '@/lib/site';

/** @type {import('next').MetadataRoute.Sitemap} */
export default function sitemap() {
  const lastModified = new Date();

  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/compare', priority: 0.85, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ];

  const landingPages = SEO_LANDING_PAGES.map((page) => ({
    path: `/${page.slug}`,
    priority: page.kind === 'tool' ? 0.95 : 0.85,
    changeFrequency: page.kind === 'tool' ? 'weekly' : 'monthly',
  }));

  const pricingPages = [
    { path: '/pricing', priority: 0.85, changeFrequency: 'monthly' },
    ...PRICING_ITEMS.map((item) => ({ path: `/pricing/${item.slug}`, priority: 0.8, changeFrequency: 'monthly' })),
  ];

  return [...staticPages, ...landingPages, ...pricingPages].map((page) => ({
    url: `${siteConfig.url}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
