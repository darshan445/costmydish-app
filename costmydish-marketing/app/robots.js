import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

/** @returns {MetadataRoute.Robots} */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/confirm',
          '/reset-password',
          '/update-password',
          '/delete-account',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
