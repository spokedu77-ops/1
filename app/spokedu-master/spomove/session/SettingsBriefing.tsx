'use client';

import { Play } from 'lucide-react';

import {
  SPOMOVE_CUE_SPEED_OPTIONS,
  MOTION_GATE_CUE_SPEED_OPTIONS,
  getCueSpeedGuide,
  supportsCueSpeedOverride,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { SpomovePadLayoutView } from '../SpomovePadLayoutView';
import { getSpomovePadLayoutVariant } from '../spomovePadLayout';

/** Session Settings adjusts only values that can change this run. */
export function SettingsBriefing({
  preset,
  startDisabled,
  cueSeconds,
  recommendedCueSeconds,
  onCueSecondsChange,
  onStart,
  cueFloorNotice,
}: {
  preset: OfficialSpomovePreset;
  startDisabled: boolean;
  cueSeconds: SpomoveCueSpeedSec;
  recommendedCueSeconds: SpomoveCueSpeedSec;
  onCueSecondsChange: (value: SpomoveCueSpeedSec) => void;
  onStart: () => void;
  cueFloorNotice?: string | null;
}) {
  const showCueSpeed = supportsCueSpeedOverride(preset);
  const cueSpeedOptions = preset.id === 'dive-color-gate-61'
    ? MOTION_GATE_CUE_SPEED_OPTIONS
    : SPOMOVE_CUE_SPEED_OPTIONS;

  return (
    <div className="space-y-4 [@media(max-height:950px)]:space-y-3" data-spm-session-settings-screen="true">
      <section>
        <p className="text-sm font-semibold text-white">매트 배치</p>
        <div className="mt-2">
          <SpomovePadLayoutView variant={getSpomovePadLayoutVariant(preset)} compact dark flush />
        </div>
      </section>

      {showCueSpeed ? (
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_12%,transparent)] p-4 sm:p-5 [@media(max-height:950px)]:p-3">
          <p className="text-[12px] font-black tracking-[0.08em] text-white/55">자극 속도</p>
          {preset.engine.mode === 'spatial' && preset.engine.level === 7 ? (
            <p className="mt-1 text-[12px] font-semibold text-white/55">
              첫 그리드를 보여주는 시간입니다. 답 고르기는 3초 고정입니다.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {cueSpeedOptions.map((sec) => {
              const active = cueSeconds === sec;
              const recommended = sec === recommendedCueSeconds;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onCueSecondsChange(sec)}
                  title={`${sec}초 · ${getCueSpeedGuide(sec).tempoLabel}`}
                  className={`relative inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-black transition [@media(max-height:950px)]:h-10 ${
                    active
                      ? 'bg-[var(--spm-acc)] text-white'
                      : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35'
                  }`}
                >
                  {sec}
                  {recommended ? (
                    <span className="absolute -top-2 right-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-black text-[var(--spm-acc)] shadow-sm">
                      추천
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {cueFloorNotice ? (
            <p className="mt-3 text-[12px] font-bold leading-5 text-amber-200/90">{cueFloorNotice}</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onStart}
        disabled={startDisabled}
        className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-white text-[16px] font-black text-black shadow-[0_18px_55px_rgba(255,255,255,0.18)] transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 [@media(max-height:950px)]:h-12"
      >
        <Play className="h-5 w-5 fill-black" />
        {startDisabled ? '불러오는 중…' : '수업 시작'}
      </button>
    </div>
  );
}
