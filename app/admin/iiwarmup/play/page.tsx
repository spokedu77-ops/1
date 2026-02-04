'use client';

import { PlayTestContent } from '@/app/components/play-test/PlayTestContent';

export default function PlayStudioPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
        <h2 className="text-lg font-extrabold">Play Studio</h2>
        <p className="mt-1 text-sm text-neutral-400">
          compile → buildTimeline → RuntimePlayer 실행 + tick/phase 검증
        </p>
      </div>
      <PlayTestContent debug seed={12345} />
    </div>
  );
}
