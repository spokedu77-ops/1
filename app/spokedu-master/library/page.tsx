import type { Metadata } from 'next';
import { TrialGateWall } from '../components/ui/TrialGateWall';
import LibraryView from './LibraryView';

export const metadata: Metadata = {
  title: '라이브러리',
  description: '체육 수업 프로그램을 검색하고, 수업안과 SPOMOVE 큰 화면 활동을 바로 연결하는 SPOKEDU MASTER 라이브러리입니다.',
};

export default function SpokeduMasterLibraryPage() {
  return (
    <TrialGateWall feature="library">
      <LibraryView />
    </TrialGateWall>
  );
}
