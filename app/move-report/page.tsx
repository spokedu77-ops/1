import { Suspense } from 'react';
import MoveReportClient from './MoveReportClient';

export default function MoveReportPage() {
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
      <MoveReportClient />
    </Suspense>
  );
}
