'use client';

import { lazy, Suspense, useCallback, useEffect } from 'react';
import type { ReactTrainCompleteStats } from '@/app/admin/spomove/training/_player/components/VisualReactionTraining';

const VisualReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/VisualReactionTraining').then((module) => ({
    default: module.VisualReactionTraining,
  })),
);

const DiagonalReactionTraining = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/DiagonalReactionTraining').then((module) => ({
    default: module.DiagonalReactionTraining,
  })),
);

const MemoryGame = lazy(() =>
  import('@/app/admin/spomove/training/_player/components/MemoryGame').then((module) => ({
    default: module.MemoryGame,
  })),
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
    [level, mode, onComplete],
  );

  const handleDiagonalComplete = useCallback(
    (stats: ReactTrainCompleteStats) => {
      onComplete({ engineMode: mode, engineLevel: level, stims: stats.stims, maxCombo: stats.maxCombo });
    },
    [level, mode, onComplete],
  );

  const handleMemoryComplete = useCallback(() => {
    onComplete({ engineMode: mode, engineLevel: level });
  }, [level, mode, onComplete]);

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

  return <UnknownModeHandler mode={mode} onExit={onExit} />;
}

function UnknownModeHandler({ mode, onExit }: Pick<Props, 'mode' | 'onExit'>) {
  useEffect(() => {
    onExit();
  }, [onExit]);

  return <div className="fixed inset-0 flex items-center justify-center bg-black text-[13px] font-semibold text-white/40">지원하지 않는 훈련 모드: {mode}</div>;
}
