import type { Metadata } from 'next';
import { Suspense } from 'react';
import SpomoveHubView from './SpomoveHubView';

export const metadata: Metadata = {
  title: 'SPOMOVE',
  description: '빔, TV, 태블릿에서 화면으로 실행하는 반응훈련입니다. 수업 라이브러리와 별도로 꺼내 쓰는 움직임 활동입니다.',
};

export default function SpokeduMasterSpomovePage() {
  return (
    <Suspense fallback={null}>
      <SpomoveHubView />
    </Suspense>
  );
}
