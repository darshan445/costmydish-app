import QRCode from 'qrcode';
import { appStoreLink, playStoreLink, smartAppLink } from '@/lib/site';

export async function CtaSection({
  campaign = 'home',
  title = 'Ready to cost your next dish?',
  description = 'Download CostMyDish free on iPhone or Android. Type what you’re making, add ingredients with what you paid, and see your cost and a selling price in about 2 minutes.',
}) {
  const qrSvg = await QRCode.toString(smartAppLink(`${campaign}-qr`), {
    type: 'svg',
    margin: 1,
    width: 152,
    color: { dark: '#1B4332', light: '#FFFFFF' },
  });

  return (
    <section id="download" className="px-4 py-20 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 rounded-3xl bg-primary px-8 py-14 text-white sm:px-12 md:flex-row md:text-left">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{title}</h2>
          <p className="mt-4 max-w-lg text-white/90">{description}</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:items-start">
            <a
              href={appStoreLink(campaign)}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-md transition hover:bg-white/90"
            >
              Download on the App Store
            </a>
            <a
              href={playStoreLink(campaign)}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-md transition hover:bg-white/90"
            >
              Get it on Google Play
            </a>
          </div>
          <p className="mt-4 text-xs text-white/75">Free plan: 5 dishes and 20 ingredients. No credit card.</p>
        </div>

        <div className="hidden shrink-0 flex-col items-center md:flex">
          <div
            className="rounded-2xl bg-white p-3 shadow-lg"
            role="img"
            aria-label="QR code to download CostMyDish"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-3 text-center text-xs font-semibold text-white/90">
            On a computer? Scan with
            <br />
            your phone camera
          </p>
        </div>
      </div>
    </section>
  );
}
