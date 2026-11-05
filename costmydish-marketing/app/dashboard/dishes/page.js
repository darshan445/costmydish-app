import { DishesClient } from './DishesClient';

export const metadata = {
  title: 'Dishes — CostMyDish',
  robots: { index: false, follow: false },
};

export default function DishesPage() {
  return <DishesClient />;
}
