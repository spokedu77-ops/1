'use client';

import { Maximize, Play, Volume2, VolumeX } from 'lucide-react';

import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import type { SpomoveCueSpeedSec } from '../spomoveCueSpeed';
import { SpomovePadLayoutView } from '../SpomovePadLayoutView';
import { getSpomovePadLayoutVariant } from '../spomovePadLayout';

/** entry=start — values are confirmed here, never edited. The button supplies browser activation. */
export function StartBriefing({
  preset,
  cueSeconds,
  difficultyLabel,
  matCount,
  movementSummary,
  mode,
  soundEnabled,
  canChangeSettings,
  startDisabled,
  onSettings,
  onStart,
}: {
  preset: OfficialSpomovePreset;
  cueSeconds: SpomoveCueSpeedSec;
  difficultyLabel?: string | null;
  matCount: number;
  movementSummary?: string | null;
  mode: 'projector' | 'mobile';
  soundEnabled: boolean;
  canChangeSettings: boolean;
  startDisabled: boolean;
  onSettings: () => void;
  onStart: () => void;
}) {
  const summary = [`SPOMAT ${matCount}장`, `자극 ${cueSeconds}초`, difficultyLabel, movementSummary]
    .filter(Boolean)
    .join(' · ');
  const status = [
    mode === 'projector' ? '전체화면 준비' : null,
    soundEnabled ? '소리 사용' : '소리 끔',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-5" data-spm-session-ready-screen="true">
      <SpomovePadLayoutView variant={getSpomovePadLayoutVariant(preset)} compact dark flush />

      <p className="text-center text-[14px] font-medium leading-6 text-white/80">{summary}</p>
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] font-medium text-white/55" aria-label="실행 준비 상태">
        {mode === 'projector' ? <span className="inline-flex items-center gap-1.5"><Maximize className="h-4 w-4" /> 전체화면 준비</span> : null}
        <span className="inline-flex items-center gap-1.5">{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {soundEnabled ? '소리 사용' : '소리 끔'}</span>
        <span className="sr-only">{status}</span>
      </p>

      <button
        type="button"
        onClick={onStart}
        disabled={startDisabled}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-slate-950 transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4 fill-current" />
        {startDisabled ? '불러오는 중…' : '실행 시작'}
      </button>
      {canChangeSettings ? (
        <button
          type="button"
          onClick={onSettings}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl text-[13px] font-medium text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          설정 변경
        </button>
      ) : null}
    </div>
  );
}
