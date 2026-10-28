const FEATURES = [
  {
    title: 'Ingredient library',
    description: 'Store purchase prices, pack sizes, and units. Update a price once — every recipe that uses it recalculates automatically.',
    icon: '🥕',
  },
  {
    title: 'Smart unit conversion',
    description: 'Mix kg, g, oz, ml, cups, and more. Weight converts to weight, volume to volume — incompatible units show a clear error.',
    icon: '⚖️',
  },
  {
    title: 'Live recipe costing',
    description: 'Add ingredients to a recipe and watch total cost, cost per unit, food cost %, and profit update as you type.',
    icon: '📊',
  },
  {
    title: 'Multiple selling formats',
    description: 'Sell by the slice, whole pizza, portion, or custom format. Each format gets its own margin and suggested price.',
    icon: '🍕',
  },
  {
    title: 'Food cost targets',
    description: 'Set a target food cost %. See green, yellow, or red margin status so you know when to raise prices.',
    icon: '🎯',
  },
  {
    title: 'Price history',
    badge: 'Hobbyist',
    description: 'Hobbyist subscribers get automatic price change tracking — see how ingredient costs affect your margins over time.',
    icon: '📈',
  },
];

export function Features() {
  return (
    <section id="features" className="bg-surface-alt px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Features</p>
          <h2 className="mt-2 text-3xl font-extrabold text-text sm:text-4xl">
            Everything you need to cost a menu
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Built for restaurant owners, home bakers, caterers and food trucks — not spreadsheets. The food cost calculator that works for any format you sell.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-border bg-surface p-6 transition hover:border-primary/20 hover:shadow-md"
            >
              <span className="text-3xl" role="img" aria-hidden>{feature.icon}</span>
              <h3 className="mt-4 flex flex-wrap items-center gap-2 text-lg font-bold text-text">
                {feature.title}
                {feature.badge ? (
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    {feature.badge}
                  </span>
                ) : null}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
