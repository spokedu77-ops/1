import { Suspense } from 'react';
import type { Metadata } from 'next';
import CoachObserveClient from './CoachObserveClient';

export const metadata: Metadata = {
  title: '코치 관찰 체크 | MOVE REPORT',
  description: '코치가 직접 관찰해 움직임 성향을 체크합니다.',
  robots: { index: false, follow: false },
};

export default function CoachObservePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#0D0D0D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          로딩 중...
        </div>
      }
    >
      <CoachObserveClient />
    </Suspense>
  );
}
