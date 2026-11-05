import { Suspense } from 'react';
import { appStoreLink, playStoreLink } from '@/lib/site';
import { EditDishClient } from './EditDishClient';

export const metadata = {
  title: 'Edit dish — CostMyDish',
  robots: { index: false, follow: false },
};

export default function EditDishPage() {
  return (
    <Suspense>
      <EditDishClient appStoreHref={appStoreLink('dashboard-limit')} playStoreHref={playStoreLink('dashboard-limit')} />
    </Suspense>
  );
}
