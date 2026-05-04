import { Suspense } from 'react';
import ProApplyClient from './ProApplyClient';

export default function ProApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[var(--viewport-height-px,100dvh)] items-center justify-center bg-[#050509] text-sm text-slate-500">
          불러오는 중…
        </div>
      }
    >
      <ProApplyClient />
    </Suspense>
  );
}
