import { siteConfig } from '@/lib/site';

export default function manifest() {
  return {
    name: 'CostMyDish — Food Cost Calculator',
    short_name: 'CostMyDish',
    description:
      'Free food cost calculator for restaurants, bakeries, caterers, and food trucks.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAF8',
    theme_color: '#2D6A4F',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'food', 'finance'],
    lang: 'en',
    id: siteConfig.url,
  };
}
