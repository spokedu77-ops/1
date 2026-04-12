'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { SpokeduRhythmGame } from '@/app/components/runtime/SpokeduRhythmGame';
import { useChallengeBGM } from '@/app/lib/admin/hooks/useChallengeBGM';

/** SPOMOVE 임베드용 고정 1종 — 스튜디오 기본 포맷 1과 동일한 시작 그리드 */
const EMBEDDED_CHALLENGE_GRID = ['앞', '뒤', '앞', '뒤', '앞', '뒤', '앞', '뒤'];

function notifyParentComplete() {
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'challenge-ended' }, window.location.origin);
    }
  } catch {
    /* ignore */
  }
}

function ChallengeProgramInner() {
  const searchParams = useSearchParams();
  const autoStart =
    searchParams.get('autoStart') === '1' || searchParams.get('autoStart') === 'true';
  const { selected: bgmPath, sourceBpm, loading } = useChallengeBGM();

  const onEnd = useCallback(() => {
    notifyParentComplete();
  }, []);

  const ready = useMemo(() => !loading, [loading]);

  return (
    <main
      className="min-h-screen bg-neutral-950 text-neutral-100"
      style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}
    >
      {!ready ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
          챌린지 로딩 중…
        </div>
      ) : (
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-2 py-4">
          <SpokeduRhythmGame
            allowEdit={false}
            soundOn
            lockBpm
            bgmPath={bgmPath || undefined}
            bgmSourceBpm={sourceBpm ?? undefined}
            initialBpm={100}
            initialLevel={1}
            initialGrid={EMBEDDED_CHALLENGE_GRID}
            autoStart={autoStart}
            onEnd={onEnd}
          />
        </div>
      )}
    </main>
  );
}

export default function ChallengeProgramClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-500">
          로딩 중…
        </div>
      }
    >
      <ChallengeProgramInner />
    </Suspense>
  );
}
