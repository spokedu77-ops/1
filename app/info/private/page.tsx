import type { Metadata } from 'next';
import PrivateLandingClient from './components/PrivateLandingClient';
import './styles/private-landing.css';

export const metadata: Metadata = {
  title: 'SPOKEDU | 프리미엄 1:1 방문 체육',
  description:
    '스포키듀 프리미엄 아동 청소년 방문 체육. 연세대 체육교육 전문가가 설계한 Play, Think, Grow 맞춤 커리큘럼.',
  openGraph: {
    type: 'website',
    title: 'SPOKEDU | 프리미엄 1:1 방문 체육',
    description:
      '아이의 눈높이에 맞춘 1:1 방문 체육. 구청, 보건소, 프리미엄 호텔이 선택한 스포키듀의 검증된 커리큘럼.',
  },
};

export default function PrivateInfoPage() {
  return (
    <div className="private-landing">
      <PrivateLandingClient />
    </div>
  );
}
