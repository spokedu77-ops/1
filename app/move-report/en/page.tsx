import { Suspense } from 'react';
import MoveReportClient from '../MoveReportClient';
import { getMoveReportUi } from '../i18n/ui';

export default function MoveReportEnPage() {
  const loading = getMoveReportUi('en').loadingPage;
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
          {loading}
        </div>
      }
    >
      <MoveReportClient locale="en" />
    </Suspense>
  );
}
