import QRCode from 'qrcode';
import { appStoreLink, playStoreLink, smartAppLink } from '@/lib/site';
import { DashboardGate } from './DashboardGate';

export const metadata = {
  title: 'Dashboard — CostMyDish',
  robots: { index: false, follow: false },
  alternates: { canonical: null, languages: null },
};

export default async function DashboardLayout({ children }) {
  const qrSvg = await QRCode.toString(smartAppLink('dashboard-qr'), {
    type: 'svg',
    margin: 1,
    width: 168,
    color: { dark: '#1B4332', light: '#FFFFFF' },
  });
  const getApp = { qrSvg, appStoreHref: appStoreLink('dashboard'), playStoreHref: playStoreLink('dashboard') };
  return <DashboardGate getApp={getApp}>{children}</DashboardGate>;
}
