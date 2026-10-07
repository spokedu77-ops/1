import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '기관 전용 로그인 | SPOKEDU LAB',
  robots: { index: false, follow: false },
};

export default function InstitutionLayout({ children }: { children: ReactNode }) {
  return children;
}
