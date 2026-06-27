import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'SPOKEDU MASTER · 체육교육 수업 운영 서비스',
    template: '%s · SPOKEDU MASTER',
  },
  description: '체육 강사가 수업 전 확인할 수업 자료와 영상 자료, 현장에서 쓰는 SPOMOVE 큰 화면 활동을 제공하는 30일 이용권 서비스.',
  keywords: ['체육교육', '유아체육', 'SPOMOVE', '수업 자료', '체육 강사', '스포츠 교육', '반응훈련'],
  authors: [{ name: 'SPOKEDU' }],
  creator: 'SPOKEDU',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spokedu.com'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'SPOKEDU MASTER',
    title: 'SPOKEDU MASTER · 체육교육 수업 운영 서비스',
    description: '수업 전 확인하는 수업 자료와 영상 자료, 현장에서 쓰는 SPOMOVE 큰 화면 활동을 제공합니다.',
    images: [{ url: '/api/spokedu-master/og', width: 1200, height: 630, alt: 'SPOKEDU MASTER' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SPOKEDU MASTER',
    description: '체육 수업 자료와 SPOMOVE 큰 화면 활동을 제공하는 체육교육 30일 이용권 서비스',
    images: ['/api/spokedu-master/og'],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SpokeduMasterLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
