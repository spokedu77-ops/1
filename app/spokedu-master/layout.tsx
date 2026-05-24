import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'SPOKEDU MASTER — 체육교육 OTT 구독 서비스',
    template: '%s — SPOKEDU MASTER',
  },
  description: '수업안, SPOMOVE 큰 화면 활동, 설명 문구를 하나의 수업 실행 루프로 연결하는 체육교육 OTT 구독 서비스.',
  keywords: ['체육교육', '놀이체육', 'SPOMOVE', '수업 준비', '체육 강사', '스포츠 교육', '반응훈련'],
  authors: [{ name: 'SPOKEDU' }],
  creator: 'SPOKEDU',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spokedu.com'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'SPOKEDU MASTER',
    title: 'SPOKEDU MASTER — 체육교육 OTT 구독 서비스',
    description: '수업안, SPOMOVE 큰 화면 실행, 설명 문구를 하나의 수업 실행 루프로 연결합니다.',
    images: [{ url: '/api/spokedu-master/og', width: 1200, height: 630, alt: 'SPOKEDU MASTER' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SPOKEDU MASTER',
    description: '수업안, 큰 화면 활동, 설명 문구를 연결한 체육교육 OTT 구독 서비스',
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
