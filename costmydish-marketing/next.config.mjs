/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  async redirects() {
    return [
      { source: '/restaurant-menu-costing', destination: '/menu-pricing-calculator', permanent: true },
    ];
  },
};

export default nextConfig;
