import { siteConfig } from '@/lib/site';

const DEFAULT_OG = `${siteConfig.url}/og-image.png`;

export const targetLocales = [
  { hrefLang: 'en-US', label: 'United States' },
  { hrefLang: 'en-GB', label: 'United Kingdom' },
  { hrefLang: 'en-CA', label: 'Canada' },
  { hrefLang: 'en-AU', label: 'Australia' },
  { hrefLang: 'en-IN', label: 'India' },
  { hrefLang: 'x-default', label: 'Default' },
];

export function buildLanguageAlternates(pathname = '/') {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const languages = {};
  for (const locale of targetLocales) {
    languages[locale.hrefLang] = `${siteConfig.url}${path === '/' ? '' : path}`;
  }
  return languages;
}

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {string} [options.pathname='/']
 * @param {string} [options.ogImage]
 * @param {boolean} [options.noIndex=false]
 */
export function buildPageMetadata({
  title,
  description,
  pathname = '/',
  ogImage = DEFAULT_OG,
  noIndex = false,
}) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const url = `${siteConfig.url}${path === '/' ? '' : path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(path),
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url,
      siteName: 'CostMyDish',
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CostMyDish',
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    email: siteConfig.supportEmail,
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CostMyDish',
    url: siteConfig.url,
    description:
      'Free food cost calculator app for restaurants, bakeries, caterers, and food trucks.',
    publisher: {
      '@type': 'Organization',
      name: 'CostMyDish',
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/logo.png`,
      },
    },
  };
}

export function mobileAppJsonLd(overrides = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'CostMyDish',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'iOS, Android',
    url: siteConfig.url,
    downloadUrl: [siteConfig.appStoreUrl, siteConfig.playStoreUrl],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      'Food cost calculator and recipe costing app for chefs, bakers, restaurants, and food businesses.',
    ...overrides,
  };
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.href.startsWith('http') ? item.href : `${siteConfig.url}${item.href}`,
    })),
  };
}

export function faqJsonLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
