import type { Metadata } from 'next';
import LibraryView from './LibraryView';
import { TrialGateWall } from '../components/ui/TrialGateWall';

export const metadata: Metadata = {
  title: '라이브러리',
  description: '체육 수업 프로그램 라이브러리. 대상별, 태그별로 오늘 쓸 수업안을 빠르게 찾고 SPOMOVE와 바로 연결합니다.',
};

export default function SpokeduMasterLibraryPage() {
  return (
    <TrialGateWall feature="library">
      <LibraryView />
    </TrialGateWall>
  );
}
