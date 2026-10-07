'use client';

import { Play } from 'lucide-react';
import {
  diveActionMoveDurationSec,
  formatDiveActionMoveDuration,
  formatDiveActionMoveDurationDetail,
} from '@/app/lib/spomove/diveActionMoveTiming';
import { DIVE_THEME_UI, isDiveActionMoveUnityTheme, type DiveThemeId } from '@/app/lib/spomove/diveThemes';

import {
  formatSpomoveCueLabel,
  usesRandomSequenceCue,
  supportsCueSpeedOverride,
  type SpomoveCueSpeedSec,
} from '../spomoveCueSpeed';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { SpomovePadLayoutView } from '../SpomovePadLayoutView';
import { getSpomovePadLayoutVariant } from '../spomovePadLayout';
import type { SpomoveUserAudioMode } from './spomoveAudioMode';
import type { SpomoveExecutionVolume } from './resolveSpomoveExecutionVolume';

function formatExerciseDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes === 0) return `${remainingSeconds}초`;
  if (remainingSeconds === 0) return `${minutes}분`;
  return `${minutes}분 ${remainingSeconds}초`;
}

function executionVolumeLabel(volume: SpomoveExecutionVolume): string {
  if ((volume.kind === 'time' || volume.kind === 'stage') && volume.durationSec > 0) {
    return formatExerciseDuration(volume.durationSec);
  }
  return volume.label;
}

function executionVolumeCaption(volume: SpomoveExecutionVolume): string {
  if (volume.kind === 'reps') return '총 반복';
  if (volume.kind === 'rounds') return '총 라운드';
  if (volume.kind === 'interval') return '진행 구성';
  if (volume.kind === 'builtIn') return '실행 구성';
  return '총 운동';
}

type SportsArenaFeatureKey = 'side' | 'jump' | 'duck';

