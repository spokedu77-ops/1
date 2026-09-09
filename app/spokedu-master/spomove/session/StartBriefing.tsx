'use client';

import { Play } from 'lucide-react';

import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import type { SpomoveCueSpeedSec } from '../spomoveCueSpeed';
import { SpomovePadLayoutView } from '../SpomovePadLayoutView';
import { getSpomovePadLayoutVariant } from '../spomovePadLayout';

/** entry=start — values are confirmed here, never edited. The button supplies browser activation. */
export function StartBriefing({
  preset,
  cueSeconds,
  matCount,
  canChangeSettings,
  startDisabled,
  onSettings,
  onStart,
}: {
  preset: OfficialSpomovePreset;
  cueSeconds: SpomoveCueSpeedSec;
  matCount: number;
  canChangeSettings: boolean;
  startDisabled: boolean;
  onSettings: () => void;
  onStart: () => void;
}) {
  const summary = `SPOMAT ${matCount}장 · 자극 ${cueSeconds}초`;

  return (
    <div className="space-y-5" data-spm-session-ready-screen="true">
      <section>
        <p className="text-sm font-semibold text-white">매트 배치</p>
        <div className="mt-2">
          <SpomovePadLayoutView variant={getSpomovePadLayoutVariant(preset)} compact dark flush />
        </div>
      </section>

      <div className="text-center">
        <p className="text-[11px] font-semibold tracking-wide text-white/45">현재 실행값</p>
        <p className="mt-1 text-[14px] font-medium leading-6 text-white/80">{summary}</p>
      </div>

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
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] text-[14px] font-semibold text-white/80 transition hover:border-white/35 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          설정 변경
        </button>
      ) : null}
    </div>
  );
}
