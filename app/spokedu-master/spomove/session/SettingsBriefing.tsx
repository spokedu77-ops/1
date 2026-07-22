'use client';

import { Play } from 'lucide-react';
import { useMemo } from 'react';

import { BuiltInMovementNotice, FixedMovementSummary } from '../movements/MovementConfigurator';
import type { ActivityFamilyDefinition, MovementPick, MovementProfile } from '../movements/movementTypes';
import { compactMovementInstruction, getMovementPresentation } from '../movements/movementPresentation';
import {
  SPOMOVE_CUE_SPEED_OPTIONS,
  getCueSpeedGuide,
  recommendedCueSecondsForPreset,
  supportsCueSpeedOverride,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import {
  getSpomoveDifficultyOptions,
  type SpomoveDifficultyKind,
} from '../spomoveDifficulty';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { resolveSessionConfiguration } from '../movements/movementResolve';
import type { ResolvedMovementConfiguration } from '../movements/movementTypes';
import { resolveRequiredMatGuidance } from '../operations/operationConstraints';
import { operationSummaryLine } from '../operations/OperationConfigurator';
import type { ActivityOperationConfig } from '../operations/operationTypes';

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
  movement,
  movementPick,
  movementProfile,
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
  movement?: ResolvedMovementConfiguration | null;
  movementPick?: MovementPick | null;
  movementProfile?: MovementProfile | null;
  movementFamily?: ActivityFamilyDefinition | null;
  cueFloorNotice?: string | null;
  operationConfig?: ActivityOperationConfig | null;
}) {
  const showCueSpeed = supportsCueSpeedOverride(preset);
  const difficultyOptions = difficultyKind ? getSpomoveDifficultyOptions(difficultyKind) : [];
  const recommendedSec = recommendedCueSecondsForPreset(preset);
  const minCue = movement
    ? resolveSessionConfiguration({ movement, cueSeconds: 1 }).minimumCueSeconds
    : 1;

  const operationLine = operationConfig ? operationSummaryLine(operationConfig) : null;
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

  const movementLabel = movementPick ? getMovementPresentation(movementPick).label : null;
  const movementHint = movementPick ? compactMovementInstruction(movementPick) : null;

  return (
    <div className="space-y-4">
      {movementProfile?.selectionMode === 'disabled' ? (
        <BuiltInMovementNotice profile={movementProfile} />
      ) : null}

      {movementProfile?.selectionMode === 'fixed' && movementPick ? (
        <FixedMovementSummary variant="compact" value={movementPick} />
      ) : null}

      {movementProfile &&
      movementProfile.selectionMode === 'selectable' &&
      movementPick &&
      movementLabel ? (
        <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
          <p className="text-[20px] font-black text-white">{movementLabel}</p>
          {movementHint ? (
            <p className="mt-1 text-[13px] font-semibold leading-5 text-white/70">{movementHint}</p>
          ) : null}
          {intervalLine ? (
            <p className="mt-2 text-[13px] font-bold text-white/80">{intervalLine}</p>
          ) : prepLine ? (
            <p className="mt-2 text-[12px] font-medium text-white/45">{prepLine}</p>
          ) : operationLine ? (
            <p className="mt-2 text-[12px] font-medium text-white/45">{operationLine}</p>
          ) : null}
        </section>
      ) : null}

      {!movementProfile && operationConfig ? (
        <section className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
          {intervalLine ? (
            <p className="text-[14px] font-bold text-white/85">{intervalLine}</p>
          ) : prepLine ? (
            <p className="text-[13px] font-semibold text-white/70">{prepLine}</p>
          ) : null}
        </section>
      ) : null}

      {showCueSpeed ? (
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_12%,transparent)] p-4 sm:p-5">
          <p className="text-[12px] font-black tracking-[0.08em] text-white/55">자극 속도</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
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
                  title={disabled ? `${minCue}초 이상` : `${sec}초 · ${getCueSpeedGuide(sec).tempoLabel}`}
                  className={`relative inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-black transition ${
                    disabled
                      ? 'cursor-not-allowed border border-white/5 bg-black/20 text-white/25'
                      : active
                        ? 'bg-[var(--spm-acc)] text-white'
                        : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35'
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
