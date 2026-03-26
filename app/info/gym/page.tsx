import type { Metadata } from 'next';
import GymLandingClient from './components/GymLandingClient';
import './styles/gym-landing.css';

export const metadata: Metadata = {
  title: 'SPOKEDU LAB | MOVE CORE 아동청소년 체육교육',
  description:
    'MOVE CORE 중심의 아동청소년 체육교육 LAB. 성장·보완·적용 흐름으로 움직임을 설계합니다.',
  openGraph: {
    title: 'SPOKEDU LAB | 움직임을 배우는 체육관',
    description:
      '집중·반응, 몸의 기본, 게임·스포츠 적용까지. 아이의 움직임을 세 축으로 설계하는 아동청소년 체육교육 공간.',
  },
};

export default function GymInfoPage() {
  return <GymLandingClient />;
}
