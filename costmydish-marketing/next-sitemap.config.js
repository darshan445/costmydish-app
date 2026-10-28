/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.costmydish.com',
  generateRobotsTxt: false,
  exclude: [
    '/confirm',
    '/reset-password',
    '/update-password',
    '/delete-account',
    '/sitemap.xml',
    '/robots.txt',
  ],
  transform: async (config, path) => {
    const priorities = {
      '/': 1.0,
      '/food-cost-calculator': 0.95,
      '/recipe-cost-calculator': 0.95,
      '/bakery-pricing-calculator': 0.9,
      '/restaurant-menu-costing': 0.9,
      '/compare': 0.85,
      '/contact': 0.6,
      '/privacy': 0.3,
      '/terms': 0.3,
    };

    return {
      loc: path,
      changefreq: path === '/' || path.includes('calculator') || path.includes('costing') ? 'weekly' : 'monthly',
      priority: priorities[path] ?? 0.5,
      lastmod: new Date().toISOString(),
    };
  },
};
