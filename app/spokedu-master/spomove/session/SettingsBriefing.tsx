'use client';

import { Play } from 'lucide-react';
import { useMemo } from 'react';

import type { ActivityFamilyDefinition } from '../movements/movementTypes';
import {
  SPOMOVE_CUE_SPEED_OPTIONS,
  getCueSpeedGuide,
  supportsCueSpeedOverride,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import {
  getSpomoveDifficultyOptions,
  type SpomoveDifficultyKind,
} from '../spomoveDifficulty';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { resolveRequiredMatGuidance } from '../operations/operationConstraints';
import type { ActivityOperationConfig } from '../operations/operationTypes';
import { SpomovePadLayoutView } from '../SpomovePadLayoutView';
import { getSpomovePadLayoutVariant } from '../spomovePadLayout';

/**
 * 일반 Session Settings — 완성된 Preset 대표값 고정 + 자극 속도·난이도만 조절.
 * 움직임/5축 Operation 조립 UI 없음 (Class Set·Variant 영역).
 */
export function SettingsBriefing({
  preset,
  startDisabled,
  cueSeconds,
  onCueSecondsChange,
  difficultyKind,
  difficultyValue,
  onDifficultyChange,
  onStart,
  movementFamily,
  cueFloorNotice,
  operationConfig,
}: {
  preset: OfficialSpomovePreset;
  startDisabled: boolean;
  cueSeconds: SpomoveCueSpeedSec;
  onCueSecondsChange: (value: SpomoveCueSpeedSec) => void;
  difficultyKind: SpomoveDifficultyKind | null;
  difficultyValue: string;
  onDifficultyChange: (value: string) => void;
  onStart: () => void;
  movementFamily?: ActivityFamilyDefinition | null;
  cueFloorNotice?: string | null;
  operationConfig?: ActivityOperationConfig | null;
}) {
  const showCueSpeed = supportsCueSpeedOverride(preset);
  const difficultyOptions = difficultyKind ? getSpomoveDifficultyOptions(difficultyKind) : [];

  const intervalLine =
    operationConfig?.timing.pattern === 'interval'
      ? `${operationConfig.timing.workSeconds}초 운동 · ${operationConfig.timing.restSeconds}초 휴식 · ${operationConfig.timing.sets}세트`
      : null;

  const prepLine = useMemo(() => {
    const mats = movementFamily
      ? resolveRequiredMatGuidance({
          minMats: movementFamily.matRequirement.minMats,
          participantScale: operationConfig?.participantScale ?? 'individual',
        }).recommended
      : 1;
    const timingLabel =
      operationConfig?.timing.pattern === 'responseWindow'
        ? '충분 반응'
        : operationConfig?.timing.pattern === 'interval'
          ? '인터벌'
          : operationConfig?.timing.pattern === 'continuous'
            ? '연속 반응'
            : null;
    const parts = [timingLabel, `매트 ${mats}장`].filter(Boolean);
    return parts.join(' · ');
  }, [movementFamily, operationConfig]);

  const padLayoutVariant = getSpomovePadLayoutVariant(preset);

  return (
    <div className="space-y-4">
      <SpomovePadLayoutView
        variant={padLayoutVariant}
        compact
        dark
        meta={intervalLine ? null : prepLine}
      />

      {intervalLine ? (
        <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
          <p className="text-[14px] font-bold text-white/85">{intervalLine}</p>
        </section>
      ) : null}

      {showCueSpeed ? (
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_12%,transparent)] p-4 sm:p-5">
          <p className="text-[12px] font-black tracking-[0.08em] text-white/55">자극 속도</p>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {SPOMOVE_CUE_SPEED_OPTIONS.map((sec) => {
              const active = cueSeconds === sec;
              const recommended = sec === 3;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onCueSecondsChange(sec)}
                  title={`${sec}초 · ${getCueSpeedGuide(sec).tempoLabel}`}
                  className={`relative inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-black transition ${
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

      {difficultyKind ? (
        <div className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
          <p className="text-[12px] font-black tracking-[0.08em] text-white/55">난이도</p>
          <div className="mt-3 flex gap-2">
            {difficultyOptions.map((opt) => {
              const active = difficultyValue === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onDifficultyChange(opt.value)}
                  className={`flex-1 rounded-xl px-2 py-3 text-center transition ${
                    active
                      ? 'bg-[var(--spm-acc)] text-white'
                      : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35'
                  }`}
                >
                  <span className="block text-[18px] font-black">{opt.label}</span>
                  <span className={`mt-1 block text-[10px] font-bold ${active ? 'text-white/80' : 'text-white/45'}`}>
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

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
