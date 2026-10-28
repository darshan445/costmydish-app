const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try CostMyDish and cost your first recipes.',
    features: [
      'Up to 5 recipes',
      'Up to 20 ingredients',
      'Full cost calculations',
      'Selling format analysis',
      'Margin status badges',
    ],
    cta: 'Get started free',
    highlighted: false,
  },
  {
    name: 'Hobbyist',
    price: '$4.99',
    period: '/ month',
    annualNote: 'or $39.99/year (~$3.33/mo)',
    description: 'For growing menus and serious home cooks.',
    features: [
      'Unlimited recipes',
      'Unlimited ingredients',
      'Ingredient price history',
      'Cloud sync across devices',
      'Everything in Free',
    ],
    cta: 'Upgrade in app',
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-surface-alt px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Pricing</p>
          <h2 className="mt-2 text-3xl font-extrabold text-text sm:text-4xl">
            Start free. Upgrade when you need more.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-text-secondary">
            Subscriptions are managed through the App Store or Google Play via RevenueCat. Prices shown in USD.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl items-center gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl border ${
                plan.highlighted
                  ? 'border-2 border-primary bg-primary/5 p-9 shadow-lg md:p-10'
                  : 'border-border bg-surface p-8'
              }`}
            >
              {plan.highlighted && (
                <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-bold text-text">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-text">{plan.price}</span>
                <span className="text-text-secondary">{plan.period}</span>
              </div>
              {plan.annualNote && (
                <p className="mt-1 text-sm text-primary font-medium">{plan.annualNote}</p>
              )}
              <p className="mt-3 text-sm text-text-secondary">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-text">
                    <span className="mt-0.5 text-primary">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#download"
                className={`mt-8 block rounded-full py-3 text-center text-sm font-bold transition ${
                  plan.highlighted
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'border border-border bg-surface-alt text-text hover:border-primary/30'
                }`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
