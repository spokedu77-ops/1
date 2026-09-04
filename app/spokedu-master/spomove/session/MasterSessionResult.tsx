'use client';

import { ClipboardList, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { TrainingResultScreen } from '@/app/admin/spomove/training/_player/components/TrainingResultScreen';
import {
  resultLevelLabel,
  settingsToTrainingResultConfig,
  type ColorStimulusCounts,
} from '@/app/admin/spomove/training/_player/lib/trainingResultSummary';
import type { OfficialSpomoveEngineMode } from '../officialSpomovePresets';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../../lib/masterActionGrammar';

export function MasterSessionResult({
  status,
  activityTitle,
  elapsedMs,
  settings,
  colorCounts = null,
  engineMode,
  engineLevel,
  rounds,
  cueSeconds,
  intervalMode = false,
  intervalWork,
  intervalSets,
  flowDuration,
  recordHref,
  hubHref,
  leaveHref,
  sessionReturnHref,
  canMarkComplete = false,
  markCompleteStatus = 'idle',
  onMarkCompleteAndReturn,
  onRetry,
}: {
  status: 'done' | 'ended';
  activityTitle: string;
  elapsedMs: number;
  settings: string[];
  colorCounts?: ColorStimulusCounts | null;
  engineMode: OfficialSpomoveEngineMode;
  engineLevel: number;
  rounds: number;
  cueSeconds: number;
  intervalMode?: boolean;
  intervalWork?: number;
  intervalSets?: number;
  flowDuration?: number;
  recordHref: string | null;
  hubHref: string;
  /** TopBar/목록 — Dashboard/Favorites/Hub/Session 원점 */
  leaveHref?: string;
  /** Session operating origin — Primary return when present. */
  sessionReturnHref?: string | null;
  /** Explicit teacher action only — never auto from engine done. */
  canMarkComplete?: boolean;
  markCompleteStatus?: 'idle' | 'saving' | 'error';
  onMarkCompleteAndReturn?: () => void;
  onRetry: () => void;
}) {
  const router = useRouter();
  const done = status === 'done';
  const fromSession = Boolean(sessionReturnHref);
  const marking = markCompleteStatus === 'saving';
  const cfg = settingsToTrainingResultConfig({
    mode: engineMode,
    level: engineLevel,
    timeMode: intervalMode ? 'interval' : 'time',
    duration: Math.max(1, rounds * cueSeconds),
    targetReps: rounds,
    intervalMode,
    intervalWork,
    intervalSets,
    flowDuration,
  });
  const usedSettings = settings.filter(Boolean).join(' · ');

  return (
    <TrainingResultScreen
      cfg={cfg}
      elapsedMs={elapsedMs}
      colorCounts={colorCounts}
      levelLabel={resultLevelLabel(engineMode, engineLevel)}
      title={done ? '훈련 완료' : '수업을 종료했습니다'}
      statusBadge={done ? '정상 완료' : '중도 종료'}
      programTitle={activityTitle}
      sessionSettings={{
        title: '사용한 설정',
        primary: usedSettings || `자극 ${cueSeconds}초`,
        secondary: intervalMode && intervalWork && intervalSets
          ? `Tabata ${intervalSets}세트 · ${intervalWork}초`
          : flowDuration
            ? `스테이지 ${flowDuration}초`
            : undefined,
      }}
      retryLabel="같은 설정으로 다시 실행"
      onBack={() => router.push(leaveHref || sessionReturnHref || hubHref)}
      onRetry={onRetry}
      footer={(
        <div className="grid gap-2">
          {usedSettings ? (
            <p className="break-words text-[13px] font-bold leading-5 text-slate-800">
              사용한 설정 · {usedSettings}
            </p>
          ) : null}
          <p className="text-xs font-semibold leading-5 text-slate-500">
            {fromSession
              ? '실행 종료와 수업 활동 완료 기록은 별개입니다. 수업 화면에서 진행 체크하거나, 아래에서 완료로 표시할 수 있습니다.'
              : '표시된 정보는 실행 시간과 사용 설정이며, 수행 능력을 자동 채점한 결과가 아닙니다.'}
          </p>
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
            <Link href={recordHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-4 text-[15px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">
              <ClipboardList className="mr-2 h-4 w-4" /> 수업 기록 남기기
            </Link>
          ) : null}
          <button type="button" onClick={onRetry} className={`${fromSession || recordHref ? SPM_SECONDARY_BTN : SPM_PRIMARY_BTN} min-h-12 w-full`}>
            <RefreshCw className="mr-2 h-4 w-4" /> 같은 설정으로 다시 실행
          </button>
          <Link href={hubHref} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-[14px] font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
            {fromSession ? 'SPOMOVE 활동 목록' : '활동 목록으로'}
          </Link>
        </div>
      )}
    />
  );
}
