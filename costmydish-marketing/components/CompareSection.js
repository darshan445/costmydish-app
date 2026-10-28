const PAIN_POINTS = [
  {
    problem: 'Spreadsheets',
    complaint: 'Formulas break when units mix or one supplier price changes',
    costmydish: 'Smart unit conversion + one-tap price updates recalculate every dish',
  },
  {
    problem: 'Enterprise tools (meez, xtraCHEF)',
    complaint: '$75+/mo, browser-only, steep learning curve, POS lock-in',
    costmydish: 'Free to start, mobile-first, live in minutes — no integrations required',
  },
  {
    problem: 'Generic recipe apps',
    complaint: 'Built for home cooking, not food cost % and menu margins',
    costmydish: 'Food cost %, profit, targets, and over-target alerts built in',
  },
  {
    problem: 'Bakery-only calculators',
    complaint: 'Narrow focus, dated UX, or paid before you see value',
    costmydish: 'Works for bakery, restaurant, truck & catering — free tier to try',
  },
];

export function CompareSection() {
  return (
    <section id="why-costmydish" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Why CostMyDish</p>
          <h2 className="mt-2 text-3xl font-extrabold text-text sm:text-4xl">
            Built for food businesses — not spreadsheets
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Owners switch to CostMyDish when enterprise software is overkill and spreadsheets are error-prone.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-5 py-4 font-bold text-text">Alternative</th>
                <th className="px-5 py-4 font-bold text-text">Common complaint</th>
                <th className="px-5 py-4 font-bold text-primary">CostMyDish</th>
              </tr>
            </thead>
            <tbody>
              {PAIN_POINTS.map((row) => (
                <tr key={row.problem} className="border-t border-border bg-surface">
                  <td className="px-5 py-4 font-semibold text-text">{row.problem}</td>
                  <td className="px-5 py-4 text-text-secondary">{row.complaint}</td>
                  <td className="px-5 py-4 text-text">{row.costmydish}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <a href="/compare" className="font-semibold text-primary underline">See full comparison →</a>
        </p>
      </div>
    </section>
  );
}
