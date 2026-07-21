'use client';

import { Play } from 'lucide-react';

import {
  BuiltInMovementNotice,
  FixedMovementSummary,
  MovementConfigurator,
} from '../movements/MovementConfigurator';
import { listAllowedMovementPicks, resolveOfficialRecommended } from '../movements/movementResolve';
import type { ActivityFamilyDefinition, MovementPick, MovementProfile } from '../movements/movementTypes';
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
  onMovementPickChange,
  cueFloorNotice,
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
  onMovementPickChange?: (pick: MovementPick) => void;
  cueFloorNotice?: string | null;
}) {
  const showCueSpeed = supportsCueSpeedOverride(preset);
  const difficultyOptions = difficultyKind ? getSpomoveDifficultyOptions(difficultyKind) : [];
  const recommendedSec = recommendedCueSecondsForPreset(preset);
  const allowedPicks =
    movementProfile && movementFamily
      ? listAllowedMovementPicks(movementProfile, movementFamily)
      : [];
  const officialRecommended =
    movementProfile && movementFamily
      ? resolveOfficialRecommended(movementFamily, movementProfile)
      : null;
  const minCue = movement
    ? resolveSessionConfiguration({ movement, cueSeconds: 1 }).minimumCueSeconds
    : 1;

  return (
    <div className="space-y-4">
      <p className="text-[12px] font-black tracking-[0.08em] text-white/55">활동 설정</p>

      {movementProfile && movementFamily ? (
        <div>
          {movementProfile.selectionMode === 'selectable' &&
          movementPick &&
          officialRecommended &&
          onMovementPickChange ? (
            <MovementConfigurator
              variant="compact"
              profile={movementProfile}
              family={movementFamily}
              value={movementPick}
              officialRecommended={officialRecommended}
              allowedPicks={allowedPicks}
              onChange={onMovementPickChange}
            />
          ) : null}
          {movementProfile.selectionMode === 'fixed' && movementPick && officialRecommended ? (
            <FixedMovementSummary
              variant="compact"
              value={movementPick}
              officialRecommended={officialRecommended}
            />
          ) : null}
          {movementProfile.selectionMode === 'disabled' ? (
            <BuiltInMovementNotice profile={movementProfile} />
          ) : null}
        </div>
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
