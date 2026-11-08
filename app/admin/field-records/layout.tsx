import type { Metadata } from 'next';
import type { ReactNode } from 'react';
export const metadata: Metadata = { title: '현장 기록 관리 | SPOKEDU', robots: { index: false, follow: false } };
export default function FieldRecordAdminLayout({ children }: { children: ReactNode }) { return children; }
