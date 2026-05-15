'use client';

import dynamic from 'next/dynamic';

const ReportPage = dynamic(
  () => import('@/app/spokedu-master/report/page'),
  { ssr: false }
);

export default function AdminSpokeduMasterReportPage() {
  return <ReportPage />;
}
