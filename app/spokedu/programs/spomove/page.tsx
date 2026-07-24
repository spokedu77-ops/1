import { Suspense } from 'react';
import SpomoveCatalogTabs from '../../components/spomove-catalog-tabs';
import { buildProgramDetailMetadata } from '../_components/program-detail-template';

export const metadata = buildProgramDetailMetadata('spomove');

function SpomoveCatalogFallback() {
  return (
    <div className="rounded-[1.5rem] border border-[#DCE3EE] bg-white p-6 text-sm text-[#536279] sm:p-8">
      SPOMOVE 자료를 불러오는 중입니다.
    </div>
  );
}

export default function SpokeduProgramSpomovePage() {
  return (
    <Suspense fallback={<SpomoveCatalogFallback />}>
      <SpomoveCatalogTabs />
    </Suspense>
  );
}
