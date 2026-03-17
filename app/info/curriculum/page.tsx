import type { Metadata } from 'next';
import CurriculumLandingClient from './CurriculumLandingClient';
import './styles/curriculum-landing.css';

export const metadata: Metadata = {
  title: 'SPOKEDU | 몰입형 인터랙티브 웜업의 표준',
  description:
    '아이부터 시니어, 느린 학습자까지. 모두가 자발적으로 몰입하는 프로그램으로 귀 기관의 교육 시스템을 진화시킵니다.',
  openGraph: {
    title: 'SPOKEDU | 몰입형 인터랙티브 웜업의 표준',
    description:
      '연세대 체육교육 전문가 × 3만 팔로워의 선택. 몰입형 인터랙티브 웜업, 대한민국 체육의 새 기준.',
  },
};

export default function CurriculumSalesPage() {
  return <CurriculumLandingClient />;
}
