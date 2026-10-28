const STEPS = [
  {
    step: '01',
    title: 'Type what you’re making',
    description: 'Start from Home: “Brownies”, “Chicken biryani”, “Vanilla cake”. Say how many it makes — 12 slices, 24 cookies, 4 plates.',
  },
  {
    step: '02',
    title: 'Add ingredients with what you paid',
    description: 'Flour at $3.99 for 2 kg, milk at ₹50 a litre — then how much the dish uses. Optional waste % for trim. Each ingredient is saved to your Library for next time.',
  },
  {
    step: '03',
    title: 'See your cost and a price — live',
    description: 'Cost per serving and a suggested price update as you type, all on one screen. Enter your own price to see food cost % and profit, then open the full result with a per-ingredient breakdown.',
  },
  {
    step: '04',
    title: 'Stay on target',
    description: 'Sell the same dish more than one way (by the slice and whole). Home flags dishes over your target, and when a buy price changes in your Library, every dish updates.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold text-text sm:text-4xl">
            From “what does it cost?” to a price in 2 minutes
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
            Cost flour, sauce, mozzarella, and olive oil → total recipe cost $3.21. Sell 8 slices at $3.99 → 10% food cost, $3.59 profit per slice. Sell a whole pizza at $14.99 → 21% food cost, $11.78 profit. One recipe, two ways to sell, full clarity.
          </p>
        </div>
      </div>
    </section>
  );
}
