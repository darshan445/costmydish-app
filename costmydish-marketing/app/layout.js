import { Inter } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import {
  JsonLd,
  buildLanguageAlternates,
  buildPageMetadata,
  mobileAppJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import { siteConfig } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const defaultMetadata = buildPageMetadata({
  title: 'CostMyDish – Free Food Cost Calculator App for Chefs, Bakers & Restaurants',
  description:
    'Free food costing calculator for restaurants, bakeries, caterers and food trucks in the US, UK, Canada, Australia & India. Calculate food cost %, recipe cost, and profit on iOS and Android.',
  pathname: '/',
});

export const metadata = {
  ...defaultMetadata,
  metadataBase: new URL(siteConfig.url),
  applicationName: 'CostMyDish',
  category: 'food & drink',
  keywords: [
    'food cost calculator',
    'recipe cost calculator',
    'food costing app',
    'restaurant food cost',
    'bakery pricing calculator',
    'menu costing',
    'food cost percentage',
    'recipe costing software',
    'catering food cost',
    'food truck pricing',
  ],
  authors: [{ name: 'CostMyDish' }],
  creator: 'CostMyDish',
  publisher: 'CostMyDish',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  alternates: {
    ...defaultMetadata.alternates,
    languages: buildLanguageAlternates('/'),
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : {},
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <JsonLd data={mobileAppJsonLd()} />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
