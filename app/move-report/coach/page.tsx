import type { Metadata } from 'next';
import CoachHubClient from './CoachHubClient';

export const metadata: Metadata = {
  title: '코치용 MOVE REPORT | 관찰 체크',
  description: '코치가 수업에서 본 움직임을 직접 체크하고, 유형·수업 힌트를 확인하는 관찰형 도구입니다.',
  robots: { index: false, follow: false },
};

export default function MoveReportCoachHubPage() {
  return <CoachHubClient />;
}
