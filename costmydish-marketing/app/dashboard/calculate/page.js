import { appStoreLink, playStoreLink } from '@/lib/site';
import { CalculateClient } from './CalculateClient';

export const metadata = {
  title: 'Calculate food cost — CostMyDish',
  robots: { index: false, follow: false },
};

export default function DashboardCalculatePage() {
  return <CalculateClient appStoreHref={appStoreLink('dashboard-limit')} playStoreHref={playStoreLink('dashboard-limit')} />;
}
