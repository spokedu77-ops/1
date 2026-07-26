import type { Metadata } from 'next';
import { Suspense } from 'react';
import LibraryView from './LibraryView';

export const metadata: Metadata = {
  title: '라이브러리',
  description: '큐레이션된 수업 컬렉션과 검색으로 바로 쓸 체육 수업을 찾는 SPOKEDU MASTER 수업자료입니다. 일부 수업은 명시 연결된 SPOMOVE 활동과 함께 활용할 수 있습니다.',
};

export default function SpokeduMasterLibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryView />
    </Suspense>
  );
}
