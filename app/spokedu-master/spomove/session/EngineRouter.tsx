'use client';

import { lazy, Suspense, useCallback } from 'react';
import type { ReactTrainCompleteStats } from '@/app/admin/spomove/training/_player/components/VisualReactionTraining';
import {
  laneCountToColorStimulusCounts,
  type ColorStimulusCounts,
  type TrainingSessionResult,
} from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import { normalizeColorTrackerRounds } from '@/app/admin/spomove/training/_player/components/ColorTrackerReactionTraining';
import { normalizeNumberCartRounds } from '@/app/admin/spomove/training/_player/components/NumberCartReactionTraining';
import type { SpomoveColorThemeId } from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';
import type { OfficialSpomoveEngineMode } from '../officialSpomovePresets';

const VisualReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/VisualReactionTraining').then((module) => ({
    default: module.VisualReactionTraining,
  })),
);

const BeatWaveReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/BeatWaveReactionTraining').then((m) => ({
    default: m.BeatWaveReactionTraining,
  })),
);

const CamouflageReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/CamouflageReactionTraining').then((m) => ({
    default: m.CamouflageReactionTraining,
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

const WormholeReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/WormholeReactionTraining').then((m) => ({
    default: m.WormholeReactionTraining,
  })),
);

const NumberCartReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/NumberCartReactionTraining').then((m) => ({
    default: m.NumberCartReactionTraining,
  })),
);

const ColorTrackerReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/ColorTrackerReactionTraining').then((m) => ({
    default: m.ColorTrackerReactionTraining,
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
  elapsedMs?: number;
  colorCounts?: ColorStimulusCounts | null;
  stims?: number;
  maxCombo?: number;
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
  moleDualPanel?: boolean;
  numberCartTier?: 1 | 2 | 3;
  colorTrackerTier?: 1 | 2 | 3;
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
  moleDualPanel,
  numberCartTier,
  colorTrackerTier,
  flowFeatures,
  flowDuration,
  onComplete,
  onExit,
}: Props) {
  const handleReactTrainComplete = useCallback(
    (stats: ReactTrainCompleteStats) => {
      onComplete({
        engineMode: mode,
        engineLevel: level,
        stims: stats.stims,
        maxCombo: stats.maxCombo,
        colorCounts: laneCountToColorStimulusCounts(stats.laneCount),
      });
    },
    [level, mode, onComplete],
  );

  const handleMemoryComplete = useCallback(
    (result: TrainingSessionResult) => {
      onComplete({
        engineMode: mode,
        engineLevel: level,
        elapsedMs: result.elapsedMs,
        colorCounts: result.colorCounts,
      });
    },
    [level, mode, onComplete],
  );

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
    const dur = durationSec ?? (rounds ?? 20) * (speedSec ?? 3);
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
          <BeatWaveReactionTraining
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
          <CamouflageReactionTraining
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
    if (level === 6) {
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
    if (level === 7) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <RobloxMoleReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            dualPanel={moleDualPanel ?? false}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 8) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <WormholeReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (level === 9) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <NumberCartReactionTraining
            targetRounds={normalizeNumberCartRounds(rounds ?? 5)}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            tier={numberCartTier ?? 2}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    // level 10+
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <ColorTrackerReactionTraining
          targetRounds={normalizeColorTrackerRounds(rounds ?? 20)}
          tier={colorTrackerTier ?? 2}
          onExit={onExit}
          onComplete={handleReactTrainComplete}
        />
      </Suspense>
    );
  }

  if (mode === 'spatial') {
    const safeLevel = Math.min(Math.max(level, 1), 5);
    const handleSpatialComplete = () => {
      onComplete({ engineMode: mode, engineLevel: level, colorCounts: null });
    };
    if (safeLevel === 5) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <MemoryGameLevel5
            onExit={onExit}
            onComplete={handleSpatialComplete}
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
            onComplete={handleSpatialComplete}
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
