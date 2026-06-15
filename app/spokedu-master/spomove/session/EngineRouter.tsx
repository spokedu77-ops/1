'use client';

import { lazy, Suspense, useCallback } from 'react';
import type { ReactTrainCompleteStats } from '@/app/admin/spomove/training/_player/components/VisualReactionTraining';
import type { OfficialSpomoveEngineMode } from '../officialSpomovePresets';

const VisualReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/VisualReactionTraining').then((module) => ({
    default: module.VisualReactionTraining,
  })),
);

const MemoryGame = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/MemoryGame').then((module) => ({
    default: module.MemoryGame,
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

export function EngineRouter({ mode, level, durationSec, speedSec, rounds, soundEnabled = true, onComplete, onExit }: Props) {
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
    const safeLevel = mode === 'basic' ? Math.min(Math.max(level, 1), 4) : Math.max(level, 1);
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
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <VisualReactionTraining
          variant="flow"
          durationSec={durationSec ?? 60 + level * 15}
          speedSec={speedSec ?? Math.max(0.4, 1.4 - level * 0.12)}
          onExit={onExit}
          onComplete={handleReactTrainComplete}
        />
      </Suspense>
    );
  }

  if (mode === 'spatial') {
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <MemoryGame
          level={Math.min(level, 3)}
          onExit={onExit}
          onComplete={handleMemoryComplete}
          audioMode="beep"
          speedSec={speedSec ?? 1.2}
        />
      </Suspense>
    );
  }

  return null;
}
