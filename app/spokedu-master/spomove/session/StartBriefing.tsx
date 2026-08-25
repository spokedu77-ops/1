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
  return (
    <div className="space-y-4" data-spm-session-ready-screen="true">
      <SpomovePadLayoutView variant={getSpomovePadLayoutVariant(preset)} compact dark />

      <section className="rounded-[18px] border border-white/10 bg-black/25 p-4">
        <p className="text-[12px] font-black tracking-[0.08em] text-white/45">현재 실행값</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[`SPOMAT ${matCount}장`, `자극 ${cueSeconds}초`, difficultyLabel, movementSummary]
            .filter(Boolean)
            .slice(0, 3)
            .map((value) => (
              <span key={value} className="rounded-xl bg-white/[0.07] px-3 py-2.5 text-center text-[13px] font-black text-white/85">
                {value}
              </span>
            ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[13px] font-bold text-white/60" aria-label="실행 준비 상태">
        {mode === 'projector' ? <span className="inline-flex items-center gap-1.5"><Maximize className="h-4 w-4" /> 전체화면 준비</span> : null}
        <span className="inline-flex items-center gap-1.5">{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} 소리 {soundEnabled ? '사용' : '끔'}</span>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={startDisabled}
        className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-white text-[17px] font-black text-black shadow-[0_18px_55px_rgba(255,255,255,0.18)] transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-5 w-5 fill-black" />
        {startDisabled ? '불러오는 중…' : '실행 시작'}
      </button>
      {canChangeSettings ? (
        <button type="button" onClick={onSettings} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl text-[13px] font-bold text-white/60 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          설정 변경
        </button>
      ) : null}
    </div>
  );
}
