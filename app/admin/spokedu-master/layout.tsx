'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

const AppShell = dynamic(
  () => import('@/app/spokedu-master/components/layout/AppShell').then((m) => m.AppShell),
  { ssr: false }
);

export default function AdminSpokeduMasterLayout({ children }: { children: ReactNode }) {
  return <AppShell basePath="/admin/spokedu-master">{children}</AppShell>;
}
