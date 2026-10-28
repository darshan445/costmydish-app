import { MARKETING_FAQ } from '@/lib/faqs';

export function Faq() {
  return (
    <section id="faq" className="relative z-10 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">FAQ</p>
          <h2 className="mt-2 text-3xl font-extrabold text-text sm:text-4xl">Common questions</h2>
        </div>

        <div className="mt-12 space-y-4">
          {MARKETING_FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-surface px-5 py-4"
            >
              <summary className="cursor-pointer list-none font-semibold text-text marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="shrink-0 text-primary transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
