'use client';

import { Play } from 'lucide-react';

import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { formatSpomoveCueLabel, type SpomoveCueSpeedSec } from '../spomoveCueSpeed';
import { SpomovePadLayoutView } from '../SpomovePadLayoutView';
import { getSpomovePadLayoutVariant } from '../spomovePadLayout';
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

/** entry=start — values are confirmed here, never edited. The button supplies browser activation. */
export function StartBriefing({
  preset,
  cueSeconds,
  matCount,
  executionVolume,
  flowDuration,
  flowIncludeBonus,
  canChangeSettings,
  startDisabled,
  onSettings,
  onStart,
}: {
  preset: OfficialSpomovePreset;
  cueSeconds: SpomoveCueSpeedSec;
  matCount: number;
  executionVolume: SpomoveExecutionVolume;
  flowDuration: number;
  flowIncludeBonus: boolean;
  canChangeSettings: boolean;
  startDisabled: boolean;
  onSettings: () => void;
  onStart: () => void;
}) {
  const isActionMove = preset.id === 'dive-standard';
  const regularStageCount = Math.max(0, executionVolume.count - (flowIncludeBonus ? 1 : 0));
  const bonusDuration = Math.max(0, executionVolume.durationSec - regularStageCount * flowDuration);

  return (
    <div data-spm-session-ready-screen="true">
      <section>
        <p className="text-sm font-semibold text-white">매트 배치</p>
        <div className="mt-5">
          <SpomovePadLayoutView
            variant={getSpomovePadLayoutVariant(preset)}
            prominent
            directionLabel="화면 방향 ↑"
            dark
            flush
          />
        </div>
        <p className="mt-3 text-center text-[13px] font-medium text-white/65">SPOMAT {matCount}장</p>
      </section>

      {isActionMove ? (
        <div className="mt-7 text-center" data-spm-execution-volume={executionVolume.label}>
          <p className="text-[15px] font-semibold leading-6 text-white/85">
            {regularStageCount}단계 <span className="text-white/45">×</span> {flowDuration}초
            {flowIncludeBonus && bonusDuration > 0 ? <span className="whitespace-nowrap"> <span className="mx-1 text-white/35">+</span> <span className="text-amber-300">BONUS {bonusDuration}초</span></span> : null}
          </p>
          <div className="mt-4">
            <p className="text-[12px] font-semibold text-white/45">총 운동</p>
            <p
              className="mt-1 text-[28px] font-extrabold leading-none text-white"
              style={{ fontFamily: 'var(--spm-font-display)', fontSynthesis: 'none' }}
            >
              {formatExerciseDuration(executionVolume.durationSec)}
            </p>
          </div>
          <p className="mt-3 text-[12px] font-medium leading-5 text-white/55">전환 안내 시간은 총 운동시간에 포함되지 않습니다.</p>
        </div>
      ) : (
        <div className="mt-7 text-center" data-spm-execution-volume={executionVolume.label}>
          <p className="text-[13px] font-semibold text-white/60">자극 {formatSpomoveCueLabel(preset, cueSeconds)}</p>
          <div className="mt-4">
            <p className="text-[12px] font-semibold text-white/45">{executionVolumeCaption(executionVolume)}</p>
            <p
              className="mt-1 text-[28px] font-extrabold leading-tight text-white"
              style={{ fontFamily: 'var(--spm-font-display)', fontSynthesis: 'none' }}
            >
              {executionVolumeLabel(executionVolume)}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={startDisabled}
        className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-slate-950 transition hover:bg-white/92 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-4 w-4 fill-current" />
        {startDisabled ? '불러오는 중…' : isActionMove ? '액션 무브 시작' : '실행 시작'}
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
