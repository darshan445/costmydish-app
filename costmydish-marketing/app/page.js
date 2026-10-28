import { CtaSection } from '@/components/CtaSection';
import { CompareSection } from '@/components/CompareSection';
import { Faq } from '@/components/Faq';
import { Features } from '@/components/Features';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { Pricing } from '@/components/Pricing';
import { JsonLd, faqJsonLd } from '@/lib/seo';
import { MARKETING_FAQ } from '@/lib/faqs';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <CompareSection />
      <Faq />
      <Pricing />
      <CtaSection />
      <JsonLd data={faqJsonLd(MARKETING_FAQ)} />
    </>
  );
}
