import type { Metadata } from 'next';
import SpokeduProClient from './SpokeduProClient';

export const metadata: Metadata = {
  title: '스포키듀 구독 | SPOKEDU PRO',
  description: 'Accessible Smart PE. 스포키듀 스마트 대시보드 및 구독자 전용 콘텐츠.',
};

export default function SpokeduProPage() {
  return <SpokeduProClient isEditMode={false} />;
}
