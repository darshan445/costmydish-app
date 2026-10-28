import { siteConfig } from '@/lib/site';

export function CtaSection() {
  return (
    <section id="download" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-3xl bg-primary px-8 py-14 text-center text-white sm:px-12">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to cost your next dish?</h2>
        <p className="mx-auto mt-4 max-w-lg text-white/90">
          Download CostMyDish on iOS or Android. Create your account, add ingredients, and see your first recipe cost breakdown in minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={siteConfig.appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-md transition hover:bg-white/90"
          >
            Download on the App Store
          </a>
          <a
            href={siteConfig.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-md transition hover:bg-white/90"
          >
            Get it on Google Play
          </a>
        </div>
      </div>
    </section>
  );
}
