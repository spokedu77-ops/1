import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'SPOKEDU PRO — 수업 준비는 쉽게, 수업은 더 몰입감 있게',
    template: '%s — SPOKEDU PRO',
  },
  description: '체육 강사와 교사를 위한 수업 준비 플랫폼. 프로그램 라이브러리에서 수업을 고르고, SPOMOVE를 큰 화면으로 실행하고, 수업의 의미를 설명 문구로 전달합니다.',
  keywords: ['체육교육', '놀이체육', 'SPOMOVE', '수업 준비', '체육 강사', '스포츠 교육', '반응훈련'],
  authors: [{ name: 'SPOKEDU' }],
  creator: 'SPOKEDU',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spokedu.com'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'SPOKEDU PRO',
    title: 'SPOKEDU PRO — 수업 준비는 쉽게, 수업은 더 몰입감 있게',
    description: '체육 강사와 교사를 위한 수업 준비 플랫폼. 프로그램 라이브러리, SPOMOVE 큰 화면 실행, 수업 도구를 하나로.',
    images: [{ url: '/api/spokedu-master/og', width: 1200, height: 630, alt: 'SPOKEDU PRO' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SPOKEDU PRO',
    description: '체육 강사와 교사를 위한 수업 준비 플랫폼',
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
