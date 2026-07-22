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
import { resolveReactTrainUiLevel } from '@/app/admin/spomove/training/_player/constants';
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

const GoalkeeperReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/GoalkeeperReactionTraining').then((m) => ({
    default: m.GoalkeeperReactionTraining,
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
  bodyLabelMode?: 'easy' | 'hard';
  hideBodyLabelModeControls?: boolean;
  spatialArrowColorMode?: 'basic' | 'color';
  spatialArrowColorMapping?: 'random' | 'compass';
  reactTrainConcurrent?: 1 | 2 | 3;
  moleLookMode?: 'classic' | 'variant';
  numberCartTier?: 1 | 2 | 3;
  colorTrackerTier?: 1 | 2 | 3;
  goalkeeperTier?: 1 | 2;
  colorTrackerDualPanel?: boolean;
  camouflagePlacement?: 'center' | 'variant';
  flowFeatures?: string[];
  flowDuration?: number;
  flowLayout?: 'sequential' | 'random';
  flowIncludeBonus?: boolean;
  flankerStimulusType?: 'color' | 'number';
  onComplete: (payload: EngineCompletePayload) => void;
  onExit: () => void;
};

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex h-dvh max-h-dvh items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--spm-acc)] border-t-transparent" />
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
  bodyLabelMode,
  hideBodyLabelModeControls,
  spatialArrowColorMode,
  spatialArrowColorMapping,
  reactTrainConcurrent,
  moleLookMode,
  numberCartTier,
  colorTrackerTier,
  goalkeeperTier,
  colorTrackerDualPanel,
  camouflagePlacement,
  flowFeatures,
  flowDuration,
  flowLayout,
  flowIncludeBonus,
  flankerStimulusType,
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
    const safeLevel = mode === 'basic' ? Math.min(Math.max(level, 1), 10) : Math.max(level, 1);
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
            bodyLabelMode,
            hideBodyLabelModeControls,
            spatialArrowColorMode,
            spatialArrowColorMapping,
            flankerStimulusType,
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
    const resolved = resolveReactTrainUiLevel(level);
    const engineLevel = resolved.engineLevel;
    const reactSpeedLevel = mapReactSpeedLevel(speedSec ?? 3);
    const dur = durationSec ?? (rounds ?? 20) * (speedSec ?? 3);
    const sp = speedSec ?? 3;
    const effectiveMoleLook = moleLookMode ?? resolved.moleLookMode ?? 'classic';
    const effectiveCamouflage = camouflagePlacement ?? resolved.camouflagePlacement ?? 'center';
    const effectiveNumberCartTier = numberCartTier ?? resolved.numberCartTier ?? 2;
    const effectiveColorTrackerTier = colorTrackerTier ?? resolved.colorTrackerTier ?? 2;
    const effectiveGoalkeeperTier: 1 | 2 = goalkeeperTier === 1 ? 1 : 2;

    if (engineLevel === 1) {
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
    if (engineLevel === 2) {
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
    if (engineLevel === 3) {
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
    if (engineLevel === 4) {
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
    if (engineLevel === 5) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <CamouflageReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            placementMode={effectiveCamouflage}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (engineLevel === 6) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <RobloxMoleReactionTraining
            durationSec={dur}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            lookMode={effectiveMoleLook}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (engineLevel === 7) {
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
    if (engineLevel === 8) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <NumberCartReactionTraining
            targetRounds={normalizeNumberCartRounds(rounds ?? 5)}
            speedLevel={reactSpeedLevel}
            speedSec={sp}
            tier={effectiveNumberCartTier}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (engineLevel === 9) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <ColorTrackerReactionTraining
            targetRounds={normalizeColorTrackerRounds(rounds ?? 20)}
            tier={effectiveColorTrackerTier}
            dualPanel={colorTrackerDualPanel ?? false}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    if (engineLevel === 10) {
      return (
        <Suspense fallback={<LoadingOverlay />}>
          <GoalkeeperReactionTraining
            durationSec={Math.max(dur, 120)}
            speedSec={sp}
            goalkeeperTier={effectiveGoalkeeperTier}
            onExit={onExit}
            onComplete={handleReactTrainComplete}
          />
        </Suspense>
      );
    }
    // 알 수 없는 reactTrain level → FLOW(2) 폴백
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <VisualReactionTraining
          variant="flow"
          concurrent={1}
          durationSec={dur}
          speedSec={sp}
          onExit={onExit}
          onComplete={handleReactTrainComplete}
        />
      </Suspense>
    );
  }

  if (mode === 'spatial') {
    const safeLevel = Math.min(Math.max(level, 1), 6);
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
          onComplete={handleSpatialComplete}
          audioMode="beep"
          speedSec={speedSec ?? 1.2}
        />
      </Suspense>
    );
  }

  if (mode === 'flow') {
    const resolvedFlowFeatures =
      level === 2 && !(flowFeatures ?? []).includes('colorGate')
        ? [...(flowFeatures ?? []), 'colorGate']
        : flowFeatures ?? [];

    return (
      <Suspense fallback={<LoadingOverlay />}>
        <MemoryGameApp
          initialMode="flow"
          initialLevel={level}
          autoLaunch={{
            speed: speedSec ?? 3,
            timeMode: 'time',
            duration: 60,
            warmup: 3,
            audioMode: soundEnabled ? 'beep' : 'off',
            flowFeatures: resolvedFlowFeatures,
            flowDuration: flowDuration ?? 25,
            flowLayout: flowLayout ?? 'sequential',
            flowIncludeBonus: flowIncludeBonus ?? true,
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