/** Session Settings adjusts only values that can change this run. */
export function SettingsBriefing({
  preset,
  matCount,
  executionVolume,
  audioMode,
  onAudioModeChange,
  bgmAvailable,
  startDisabled,
  cueSeconds,
  recommendedCueSeconds,
  onCueSecondsChange,
  repetitionCount,
  onRepetitionCountChange,
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
  executionVolume: SpomoveExecutionVolume;
  audioMode: SpomoveUserAudioMode;
  onAudioModeChange: (mode: SpomoveUserAudioMode) => void;
  bgmAvailable: boolean;
  startDisabled: boolean;
  cueSeconds: SpomoveCueSpeedSec;
  recommendedCueSeconds: SpomoveCueSpeedSec;
  onCueSecondsChange: (value: SpomoveCueSpeedSec) => void;
  repetitionCount: number | null;
  onRepetitionCountChange: (value: number) => void;
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
  const isActionMove = preset.id === 'dive-standard';
  const regularStageCount = Math.max(0, executionVolume.count - (flowIncludeBonus ? 1 : 0));
  const bonusDuration = Math.max(0, executionVolume.durationSec - regularStageCount * flowDuration);
  const showRandomSequenceCue = usesRandomSequenceCue(preset);
  const actionMoveSelection = {
    side: sportsArenaFeatures.includes('side'),
    jump: sportsArenaFeatures.includes('jump'),
    duck: sportsArenaFeatures.includes('duck'),
    bonus: flowIncludeBonus,
  };
  const actionMoveDurationSec = diveActionMoveDurationSec(actionMoveSelection, flowDuration);
  const actionMoveDurationDetail = formatDiveActionMoveDurationDetail(actionMoveSelection, flowDuration);
  const cueSpeedMax = preset.id === 'dive-color-gate-61' ? 10 : 6;
  const cueSpeedProgress = ((cueSeconds - 1) / (cueSpeedMax - 1)) * 100;

  return (
    <div className="space-y-2" data-spm-session-settings-screen="true">
      <div className="grid grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] items-stretch gap-3">
      <section className="flex h-full flex-col">
        <p className="text-sm font-semibold text-white">매트 배치</p>
        <div className="mt-2">
          <SpomovePadLayoutView variant={getSpomovePadLayoutVariant(preset)} prominent directionLabel="화면 방향 ↑" dark flush />
        </div>
        <p className="mt-1 text-center text-[13px] font-medium text-white/65">SPOMAT {matCount}장</p>
      </section>

      <section className={`flex h-full flex-col justify-center rounded-[22px] border border-white/10 bg-white/[0.04] p-3 text-center`} data-spm-execution-volume={executionVolume.label}>
        {isActionMove ? (
          <>
            <p className="text-[15px] font-semibold leading-6 text-white/85">
              {regularStageCount}단계 <span className="text-white/45">×</span> {flowDuration}초
              {flowIncludeBonus && bonusDuration > 0 ? <span className="whitespace-nowrap"> <span className="mx-1 text-white/35">+</span> <span className="text-amber-300">BONUS {bonusDuration}초</span></span> : null}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-white/45">총 운동</p>
            <p className="mt-1 text-[28px] font-extrabold leading-none text-white" style={{ fontFamily: 'var(--spm-font-display)', fontSynthesis: 'none' }}>
              {formatExerciseDuration(executionVolume.durationSec)}
            </p>
            <p className="mt-3 text-[12px] font-medium leading-5 text-white/55">전환 안내 시간은 총 운동시간에 포함되지 않습니다.</p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-white/60">자극 {formatSpomoveCueLabel(preset, cueSeconds)}</p>
            <p className="mt-1 text-[12px] font-semibold text-white/45">{executionVolumeCaption(executionVolume)}</p>
            <p className="mt-1 text-[24px] font-extrabold leading-tight text-white" style={{ fontFamily: 'var(--spm-font-display)', fontSynthesis: 'none' }}>
              {executionVolumeLabel(executionVolume)}
            </p>
          </>
        )}
      </section>
      </div>

      {repetitionCount != null ? (
        <section aria-label="반복 횟수">
          <p className="text-sm font-semibold text-white">반복 횟수</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[10, 15, 20, 30].map((count) => {
              const active = repetitionCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onRepetitionCountChange(count)}
                  className={`min-h-10 rounded-xl border text-sm font-bold transition ${active ? 'border-2 border-white bg-[var(--spm-acc)] text-white' : 'border-white/15 bg-black/30 text-white/70 hover:border-white/35'}`}
                >
                  {count}회
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      {showRandomSequenceCue ? (
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--spm-acc)_35%,transparent)] bg-[color-mix(in_srgb,var(--spm-acc)_12%,transparent)] rounded-2xl p-2.5">
          <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/55">자극 시간</p>
          <button type="button" aria-pressed="true" className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--spm-acc)] px-4 text-[15px] font-extrabold text-white">
            1~3초 (랜덤)
          </button>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-white/55">각 색상 자극이 1초에서 3초 사이의 서로 다른 시간으로 제시됩니다.</p>
        </div>
      ) : showCueSpeed ? (
        <section aria-label="자극 속도">
          <p className="text-sm font-semibold text-white">자극 속도</p>
          {preset.engine.mode === 'spatial' && preset.engine.level === 7 ? (
            <p className="mt-1 text-[12px] font-semibold text-white/55">
              첫 그리드를 보여주는 시간입니다. 답 고르기는 3초 고정입니다.
            </p>
          ) : null}
          <div className="mt-2 rounded-2xl border-2 border-white/80 bg-black/45 px-4 pb-2 pt-2 shadow-inner sm:px-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="block text-[11px] font-bold text-white/50">현재 속도</span>
                <strong className="mt-0.5 block text-[26px] font-extrabold leading-none text-white">
                  {cueSeconds}<span className="ml-1 text-[14px] text-white/65">초</span>
                </strong>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70">
                추천 {recommendedCueSeconds}초
              </span>
            </div>
            <div className="mt-2 py-1">
              <input
                type="range"
                min={1}
                max={cueSpeedMax}
                step={1}
                value={cueSeconds}
                onChange={(event) => onCueSecondsChange(Number(event.target.value) as SpomoveCueSpeedSec)}
                aria-label="자극 속도"
                aria-valuetext={`${cueSeconds}초`}
                style={{ background: `linear-gradient(to right, white 0%, white ${cueSpeedProgress}%, rgba(255,255,255,0.2) ${cueSpeedProgress}%, rgba(255,255,255,0.2) 100%)` }}
                className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black/70 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[5px] [&::-moz-range-thumb]:border-[var(--spm-acc)] [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[5px] [&::-webkit-slider-thumb]:border-[var(--spm-acc)] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
              />
            </div>
            <div aria-hidden="true" className="relative mx-[14px] mt-1 h-4">
              {Array.from({ length: cueSpeedMax }, (_, index) => index + 1).map((second) => (
                <span
                  key={second}
                  className={`absolute -translate-x-1/2 text-center text-[10px] font-bold ${second === cueSeconds ? 'text-white' : 'text-white/35'}`}
                  style={{ left: `${((second - 1) / (cueSpeedMax - 1)) * 100}%` }}
                >
                  {second}
                </span>
              ))}
            </div>
            <div aria-hidden="true" className="mt-1 flex justify-between text-[11px] font-semibold text-white/50">
              <span>빠름</span>
              <span>느림</span>
            </div>
          </div>
          {cueFloorNotice ? (
            <p className="mt-3 text-[12px] font-bold leading-5 text-amber-200/90">{cueFloorNotice}</p>
          ) : null}
        </section>
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
        <div className="mt-2 grid grid-cols-3 gap-1.5">
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
                className={`min-h-10 rounded-xl px-3 text-sm font-bold transition ${active ? 'border-2 border-white bg-[var(--spm-acc)] text-white' : 'border border-white/15 bg-black/30 text-white/80'} disabled:cursor-not-allowed disabled:opacity-45`}
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
        className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-slate-950 transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <Play className="h-4 w-4 fill-current" />
        {startDisabled ? '불러오는 중…' : '수업 시작'}
      </button>
    </div>
  );
}
