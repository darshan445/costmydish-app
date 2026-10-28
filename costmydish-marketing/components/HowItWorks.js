const STEPS = [
  {
    step: '01',
    title: 'Add your ingredients',
    description: 'Enter what you buy and what you paid — e.g. flour at $3.99 per 2kg, milk at ₹50 per litre. Optional waste % for trim and spoilage. Works in any currency and any unit.',
  },
  {
    step: '02',
    title: 'Build a recipe',
    description: 'Pick ingredients from your library, enter quantities and units, and set your target food cost %. See live cost preview as you go.',
  },
  {
    step: '03',
    title: 'Add selling formats',
    description: 'Define how you sell — 8 slices at $3.99 each, or a whole pizza at $14.99, or a food truck combo at $12.99. The app costs per unit and shows profit and food cost % for each format.',
  },
  {
    step: '04',
    title: 'Price with confidence',
    description: 'Use suggested prices, margin badges, and dashboard alerts to keep every dish on target. Update an ingredient price — all recipes refresh instantly.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold text-text sm:text-4xl">
            From pantry to profit in four steps
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {STEPS.map((item) => (
            <div key={item.step} className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {item.step}
              </div>
              <div>
                <h3 className="text-lg font-bold text-text">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-primary-dark p-8 text-white sm:p-10">
          <h3 className="text-xl font-bold">Example: Margherita Pizza</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85">
            Cost flour, sauce, mozzarella, and olive oil → total recipe cost $3.21. Sell 8 slices at $3.99 → 10% food cost, $3.59 profit per slice. Sell a whole pizza at $14.99 → 21% food cost, $11.78 profit. One recipe, multiple formats, full clarity.
          </p>
        </div>
      </div>
    </section>
  );
}
