import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export const metadata = {
  title: 'Page not found — CostMyDish',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl font-extrabold text-text">Page not found</h1>
        <p className="mt-3 text-text-secondary">This page doesn’t exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-dark">
            Go to the homepage
          </Link>
          <Link href="/food-cost-calculator" className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-bold text-text transition hover:border-primary/30">
            Free food cost calculator
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
