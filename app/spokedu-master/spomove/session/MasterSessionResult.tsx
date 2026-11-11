'use client';

import type { SpomoveResultEducation } from '../spomoveResultEducation';

import type { TrainingActivityId } from '@/app/admin/spomove/training/_player/lib/trainingActivity';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { TrainingResultScreen } from '@/app/admin/spomove/training/_player/components/TrainingResultScreen';
import type { DiveActionMoveSession } from '@/app/admin/spomove/training/_player/lib/diveActionMoveReport';
import {
  resultLevelLabel,
  settingsToTrainingResultConfig,
  type ColorStimulusCounts,
  type TrainingResultRuleSettings,
} from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import type { OfficialSpomoveEngineMode } from '../officialSpomovePresets';
import { resolveSpomoveCompletionPresentation, type SpomoveCompletionReason } from './sessionResultModel';
import type { SpomoveExecutionVolume } from './resolveSpomoveExecutionVolume';
import type { MovementPick } from '../movements/movementTypes';

export function MasterSessionResult({
  officialPresetId,
  completionReason,
  activityTitle,
  education,
  elapsedMs,
  colorCounts = null,
  stims,
  directionRecord,
  goalkeeperRecord,
  glassBridge,
  settings,
  cueSeconds,
  engineMode,
  engineLevel,
  activityId,
  flankerExtremeMode,
  resultRules,
  rounds,
  executionVolume,
  diveActionMove = null,
  hubHref,
  sessionReturnHref,
  canMarkComplete = false,
  markCompleteStatus = 'idle',
  onMarkCompleteAndReturn,
  onRetry,
}: {
  officialPresetId?: string;
  completionReason: SpomoveCompletionReason;
  initialMovement: MovementPick | null;
  finalMovement: MovementPick | null;
  movementChangeCount: number;
  activityTitle: string;
  education?: SpomoveResultEducation;
  elapsedMs: number;
  settings: string[];
  colorCounts?: ColorStimulusCounts | null;
  stims?: number;
  directionRecord?: import('@/app/admin/spomove/training/_player/lib/directionPresentation').DirectionPresentationRecord;
  goalkeeperRecord?: import('@/app/admin/spomove/training/_player/lib/goalkeeperResultRecord').GoalkeeperResultRecord;
  glassBridge?: import('@/app/admin/spomove/training/_player/lib/glassBridgeMemory').GlassBridgeResult;
  engineMode: OfficialSpomoveEngineMode;
  engineLevel: number;
  activityId?: TrainingActivityId;
  flankerExtremeMode?: 'theme' | 'arrow';
  resultRules?: TrainingResultRuleSettings;
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
  const completion = resolveSpomoveCompletionPresentation(completionReason);
  const fromSession = Boolean(sessionReturnHref);
  const marking = markCompleteStatus === 'saving';
  const cfg = settingsToTrainingResultConfig({
    ...resultRules,
    mode: engineMode,
    level: engineLevel,
    activityId,
    flankerExtremeMode,
    speed: cueSeconds,
    timeMode: executionVolume.kind === 'reps' ? 'reps' : executionVolume.kind === 'interval' ? 'interval' : 'time',
    duration: executionVolume.kind === 'time' || executionVolume.kind === 'stage' ? executionVolume.durationSec : 0,
    targetReps: executionVolume.kind === 'reps' || executionVolume.kind === 'rounds' || executionVolume.kind === 'stage' ? executionVolume.count : rounds,
    intervalMode: executionVolume.kind === 'interval',
    intervalWork: executionVolume.interval?.workSeconds,
    intervalSets: executionVolume.interval?.sets,
  });
  return (
    <TrainingResultScreen
      officialPresetId={officialPresetId}
      enhancedFeedback
      cfg={cfg}
      completionReason={completionReason}
      elapsedMs={elapsedMs}
      colorCounts={colorCounts}
      stims={stims}
      directionRecord={directionRecord}
      goalkeeperRecord={goalkeeperRecord}
      glassBridge={glassBridge}
      sessionSettings={settings.length ? { title: '실행 설정', primary: settings.join(' · ') } : null}
      levelLabel={resultLevelLabel(engineMode, engineLevel, activityId)}
      title={completion.title}
      statusBadge={completion.statusBadge}
      diveActionMove={diveActionMove ? { ...diveActionMove, completed: completionReason === 'natural_complete' } : null}
      programTitle={activityTitle}
      education={education}
      volumeLabel={executionVolume.label}
      retryLabel="같은 설정으로 다시 준비"
      onBack={() => router.push(hubHref)}
      onRetry={onRetry}
      resultActions={sessionReturnHref ? <>
        <Link href={sessionReturnHref}>수업으로 돌아가기</Link>
        {canMarkComplete && onMarkCompleteAndReturn ? <button type="button" disabled={marking} onClick={onMarkCompleteAndReturn}>{marking ? '기록 중…' : '완료로 표시하고 수업으로'}</button> : <button type="button" onClick={onRetry}>다시 도전하기</button>}
      </> : null}
      resultNotice={fromSession && markCompleteStatus === 'error' ? <p role="status">완료 기록을 저장하지 못했습니다. 수업 화면에서 직접 완료해 주세요.</p> : null}
    />
  );
}
