'use client';

/**
 * PLAY v1 엔진 테스트 공유 컴포넌트
 * app/play-test, app/admin/iiwarmup/play-test 에서 재사용
 * mockAssetIndex: 실사 URL, AssetHub 교체 시 해당 객체만 교체
 */

import { useMemo } from 'react';
import { compile, buildTimeline } from '@/app/lib/engine/play';
import { mockAssetIndex } from '@/app/lib/engine/play/mockAssetIndex';
import { PLAY_RULES } from '@/app/lib/constants/rules';
import { RuntimePlayer } from '@/app/components/runtime/RuntimePlayer';
import type { PlayTimeline } from '@/app/lib/engine/play/types';

const TICK_MS = PLAY_RULES.TICK_MS;

/** BINARY / REVEAL_WIPE / DROP 테스트용 Draft */
const DEFAULT_DRAFT = {
  blocks: [
    {
      motionId: 'say_hi',
      set1: { operator: { type: 'BINARY' as const } },
      set2: { operator: { type: 'PROGRESSIVE' as const, style: 'wipe' as const } },
    },
    {
      motionId: 'walk',
      set1: { operator: { type: 'BINARY' as const } },
      set2: { operator: { type: 'BINARY' as const } },
    },
    {
      motionId: 'throw',
      set1: { operator: { type: 'DROP' as const } },
      set2: { operator: { type: 'DROP' as const } },
    },
    {
      motionId: 'clap',
      set1: { operator: { type: 'BINARY' as const } },
      set2: { operator: { type: 'BINARY' as const } },
    },
    {
      motionId: 'punch',
      set1: { operator: { type: 'BINARY' as const } },
      set2: { operator: { type: 'BINARY' as const } },
    },
  ],
};

export interface PlayTestContentProps {
  /** 디버그 오버레이 표시 여부 */
  debug?: boolean;
  seed?: number;
  className?: string;
}

export function PlayTestContent({ debug = true, seed = 12345, className = '' }: PlayTestContentProps) {
  const timeline: PlayTimeline = useMemo(() => {
    const resolved = compile({
      draft: DEFAULT_DRAFT,
      assetIndex: mockAssetIndex,
      seed,
      policy: 'presets',
    });
    return buildTimeline(resolved);
  }, [seed]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold">PLAY v1 Engine Test</h2>
            <p className="text-sm text-neutral-400">
              totalTicks={timeline.totalTicks} / tickMs={TICK_MS}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-neutral-900 p-3 ring-1 ring-neutral-800">
        <RuntimePlayer
          timeline={timeline}
          debug={debug}
          onAudioEvent={(e) => {
            console.log('[AUDIO]', e.kind, 'tick', e.tick);
          }}
        />
      </div>

      {debug && (
        <div className="rounded-xl bg-neutral-900 p-4 ring-1 ring-neutral-800">
          <p className="mb-2 text-sm font-bold">검증 포인트</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-400">
            <li>PROGRESSIVE(wipe): action 1tick + rest 1tick 교대인지</li>
            <li>DROP: drop 1tick + rest 1tick 교대인지</li>
            <li>BINARY: ON/OFF 페어가 ABAB로 안정적인지 (첫 tick=ON)</li>
            <li>SFX는 action tick에서만 발생하는지</li>
          </ul>
        </div>
      )}
    </div>
  );
}
