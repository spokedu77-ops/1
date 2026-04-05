import { Suspense } from 'react';
import MoveReportSharedContent from './MoveReportSharedContent';

function SharedFallback() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0D0D0D',
        color: '#A2A2A2',
        padding: '24px',
        display: 'grid',
        placeItems: 'center',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      불러오는 중…
    </main>
  );
}

export default function MoveReportSharedPage() {
  return (
    <Suspense fallback={<SharedFallback />}>
      <MoveReportSharedContent />
    </Suspense>
  );
}
