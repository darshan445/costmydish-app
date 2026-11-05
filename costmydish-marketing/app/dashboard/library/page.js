import { appStoreLink, playStoreLink } from '@/lib/site';
import { LibraryClient } from './LibraryClient';

export const metadata = {
  title: 'Library — CostMyDish',
  robots: { index: false, follow: false },
};

export default function LibraryPage() {
  return <LibraryClient appStoreHref={appStoreLink('dashboard-limit')} playStoreHref={playStoreLink('dashboard-limit')} />;
}
