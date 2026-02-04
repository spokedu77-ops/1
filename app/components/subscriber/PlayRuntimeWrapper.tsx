'use client';

import { useMemo } from 'react';
import { compile, buildTimeline } from '@/app/lib/engine/play';
import { mockAssetIndex } from '@/app/lib/engine/play/mockAssetIndex';
import { RuntimePlayer } from '@/app/components/runtime/RuntimePlayer';
import type { PlayTimeline } from '@/app/lib/engine/play/types';

const DEFAULT_DRAFT = {
  blocks: [
    { motionId: 'say_hi', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'PROGRESSIVE' as const, style: 'wipe' as const } } },
    { motionId: 'walk', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
    { motionId: 'throw', set1: { operator: { type: 'DROP' as const } }, set2: { operator: { type: 'DROP' as const } } },
    { motionId: 'clap', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
    { motionId: 'punch', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
  ],
};

export interface PlayRuntimeWrapperProps {
  weekKey: string;
  onEnd: () => void;
}

export function PlayRuntimeWrapper({ weekKey, onEnd }: PlayRuntimeWrapperProps) {
  const seed = useMemo(() => weekKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0), [weekKey]);
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
    <div className="fixed inset-0 flex flex-col bg-black">
      <RuntimePlayer
        timeline={timeline}
        debug={false}
        onEnd={onEnd}
        autoPlay
      />
    </div>
  );
}
