import type { Metadata } from 'next';
import PrivateLandingClient from './components/PrivateLandingClient';
import './styles/private-landing.css';

export const metadata: Metadata = {
  title: 'SPOKEDU | 프리미엄 1:1 방문 체육',
  description:
    '스포키듀 프리미엄 아동 청소년 방문 체육. 즐거운 신체활동으로 평생체육의 경험을 선물합니다.',
  openGraph: {
    type: 'website',
    title: 'SPOKEDU | 프리미엄 1:1 방문 체육',
    description:
      '아이의 눈높이에 맞춘 1:1 방문 체육. 즐거운 신체활동으로 평생체육의 경험을 선물합니다.',
  },
};

export default function PrivateInfoPage() {
  return (
    <div className="private-landing">
      <PrivateLandingClient />
    </div>
  );
}
