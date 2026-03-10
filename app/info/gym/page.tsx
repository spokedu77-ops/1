import type { Metadata } from 'next';
import GymLandingClient from './components/GymLandingClient';
import './styles/gym-landing.css';

export const metadata: Metadata = {
  title: 'SPOKEDU | 체육관 수업 안내',
  description: '50분 정규수업 · 12주 커리큘럼 · 소그룹 레벨링 · 성장 리포트',
  openGraph: {
    title: 'SPOKEDU LAB | 놀이 기반 멀티스포츠',
    description: '50분 수업 · 12주 커리큘럼 · 소그룹 레벨링 · 성장 리포트',
  },
};

export default function GymInfoPage() {
  return <GymLandingClient />;
}
