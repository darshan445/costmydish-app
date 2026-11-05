import { Suspense } from 'react';
import { DashboardHome } from './DashboardHome';

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardHome />
    </Suspense>
  );
}
