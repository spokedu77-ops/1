import type { Metadata } from 'next';
import SpokeduHomeLanding from './components/home-landing';

export const metadata: Metadata = {
  title: 'SPOKEDU 스포키듀 | 아동·청소년 체육교육 전문 단체',
  description:
    'SPOKEDU는 아이들의 움직임을 교육적으로 설계하고, 그 움직임을 수업·커리큘럼·콘텐츠로 확장하는 아동·청소년 체육교육 전문 단체입니다.',
  keywords: ['아동 체육교육', '청소년 체육교육', '어린이 체육수업', '초등 체육수업', 'SPOKEDU'],
  alternates: {
    canonical: '/spokedu',
  },
};

export default function SpokeduHomePage() {
  return <SpokeduHomeLanding />;
}
