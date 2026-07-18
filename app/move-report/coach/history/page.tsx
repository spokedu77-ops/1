import type { Metadata } from 'next';
import CoachHistoryClient from './CoachHistoryClient';

export const metadata: Metadata = {
  title: '코치 관찰 이력 | MOVE REPORT',
  description: '이 기기에 저장된 코치 관찰 결과 목록입니다.',
  robots: { index: false, follow: false },
};

export default function CoachHistoryPage() {
  return <CoachHistoryClient />;
}
