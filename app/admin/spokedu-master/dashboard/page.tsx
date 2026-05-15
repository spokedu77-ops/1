'use client';

import dynamic from 'next/dynamic';

const DashboardView = dynamic(
  () => import('@/app/spokedu-master/dashboard/DashboardView'),
  { ssr: false }
);

export default function AdminSpokeduMasterDashboardPage() {
  return <DashboardView />;
}
