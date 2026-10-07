'use client';

import { ClipboardList, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { TrainingResultScreen } from '@/app/admin/spomove/training/_player/components/TrainingResultScreen';
import type { DiveActionMoveSession } from '@/app/admin/spomove/training/_player/lib/diveActionMoveReport';
import {
  resultLevelLabel,
  settingsToTrainingResultConfig,
  type ColorStimulusCounts,
} from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import type { OfficialSpomoveEngineMode } from '../officialSpomovePresets';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../../lib/masterActionGrammar';
import { isNaturalSpomoveCompletion, type SpomoveCompletionReason } from './sessionResultModel';
import type { SpomoveExecutionVolume } from './resolveSpomoveExecutionVolume';
import type { MovementPick } from '../movements/movementTypes';

export function MasterSessionResult({
  completionReason,
  activityTitle,
  elapsedMs,
  colorCounts = null,
  engineMode,
  engineLevel,
  rounds,
  executionVolume,
  diveActionMove = null,
  recordHref,
  hubHref,
  sessionReturnHref,
  canMarkComplete = false,
  markCompleteStatus = 'idle',
  onMarkCompleteAndReturn,
  onRetry,
}: {
  completionReason: SpomoveCompletionReason;
  initialMovement: MovementPick | null;
  finalMovement: MovementPick | null;
  movementChangeCount: number;
  activityTitle: string;
  elapsedMs: number;
  settings: string[];
  colorCounts?: ColorStimulusCounts | null;
  engineMode: OfficialSpomoveEngineMode;
  engineLevel: number;
  rounds: number;
  cueSeconds: number;
  executionVolume: SpomoveExecutionVolume;
  /** flow 1 액션무브만. 다른 엔진 결과는 null. */
  diveActionMove?: DiveActionMoveSession | null;
  recordHref: string | null;
  hubHref: string;
  /** Session operating origin — Primary return when present. */
  sessionReturnHref?: string | null;
  /** Explicit teacher action only — never auto from engine done. */
  canMarkComplete?: boolean;
  markCompleteStatus?: 'idle' | 'saving' | 'error';
  onMarkCompleteAndReturn?: () => void;
  onRetry: () => void;
}) {
  const router = useRouter();
  const done = isNaturalSpomoveCompletion(completionReason);
  const fromSession = Boolean(sessionReturnHref);
  const marking = markCompleteStatus === 'saving';
  const cfg = settingsToTrainingResultConfig({
    mode: engineMode,
    level: engineLevel,
    timeMode: executionVolume.kind === 'reps' ? 'reps' : executionVolume.kind === 'interval' ? 'interval' : 'time',
    duration: executionVolume.kind === 'time' || executionVolume.kind === 'stage' ? executionVolume.durationSec : 0,
    targetReps: executionVolume.kind === 'reps' || executionVolume.kind === 'rounds' || executionVolume.kind === 'stage' ? executionVolume.count : rounds,
    intervalMode: executionVolume.kind === 'interval',
    intervalWork: executionVolume.interval?.workSeconds,
    intervalSets: executionVolume.interval?.sets,
  });
  return (
    <TrainingResultScreen
      cfg={cfg}
      elapsedMs={elapsedMs}
      colorCounts={colorCounts}
      levelLabel={resultLevelLabel(engineMode, engineLevel)}
      title={diveActionMove ? (done ? 'DIVE 활동 완료' : '수업을 종료했습니다') : (done ? '훈련 완료' : '수업을 종료했습니다')}
      statusBadge={diveActionMove ? (done ? '활동 완료' : '중도 종료') : (done ? '정상 완료' : '중도 종료')}
      diveActionMove={diveActionMove ? { ...diveActionMove, completed: done } : null}
      programTitle={activityTitle}
      volumeLabel={executionVolume.label}
      retryLabel="같은 설정으로 다시 준비"
      onBack={() => router.push(hubHref)}
      onRetry={onRetry}
      footer={(
        <div className="grid gap-2">
          {fromSession && markCompleteStatus === 'error' ? (
            <p role="status" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              완료 기록을 저장하지 못했습니다. 수업 화면에서 직접 완료해 주세요.
            </p>
          ) : null}
          {sessionReturnHref ? (
            <Link href={sessionReturnHref} className={`${SPM_PRIMARY_BTN} min-h-12 w-full`}>
              수업으로 돌아가기
            </Link>
          ) : null}
          {fromSession && canMarkComplete && onMarkCompleteAndReturn ? (
            <button
              type="button"
              disabled={marking}
              onClick={onMarkCompleteAndReturn}
              className={`${SPM_SECONDARY_BTN} min-h-11 w-full disabled:opacity-55`}
            >
              {marking ? '기록 중…' : '완료로 표시하고 수업으로'}
            </button>
          ) : null}
          {recordHref && !fromSession ? (
            <Link href={recordHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-4 text-[15px] font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">
              <ClipboardList className="mr-2 h-4 w-4" /> 수업 기록 남기기
            </Link>
          ) : null}
          <button type="button" onClick={onRetry} className={`${fromSession || recordHref ? SPM_SECONDARY_BTN : SPM_PRIMARY_BTN} min-h-12 w-full`}>
            <RefreshCw className="mr-2 h-4 w-4" /> 같은 설정으로 다시 준비
          </button>
          <Link href={hubHref} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-[14px] font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
            {fromSession ? 'SPOMOVE 활동 목록' : '활동 목록으로'}
          </Link>
        </div>
      )}
    />
  );
}
