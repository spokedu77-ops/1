'use client';

/**
 * PLAY v1 엔진 최소 동작 확인 페이지
 * npm run dev 후 /play-test 접속
 */

import { PlayTestContent } from '@/app/components/play-test/PlayTestContent';

export default function PlayTestPage() {
  return (
    <main className="p-4">
      <h1 className="mb-4 text-xl font-bold">PLAY v1 엔진 테스트</h1>
      <PlayTestContent debug seed={12345} />
    </main>
  );
}
