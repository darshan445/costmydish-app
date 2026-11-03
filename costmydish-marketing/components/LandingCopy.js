'use client';

import Link from 'next/link';
import { getLandingPage, resolveCopy, resolveFaqs } from '@/lib/landing-pages';
import { useCurrencyCode } from '@/lib/use-currency';

/** A guide section whose worked examples follow the visitor's currency. */
export function GuideSection({ slug, index }) {
  const code = useCurrencyCode();
  const section = getLandingPage(slug)?.sections?.[index];
  if (!section) return null;
  const body = resolveCopy(section.body, code);
  const list = resolveCopy(section.list, code);

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold text-text">{section.h2}</h2>
      {section.formula ? (
        <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 font-semibold text-primary-dark">
          {section.formula}
        </p>
      ) : null}
      {body?.map((paragraph) => (
        <p key={paragraph} className="mt-4 leading-relaxed text-text-secondary">{paragraph}</p>
      ))}
      {list ? (
        <ul className="mt-4 space-y-2">
          {list.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-text-secondary">
              <span className="mt-0.5 text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {section.link ? (
        <Link href={section.link.href} className="mt-4 inline-block font-semibold text-primary underline">
          {section.link.label}
        </Link>
      ) : null}
    </section>
  );
}

export function LandingFaqList({ slug }) {
  const code = useCurrencyCode();
  const faqs = resolveFaqs(getLandingPage(slug)?.faqs ?? [], code);

  return (
    <div className="mt-8 space-y-4">
      {faqs.map((item) => (
        <details key={item.q} className="group rounded-xl border border-border bg-surface px-5 py-4">
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
  );
}
