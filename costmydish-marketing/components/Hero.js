import Image from 'next/image';

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-primary">
            The free food cost calculator for chefs, bakers and food businesses
          </p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-text sm:text-4xl lg:text-[2.5rem]">
            CostMyDish – Free Food Cost Calculator App
            <span className="block text-primary">for Chefs, Bakers &amp; Restaurants</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
            Free food costing calculator for chefs, home bakers, caterers and food trucks. Build your ingredient library, cost recipes in real time, and set selling prices that hit your food cost % target.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#download"
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary-dark"
            >
              Download free
            </a>
            <a
              href="#how-it-works"
              className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-bold text-text transition hover:border-primary/30"
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="rounded-3xl border border-border bg-surface p-8 shadow-lg">
            <Image
              src="/logo.png"
              alt="CostMyDish app"
              width={280}
              height={280}
              className="mx-auto"
              priority
            />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Food cost %', value: '30%' },
                { label: 'Profit / slice', value: '$3.59' },
                { label: 'Total cost', value: '$3.21' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-surface-alt px-2 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{stat.label}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{stat.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs leading-relaxed text-text-secondary">
              Live example: Margherita pizza — 4 ingredients, real numbers, instant results.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
