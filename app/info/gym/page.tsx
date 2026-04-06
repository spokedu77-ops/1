import type { Metadata } from 'next';
import GymLandingClient from './components/GymLandingClient';
import './styles/gym-landing.css';

export const metadata: Metadata = {
  title: 'SPOKEDU LAB | 강동구 아동 체육',
  description:
    '운동을 싫어하는 아이도 12주면 먼저 가방을 챙깁니다. 연세대 체교 기반 커리큘럼, 최대 10명 소그룹, 분기 성장 리포트.',
  openGraph: {
    title: 'SPOKEDU LAB | 12주 변화가 보이는 체육 수업',
    description:
      '서울 강동구 아동 체육. 체험 수업 15,000원으로 시작하고 아이에게 맞는 반을 상담으로 추천합니다.',
  },
};

export default function GymInfoPage() {
  return <GymLandingClient />;
}
