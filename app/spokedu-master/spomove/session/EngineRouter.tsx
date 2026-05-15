'use client';

import { Suspense, lazy, useCallback } from 'react';
import type { ReactTrainCompleteStats } from '@/app/admin/spomove/training/_player/components/VisualReactionTraining';

const VisualReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/VisualReactionTraining').then((m) => ({
    default: m.VisualReactionTraining,
  }))
);

const DiagonalReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/DiagonalReactionTraining').then((m) => ({
    default: m.DiagonalReactionTraining,
  }))
);

const MemoryGame = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/MemoryGame').then((m) => ({
    default: m.MemoryGame,
  }))
);

export type EngineCompletePayload = {
  engineMode: string;
  engineLevel: number;
  stims?: number;
  maxCombo?: number;
  durationMs?: number;
};

type Props = {
  mode: string;
  level: number;
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

function resolveVariant(level: number): 'flow' | 'flash' | 'pattern' {
  if (level <= 3) return 'flow';
  if (level <= 5) return 'flash';
  return 'pattern';
}

export function EngineRouter({ mode, level, onComplete, onExit }: Props) {
  const handleReactTrainComplete = useCallback(
    (stats: ReactTrainCompleteStats) => {
      onComplete({ engineMode: mode, engineLevel: level, stims: stats.stims, maxCombo: stats.maxCombo });
    },
    [mode, level, onComplete]
  );

  const handleDiagonalComplete = useCallback(
    (stats: ReactTrainCompleteStats) => {
      onComplete({ engineMode: mode, engineLevel: level, stims: stats.stims, maxCombo: stats.maxCombo });
    },
    [mode, level, onComplete]
  );

  const handleMemoryComplete = useCallback(() => {
    onComplete({ engineMode: mode, engineLevel: level });
  }, [mode, level, onComplete]);

  if (mode === 'reactTrain' || mode === 'flow' || mode === 'flash' || mode === 'pattern') {
    const variant = mode === 'reactTrain' ? resolveVariant(level) : (mode as 'flow' | 'flash' | 'pattern');
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <VisualReactionTraining
          variant={variant}
          durationSec={60 + level * 15}
          speedSec={Math.max(0.4, 1.4 - level * 0.12)}
          onExit={onExit}
          onComplete={handleReactTrainComplete}
        />
      </Suspense>
    );
  }

  if (mode === 'diagonal') {
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <DiagonalReactionTraining
          durationSec={60 + level * 10}
          speedLevel={Math.min(level, 5)}
          speedSec={Math.max(0.8, 5.6 - Math.min(level, 5) * 0.8)}
          onExit={onExit}
          onComplete={handleDiagonalComplete}
        />
      </Suspense>
    );
  }

  if (mode === 'memory' || mode === 'spatial') {
    return (
      <Suspense fallback={<LoadingOverlay />}>
        <MemoryGame
          level={Math.min(level, 3)}
          onExit={onExit}
          onComplete={handleMemoryComplete}
          audioMode="beep"
          speedSec={1.2}
        />
      </Suspense>
    );
  }

  // 미지원 모드: 즉시 완료 처리
  onComplete({ engineMode: mode, engineLevel: level });
  return null;
}
