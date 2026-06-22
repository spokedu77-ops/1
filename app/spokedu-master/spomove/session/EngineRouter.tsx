'use client';

import { lazy, Suspense, useCallback } from 'react';
import type { ReactTrainCompleteStats } from '@/app/admin/spomove/training/_player/components/VisualReactionTraining';
import type { SpomoveColorThemeId } from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';
import type { OfficialSpomoveEngineMode } from '../officialSpomovePresets';

const VisualReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/VisualReactionTraining').then((module) => ({
    default: module.VisualReactionTraining,
  })),
);

const DiagonalReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/DiagonalReactionTraining').then((m) => ({
    default: m.DiagonalReactionTraining,
  })),
);

const DeepReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/DeepReactionTraining').then((m) => ({
    default: m.DeepReactionTraining,
  })),
);

const PulseReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/PulseReactionTraining').then((m) => ({
    default: m.PulseReactionTraining,
  })),
);

const BlackoutReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/BlackoutReactionTraining').then((m) => ({
    default: m.BlackoutReactionTraining,
  })),
);

const SweepReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/SweepReactionTraining').then((m) => ({
    default: m.SweepReactionTraining,
  })),
);

const RushReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/RushReactionTraining').then((m) => ({
    default: m.RushReactionTraining,
  })),
);

const RobloxMoleReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/RobloxMoleReactionTraining').then((m) => ({
    default: m.RobloxMoleReactionTraining,
  })),
);

const MemoryGame = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/MemoryGame').then((module) => ({
    default: module.MemoryGame,
  })),
);

const MemoryGameLevel4 = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/MemoryGameLevel4').then((m) => ({
    default: m.MemoryGameLevel4,
  })),
);

const MemoryGameLevel5 = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/MemoryGameLevel5').then((m) => ({
    default: m.MemoryGameLevel5,
  })),
);

const MemoryGameApp = lazy(() => import('@/app/admin/spomove/training/_player/MemoryGameApp'));

export type EngineCompletePayload = {
  engineMode: OfficialSpomoveEngineMode;
  engineLevel: number;
  stims?: number;
  maxCombo?: number;
  durationMs?: number;
};

type Props = {
  mode: OfficialSpomoveEngineMode;
  level: number;
  durationSec?: number;
  speedSec?: number;
  rounds?: number;
  soundEnabled?: boolean;
  variantColorTheme?: string;
  reactTrainConcurrent?: 1 | 2 | 3;
  flowFeatures?: string[];
  flowDuration?: number;
  onComplete: (payload: EngineCompletePayload) => void;
  onExit: () => void;
};

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function mapReactSpeedLevel(speedSec: number): number {
  const s = Math.max(2, Math.min(6, speedSec));
  if (s >= 5.2) return 1;
  if (s >= 4.5) return 2;
  if (s >= 3.8) return 3;
  if (s >= 3.2) return 4;
  if (s >= 2.7) return 5;
  if (s >= 2.3) return 6;
  return 7;
}

export function EngineRouter({
  mode,
  level,
  durationSec,
  speedSec,
  rounds,
  soundEnabled = true,
  variantColorTheme,
  reactTrainConcurrent,
  flowFeatures,
  flowDuration,
  onComplete,
  onExit,
}: Props) {
  const handleReactTrainComplete = useCallback(
    (stats: ReactTrainCompleteStats) => {
      onComplete({ engineMode: mode, engineLevel: level, stims: stats.stims, maxCombo: stats.maxCombo });
    },
    [level, mode, onComplete],
  );

  const handleMemoryComplete = useCallback(() => {
    onComplete({ engineMode: mode, engineLevel: level });
  }, [level, mode, onComplete]);

  if (mode === 'basic' || mode === 'simon' || mode === 'flanker' || mode === 'stroop') {
    const safeLevel = mode === 'basic' ? Math.min(Math.max(level, 1), 5) : Math.max(level, 1);
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <MemoryGameApp
          initialMode={mode}
          initialLevel={safeLevel}
          autoLaunch={{
            speed: speedSec ?? 3,
            timeMode: 'reps',
            targetReps: rounds ?? 20,
            warmup: 3,
            audioMode: soundEnabled ? 'beep' : 'off',
            variantColorTheme: variantColorTheme as SpomoveColorThemeId | undefined,
          }}
          embed
          disableBgm
          onExit={onExit}
          onComplete={handleMemoryComplete}
        />
      </Suspense>
    );
  }

  if (mode === 'reactTrain') {
    const reactSpeedLevel = mapReactSpeedLevel(speedSec ?? 3);
    const dur = durationSec ?? 75;
    const sp = speedSec ?? 3;

    if (level === 1) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <VisualReactionTraining
            variant="flow"
            concurrent={reactTrainConcurrent ?? 1}
            durationSec={dur}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 2) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <VisualReactionTraining
            variant="flash"
            durationSec={dur}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 3) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <DiagonalReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 4) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <DeepReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 5) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <PulseReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 6) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <BlackoutReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 7) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <SweepReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 8) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <RushReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    // level 9+
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <RobloxMoleReactionTraining
          durationSec={dur}
          speedLevel={reactSpeedLevel}
          speedSec={sp}
          onExit={onExit}
          onComplete={handleReactTrainComplete}
        />
      </Suspense>
    );
  }

  if (mode === 'spatial') {
    const safeLevel = Math.min(Math.max(level, 1), 5);
    if (safeLevel === 5) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <MemoryGameLevel5
            onExit={onExit}
            onComplete={handleMemoryComplete}
            audioMode="beep"
            speedSec={speedSec ?? 1.2}
            startDelayMs={0}
          />
        </Suspense>
      );
    }
    if (safeLevel === 4) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <MemoryGameLevel4
            onExit={onExit}
            onComplete={handleMemoryComplete}
            audioMode="beep"
            speedSec={speedSec ?? 1.2}
            startDelayMs={0}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <MemoryGame
          level={safeLevel}
          onExit={onExit}
          onComplete={handleMemoryComplete}
          audioMode="beep"
          speedSec={speedSec ?? 1.2}
        />
      </Suspense>
    );
  }

  if (mode === 'flow') {
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <MemoryGameApp
          initialMode="flow"
          autoLaunch={{
            speed: speedSec ?? 3,
            timeMode: 'time',
            duration: 60,
            warmup: 3,
            audioMode: soundEnabled ? 'beep' : 'off',
            flowFeatures: flowFeatures ?? [],
            flowDuration: flowDuration ?? 25,
          }}
          embed
          onExit={onExit}
          onComplete={handleMemoryComplete}
        />
      </Suspense>
    );
  }

  return null;
}
