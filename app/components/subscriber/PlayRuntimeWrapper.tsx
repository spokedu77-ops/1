'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compile, buildTimeline } from '@/app/lib/engine/play';
import { buildPlayAssetIndex } from '@/app/lib/engine/play/buildPlayAssetIndex';
import { RuntimePlayer } from '@/app/components/runtime/RuntimePlayer';
import type { PlayTimeline, AudioEvent } from '@/app/lib/engine/play/types';
import { parseWeekKey } from '@/app/lib/admin/scheduler/dragAndDrop';
import { usePlayAssetPack } from '@/app/lib/admin/hooks/usePlayAssetPack';
import { startBGM, stopBGM, playSFX, stopAllSFX } from '@/app/lib/admin/engines/think150/think150Audio';
import { PLAY_RULES } from '@/app/lib/constants/rules';

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

type PackStatus = 'loading' | 'empty' | 'error' | 'ready';

export function PlayRuntimeWrapper({ weekKey, onEnd }: PlayRuntimeWrapperProps) {
  const parsed = useMemo(() => parseWeekKey(weekKey), [weekKey]);
  const { state, loading, error, tableMissing, getImageUrl } = usePlayAssetPack(
    parsed?.year ?? 0,
    parsed?.month ?? 1,
    parsed?.week ?? 1
  );

  const packStatus: PackStatus = useMemo(() => {
    if (!parsed) return 'error';
    if (loading) return 'loading';
    if (error || tableMissing) return 'error';
    const assetIndex = buildPlayAssetIndex(state.images, getImageUrl, state.bgmPath);
    if (!assetIndex) return 'empty';
    return 'ready';
  }, [parsed, loading, error, tableMissing, state.images, state.bgmPath, getImageUrl]);

  const assetIndex = useMemo(() => buildPlayAssetIndex(state.images, getImageUrl, state.bgmPath), [state.images, state.bgmPath, getImageUrl]);
  const seed = useMemo(() => weekKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0), [weekKey]);

  const timeline: PlayTimeline | null = useMemo(() => {
    if (packStatus !== 'ready' || !assetIndex) return null;
    try {
      const resolved = compile({
        draft: DEFAULT_DRAFT,
        assetIndex,
        seed,
        policy: 'presets',
      });
      return buildTimeline(resolved);
    } catch {
      return null;
    }
  }, [packStatus, assetIndex, seed]);

  const totalMs = timeline ? (timeline.totalTicks - 1) * PLAY_RULES.TICK_MS : 0;
  useEffect(() => {
    return () => {
      stopBGM();
      stopAllSFX();
    };
  }, []);

  const onAudioEvent = useCallback(
    (ev: AudioEvent) => {
      if (ev.kind === 'BGM_START' && ev.path) {
        startBGM(ev.path, 0, Math.max(0, totalMs)).catch(() => {});
      } else if (ev.kind === 'BGM_STOP') {
        stopBGM();
      } else if (ev.kind === 'SFX' && ev.path) {
        playSFX(ev.path).catch(() => {});
      }
    },
    [totalMs]
  );

  if (!parsed) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
        <p className="text-sm">해당 주차 Play 에셋이 아직 준비되지 않았습니다.</p>
      </div>
    );
  }

  if (packStatus === 'loading') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
        <p className="text-sm">에셋 로딩 중…</p>
      </div>
    );
  }

  if (packStatus === 'empty') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
        <p className="text-sm">해당 주차 Play 에셋이 아직 준비되지 않았습니다.</p>
      </div>
    );
  }

  if (packStatus === 'error') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
        <p className="text-sm">에셋을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white">
        <p className="text-sm">해당 주차 Play 에셋이 아직 준비되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <RuntimePlayer
        timeline={timeline}
        debug={false}
        onEnd={onEnd}
        autoPlay
        onAudioEvent={onAudioEvent}
        snapToTick
      />
    </div>
  );
}
