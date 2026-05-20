import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'SPOKEDU MASTER — 수업 준비는 쉽게, 수업은 더 몰입감 있게',
    template: '%s — SPOKEDU MASTER',
  },
  description: '놀이체육과 SPOMOVE를 위한 반응형 구독 플랫폼. 라이브러리에서 수업을 고르고, 큰 화면으로 실행하고, 설명 도구로 수업의 가치를 남깁니다.',
  keywords: ['체육교육', '놀이체육', 'SPOMOVE', '수업 준비', '체육 강사', '스포츠 교육', '반응훈련'],
  authors: [{ name: 'SPOKEDU' }],
  creator: 'SPOKEDU',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spokedu.com'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'SPOKEDU MASTER',
    title: 'SPOKEDU MASTER — 수업 준비는 쉽게, 수업은 더 몰입감 있게',
    description: '프로그램 라이브러리, SPOMOVE 큰 화면 실행, 수업 설명 도구를 하나의 수업 루프로 연결합니다.',
    images: [{ url: '/api/spokedu-master/og', width: 1200, height: 630, alt: 'SPOKEDU MASTER' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SPOKEDU MASTER',
    description: '놀이체육과 SPOMOVE를 위한 반응형 구독 플랫폼',
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
