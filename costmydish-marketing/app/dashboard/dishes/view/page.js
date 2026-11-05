import { Suspense } from 'react';
import { DishDetailClient } from './DishDetailClient';

export const metadata = {
  title: 'Dish — CostMyDish',
  robots: { index: false, follow: false },
};

export default function DishDetailPage() {
  return (
    <Suspense>
      <DishDetailClient />
    </Suspense>
  );
}
