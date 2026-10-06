'use client';

import { Play } from 'lucide-react';
import {
  diveActionMoveDurationSec,
  formatDiveActionMoveDuration,
  formatDiveActionMoveDurationDetail,
} from '@/app/lib/spomove/diveActionMoveTiming';
import { DIVE_THEME_UI, isDiveActionMoveUnityTheme, type DiveThemeId } from '@/app/lib/spomove/diveThemes';

import {
  SPOMOVE_CUE_SPEED_OPTIONS,
  MOTION_GATE_CUE_SPEED_OPTIONS,
  getCueSpeedGuide,
  usesRandomSequenceCue,
  supportsCueSpeedOverride,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { SpomovePadLayoutView } from '../SpomovePadLayoutView';
import { getSpomovePadLayoutVariant } from '../spomovePadLayout';
import type { SpomoveUserAudioMode } from './spomoveAudioMode';

type SportsArenaFeatureKey = 'side' | 'jump' | 'duck';

/** Session Settings adjusts only values that can change this run. */
export function SettingsBriefing({
  preset,
  matCount,
  audioMode,
  onAudioModeChange,
  bgmAvailable,
  startDisabled,
  cueSeconds,
  recommendedCueSeconds,
  onCueSecondsChange,
  diveEnvironmentTheme,
  onDiveEnvironmentThemeChange,
  sportsArenaFeatures,
  onSportsArenaFeaturesChange,
  flowDuration,
  onFlowDurationChange,
  flowIncludeBonus,
  onFlowIncludeBonusChange,
  onStart,
  cueFloorNotice,
}: {
  preset: OfficialSpomovePreset;
  matCount: number;
  audioMode: SpomoveUserAudioMode;
  onAudioModeChange: (mode: SpomoveUserAudioMode) => void;
  bgmAvailable: boolean;
  startDisabled: boolean;
  cueSeconds: SpomoveCueSpeedSec;
  recommendedCueSeconds: SpomoveCueSpeedSec;
  onCueSecondsChange: (value: SpomoveCueSpeedSec) => void;
  diveEnvironmentTheme: DiveThemeId;
  onDiveEnvironmentThemeChange: (value: DiveThemeId) => void;
  sportsArenaFeatures: SportsArenaFeatureKey[];
  onSportsArenaFeaturesChange: (value: SportsArenaFeatureKey[]) => void;
  flowDuration: number;
  onFlowDurationChange: (value: number) => void;
  flowIncludeBonus: boolean;
  onFlowIncludeBonusChange: (value: boolean) => void;
  onStart: () => void;
  cueFloorNotice?: string | null;
}) {
  const showCueSpeed = supportsCueSpeedOverride(preset);
  const showRandomSequenceCue = usesRandomSequenceCue(preset);
  const actionMoveSelection = {
    side: sportsArenaFeatures.includes('side'),
    jump: sportsArenaFeatures.includes('jump'),
    duck: sportsArenaFeatures.includes('duck'),
    bonus: flowIncludeBonus,
  };
  const actionMoveDurationSec = diveActionMoveDurationSec(actionMoveSelection, flowDuration);
  const actionMoveDurationDetail = formatDiveActionMoveDurationDetail(actionMoveSelection, flowDuration);
  const cueSpeedOptions = preset.id === 'dive-color-gate-61'
    ? MOTION_GATE_CUE_SPEED_OPTIONS
    : SPOMOVE_CUE_SPEED_OPTIONS;

  return (
    <div className="space-y-4 [@media(max-height:950px)]:space-y-3" data-spm-session-settings-screen="true">
      <section>
        <p className="text-sm font-semibold text-white">매트 배치</p>
        <div className="mt-5">
          <SpomovePadLayoutView variant={getSpomovePadLayoutVariant(preset)} prominent directionLabel="화면 방향 ↑" dark flush />
        </div>
        <p className="mt-3 text-center text-[13px] font-medium text-white/65">SPOMAT {matCount}장</p>
      </section>

      {showRandomSequenceCue ? (
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_12%,transparent)] p-4 sm:p-5 [@media(max-height:950px)]:p-3">
          <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/55">자극 시간</p>
          <button type="button" aria-pressed="true" className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--spm-acc)] px-4 text-[15px] font-extrabold text-white">
            1~3초 (랜덤)
          </button>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-white/55">각 색상 자극이 1초에서 3초 사이의 서로 다른 시간으로 제시됩니다.</p>
        </div>
      ) : showCueSpeed ? (
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_12%,transparent)] p-4 sm:p-5 [@media(max-height:950px)]:p-3">
          <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/55">자극 속도</p>
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
                  className={`relative inline-flex h-12 items-center justify-center rounded-xl text-[15px] font-extrabold transition [@media(max-height:950px)]:h-10 ${
                    active
                      ? 'bg-[var(--spm-acc)] text-white'
                      : 'border border-white/15 bg-black/30 text-white/80 hover:border-white/35'
                  }`}
                >
                  {sec}
                  {recommended ? (
                    <span className="absolute -top-2 right-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--spm-acc)] shadow-sm">
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

      {preset.engine.mode === 'flow' && preset.engine.level === 1 && preset.id !== 'dive-standard' ? (
        <section aria-label="DIVE 환경 테마">
          <p className="text-sm font-semibold text-white">환경 테마</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIVE_THEME_UI.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => onDiveEnvironmentThemeChange(id)} aria-pressed={diveEnvironmentTheme === id} className={`min-h-11 rounded-xl px-4 text-sm font-bold ${diveEnvironmentTheme === id ? 'bg-[var(--spm-acc)] text-white' : 'border border-white/15 bg-black/30 text-white/80'}`}>
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {preset.engine.mode === 'flow' && preset.engine.level === 1 && isDiveActionMoveUnityTheme(diveEnvironmentTheme) ? (
        <section aria-label="놀이공원 수업 설정" className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">액션 구성</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                ['side', 'SIDE', '좌·우 이동'],
                ['jump', 'JUMP', '장애물 뛰어넘기'],
                ['duck', 'DUCK', '숙여 통과하기'],
              ] as const).map(([key, label, detail]) => {
                const active = sportsArenaFeatures.includes(key);
                return <button key={key} type="button" aria-pressed={active} onClick={() => onSportsArenaFeaturesChange(active ? sportsArenaFeatures.filter((feature) => feature !== key) : [...sportsArenaFeatures, key])} className={`min-h-12 rounded-xl px-3 text-left text-sm font-bold ${active ? 'bg-[var(--spm-acc)] text-white' : 'border border-white/15 bg-black/30 text-white/80'}`}><span className="block">{label}</span><span className="block text-[11px] font-semibold opacity-65">{detail}</span></button>;
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">스테이지당 시간</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[15, 20, 25, 30, 35].map((seconds) => <button key={seconds} type="button" aria-pressed={flowDuration === seconds} onClick={() => onFlowDurationChange(seconds)} className={`min-h-11 whitespace-nowrap rounded-xl text-sm font-bold ${flowDuration === seconds ? 'bg-[var(--spm-acc)] text-white' : 'border border-white/15 bg-black/30 text-white/80'}`}>{seconds}초</button>)}
            </div>
          </div>
          <button type="button" aria-pressed={flowIncludeBonus} onClick={() => onFlowIncludeBonusChange(!flowIncludeBonus)} className={`min-h-12 w-full whitespace-nowrap rounded-xl px-4 text-sm font-bold ${flowIncludeBonus ? 'bg-amber-400 text-slate-950' : 'border border-white/15 bg-black/30 text-white/80'}`}>{flowIncludeBonus ? '✓ ' : ''}BONUS · 60초</button>
          <p className="text-[12px] font-bold text-white/60">예상 활동 시간 <span className="whitespace-nowrap">{formatDiveActionMoveDuration(actionMoveDurationSec)}</span></p>
          {actionMoveDurationDetail ? <p className="text-[11px] font-semibold text-white/45"><span className="whitespace-nowrap">{actionMoveDurationDetail}</span></p> : null}
        </section>
      ) : null}

      <section aria-label="소리">
        <p className="text-sm font-semibold text-white">소리</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            ['full', bgmAvailable ? '음악 + 효과음' : '음악 + 효과음 · BGM 없음'],
            ['effects', '효과음만'],
            ['silent', '무음'],
          ] as const).map(([mode, label]) => {
            const active = audioMode === mode;
            const disabled = mode === 'full' && !bgmAvailable;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onAudioModeChange(mode)}
                className={`min-h-11 rounded-xl px-3 text-sm font-bold transition ${active ? 'border-2 border-white bg-[var(--spm-acc)] text-white' : 'border border-white/15 bg-black/30 text-white/80'} disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <span aria-hidden="true">{active ? '✓ ' : ''}</span>{label}
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={onStart}
        disabled={startDisabled}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-slate-950 transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4 fill-current" />
        {startDisabled ? '불러오는 중…' : '수업 시작'}
      </button>
    </div>
  );
}
