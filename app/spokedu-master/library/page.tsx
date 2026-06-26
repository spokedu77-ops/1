import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TrialGateWall } from '../components/ui/TrialGateWall';
import LibraryView from './LibraryView';

export const metadata: Metadata = {
  title: '라이브러리',
  description: '체육 수업 프로그램을 검색하고 전체 수업 자료와 참고 자료를 확인하는 SPOKEDU MASTER 라이브러리입니다. 일부 수업은 명시 연결된 SPOMOVE 활동과 함께 활용할 수 있습니다.',
};

export default function SpokeduMasterLibraryPage() {
  return (
    <TrialGateWall feature="library">
      <Suspense fallback={null}>
        <LibraryView />
      </Suspense>
    </TrialGateWall>
  );
}
