import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ContentAreaTabs } from '../content/ContentAreaTabs';

export const metadata: Metadata = { title: '현장 기록 관리 | SPOKEDU', robots: { index: false, follow: false } };
export default function FieldRecordAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-6 sm:px-6">
      <ContentAreaTabs />
      {children}
    </div>
  );
}
