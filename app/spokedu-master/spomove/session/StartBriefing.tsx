'use client';

import { Play } from 'lucide-react';

import {
  SPOMOVE_CUE_SPEED_OPTIONS,
  getCueSpeedGuide,
  recommendedCueSecondsForPreset,
  supportsCueSpeedOverride,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { getSpomovePresetDisplayModel } from '../spomovePresetDisplayModel';
import { resolveSessionConfiguration } from '../movements/movementResolve';
import type { ResolvedMovementConfiguration } from '../movements/movementTypes';

export function StartBriefing({
  preset,
  movementSummaryLine,
  difficultySummaryLine,
  operationSummaryLine,
  cueSeconds,
  onCueSecondsChange,
  resolvedMovement,
  cueFloorNotice,
  startDisabled,
  onStart,
}: {
  preset: OfficialSpomovePreset;
  /** null이면 움직임 행 숨김 (DIVE) */
  movementSummaryLine: string | null;
  difficultySummaryLine: string | null;
  /** Operation Layer 한 줄 (legacyDisabled면 null) */
  operationSummaryLine?: string | null;
  cueSeconds: SpomoveCueSpeedSec;
  onCueSecondsChange: (value: SpomoveCueSpeedSec) => void;
  resolvedMovement: ResolvedMovementConfiguration | null;
  cueFloorNotice?: string | null;
  startDisabled: boolean;
  onStart: () => void;
}) {
  const display = getSpomovePresetDisplayModel(preset);
  const showCueSpeed = supportsCueSpeedOverride(preset);
  const recommendedSec = recommendedCueSecondsForPreset(preset);
  const minCue = resolvedMovement
    ? resolveSessionConfiguration({ movement: resolvedMovement, cueSeconds: 1 }).minimumCueSeconds
    : 1;

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
        <p className="text-[12px] font-black tracking-[0.08em] text-white/55">현재 설정</p>
        {movementSummaryLine ? (
          <p className="mt-2 text-[18px] font-black text-white">{movementSummaryLine}</p>
        ) : null}
        {operationSummaryLine ? (
          <p className={`text-[14px] font-bold text-white/70 ${movementSummaryLine ? 'mt-1' : 'mt-2'}`}>
            {operationSummaryLine}
          </p>
        ) : null}
        {difficultySummaryLine ? (
          <p className={`text-[14px] font-bold text-white/65 ${movementSummaryLine || operationSummaryLine ? 'mt-1' : 'mt-2'}`}>
            {difficultySummaryLine}
          </p>
        ) : null}
        {!movementSummaryLine && !difficultySummaryLine && !operationSummaryLine ? (
          <p className="mt-2 text-[14px] font-semibold text-white/55">실행 조건을 확인한 뒤 시작하세요.</p>
        ) : null}
      </div>

      {showCueSpeed ? (
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_12%,transparent)] p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-black tracking-[0.08em] text-white/55">자극 속도</p>
              <p className="mt-1 text-[13px] font-semibold text-white/50">신호가 바뀌는 간격</p>
            </div>
            <p className="text-[34px] font-black leading-none tracking-tight text-white tabular-nums">
              {cueSeconds}
              <span className="ml-1 text-[16px] font-black text-white/55">초</span>
            </p>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {SPOMOVE_CUE_SPEED_OPTIONS.map((sec) => {
              const active = cueSeconds === sec;
              const recommended = sec === recommendedSec;
              const disabled = sec < minCue;
              return (
                <button
                  key={sec}
                  type="button"
                  disabled={disabled}
                  onClick={() => onCueSecondsChange(sec)}
                  title={
                    disabled
                      ? `${resolvedMovement?.displayLabel ?? '이 동작'}은 ${minCue}초 이상`
                      : `${sec}초 · ${getCueSpeedGuide(sec).tempoLabel}`
                  }
                  className={`relative inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-black transition ${
                    disabled
                      ? 'cursor-not-allowed border border-white/5 bg-black/20 text-white/25'
                      : active
                        ? 'bg-[var(--spm-acc)] text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)]'
                        : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35 hover:text-white'
                  }`}
                >
                  {sec}
                  {recommended && !disabled ? (
                    <span
                      className={`absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                        active ? 'bg-white' : 'bg-[var(--spm-acc)]'
                      }`}
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          {cueFloorNotice ? (
            <p className="mt-3 text-[12px] font-bold leading-5 text-amber-200/90">{cueFloorNotice}</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[22px] border border-white/10 bg-black/25 px-4 py-4">
          <p className="text-[12px] font-black tracking-[0.08em] text-white/45">진행 방식</p>
          <p className="mt-1 text-sm font-bold text-white/75">
            {display.durationLabel}
            <span className="mx-2 text-white/25">·</span>
            {preset.rounds}회
          </p>
          <p className="mt-2 text-[13px] font-semibold text-white/50">이 활동의 기본 진행 방식</p>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={startDisabled}
        className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-white text-[16px] font-black text-black shadow-[0_18px_55px_rgba(255,255,255,0.18)] transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-5 w-5 fill-black" />
        {startDisabled ? '불러오는 중…' : '수업 시작'}
      </button>
    </div>
  );
}
