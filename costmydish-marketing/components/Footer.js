import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="CostMyDish" width={36} height={36} className="rounded-full" />
              <span className="text-lg font-bold">CostMyDish</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Free food cost calculator for chefs, home bakers, caterers and food truck owners. Know your food cost %. Price with confidence.
            </p>
          </div>

          <div className="flex flex-wrap gap-16 md:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="/#features" className="text-text-secondary hover:text-primary">Features</a></li>
                <li><a href="/#how-it-works" className="text-text-secondary hover:text-primary">How it works</a></li>
                <li><a href="/#pricing" className="text-text-secondary hover:text-primary">Pricing</a></li>
                <li><a href="/compare" className="text-text-secondary hover:text-primary">Compare</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Guides</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="/food-cost-calculator" className="text-text-secondary hover:text-primary">Food cost calculator</a></li>
                <li><a href="/recipe-cost-calculator" className="text-text-secondary hover:text-primary">Recipe cost calculator</a></li>
                <li><a href="/bakery-pricing-calculator" className="text-text-secondary hover:text-primary">Bakery pricing</a></li>
                <li><a href="/restaurant-menu-costing" className="text-text-secondary hover:text-primary">Restaurant menu costing</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Support</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/contact" className="text-text-secondary hover:text-primary">Contact & Support</Link></li>
                <li><Link href="/terms" className="text-text-secondary hover:text-primary">Terms & Conditions</Link></li>
                <li><Link href="/privacy" className="text-text-secondary hover:text-primary">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-text-secondary">
          © {new Date().getFullYear()} CostMyDish. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
