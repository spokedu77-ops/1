'use client';

/**
 * 구독자용 IIWARMUP 페이지
 * 한 화면 한 행동 / 큰 CTA / 진행 피드백 / 로딩·빈상태 / 접근성
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { generateWeekKey } from '@/app/lib/admin/assets/storagePaths';
import { useSubscriberSchedule, getChallengePropsFromPhases } from '@/app/lib/admin/hooks/useSubscriberSchedule';
import { WeekSelector, type WeekSelectorChangePayload } from '@/app/components/subscriber/WeekSelector';
import { PhaseControls, type PlayMode } from '@/app/components/subscriber/PhaseControls';
import { FullSequencePlayer } from '@/app/components/subscriber/FullSequencePlayer';
import { LoadingSkeleton } from '@/app/components/subscriber/LoadingSkeleton';
import { EmptyState } from '@/app/components/subscriber/EmptyState';
import { CompletionModal } from '@/app/components/subscriber/CompletionModal';
import { SpokeduRhythmGame } from '@/app/components/runtime/SpokeduRhythmGame';
import { ThinkPhaseWrapper } from '@/app/components/subscriber/ThinkPhaseWrapper';
import { FlowFrame } from '@/app/components/subscriber/FlowFrame';

/** 사용자 페이지 고정: 2월 2주차만 노출 */
const FIXED_YEAR = 2025;
const FIXED_MONTH = 2;
const FIXED_WEEK = 2;

type ViewState = 'idle' | 'loading' | 'empty' | 'ready' | 'playing' | 'completed';

function formatMetaLine(bpm?: number, totalMin?: number): string {
  const parts: string[] = [];
  if (totalMin != null && totalMin > 0) parts.push(`약 ${totalMin}분`);
  if (bpm != null && bpm > 0) parts.push(`${bpm} BPM`);
  return parts.length ? parts.join(' · ') : '이번 주 프리셋';
}

export default function IIWarmupSubscriberPage() {
  const [year, setYear] = useState(FIXED_YEAR);
  const [month, setMonth] = useState(FIXED_MONTH);
  const [week, setWeek] = useState(FIXED_WEEK);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const weekSelectorRef = useRef<HTMLDivElement>(null);

  const weekKey = useMemo(
    () => generateWeekKey(year, month, week),
    [year, month, week]
  );

  const { data: scheduleData, isLoading: scheduleLoading } = useSubscriberSchedule(weekKey);
  const challengeProps = useMemo(
    () => getChallengePropsFromPhases(scheduleData?.challengePhases ?? scheduleData?.phases) ?? {},
    [scheduleData?.challengePhases, scheduleData?.phases]
  );
  const thinkSnapshot = scheduleData?.program_snapshot?.think150
    ? scheduleData.program_snapshot
    : undefined;

  const isPublished = !!scheduleData?.is_published;
  const hasPhases =
    (Array.isArray(scheduleData?.phases) && scheduleData.phases.length > 0) ||
    (Array.isArray(scheduleData?.challengePhases) && (scheduleData?.challengePhases?.length ?? 0) > 0);

  useEffect(() => {
    if (viewState === 'playing' || viewState === 'completed') return;
    if (scheduleLoading) {
      setViewState('loading');
      return;
    }
    if (!isPublished || !hasPhases) {
      setViewState('empty');
    } else {
      setViewState('ready');
    }
  }, [scheduleLoading, isPublished, hasPhases, viewState]);

  const handleWeekChange = (payload: WeekSelectorChangePayload) => {
    setYear(payload.year);
    setMonth(payload.month);
    setWeek(payload.week);
  };

  const handleStart = (mode: PlayMode) => {
    setPlayMode(mode);
    setViewState('playing');
  };

  const handlePhaseChange = (phase: string) => {
    if (phase === 'end') {
      setPlayMode(null);
      setViewState('completed');
      setCompletedModalOpen(true);
    }
  };

  const handleExit = () => {
    setPlayMode(null);
    setViewState('ready');
  };

  const handleCloseCompletion = () => {
    setCompletedModalOpen(false);
    setViewState('ready');
  };

  const handleRestart = () => {
    setCompletedModalOpen(false);
    setViewState('playing');
    setPlayMode('full');
  };

  const metaLine = useMemo(
    () =>
      formatMetaLine(
        challengeProps.initialBpm,
        2
      ),
    [challengeProps.initialBpm]
  );

  const hasPreviousWeek = week > 1 || month > 1 || year > FIXED_YEAR;
  const goPreviousWeek = () => {
    if (week > 1) {
      handleWeekChange({ year, month, week: week - 1, label: `${year}년 ${month}월 · ${week - 1}주차` });
    } else if (month > 1) {
      handleWeekChange({ year, month: month - 1, week: 5, label: `${year}년 ${month - 1}월 · 5주차` });
    } else if (year > FIXED_YEAR) {
      handleWeekChange({ year: year - 1, month: 12, week: 5, label: `${year - 1}년 12월 · 5주차` });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {viewState === 'loading' && <LoadingSkeleton />}

      {viewState !== 'loading' && (
        <div className="mx-auto max-w-2xl space-y-8 px-5 py-10">
          <header className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              SPOKEDU iiWarmup
            </h1>
            <p className="mt-2 text-lg font-medium text-neutral-200">
              이번 주 웜업을 2분 만에 완주해요
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              아이들이 &apos;따라하기&apos;가 아니라 &apos;미션&apos;으로 몰입하도록 설계했어요
            </p>
          </header>

          <section
            ref={weekSelectorRef}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur-sm"
            aria-label="이번 주 프로그램"
          >
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
              이번 주 프로그램
            </h2>
            <WeekSelector
              year={year}
              month={month}
              week={week}
              onChange={handleWeekChange}
            />
            {viewState === 'ready' && (
              <p className="mt-2 text-xs text-neutral-500">{metaLine}</p>
            )}
          </section>

          {viewState === 'empty' && (
            <EmptyState
              hasPreviousWeek={hasPreviousWeek}
              onPreviousWeek={hasPreviousWeek ? goPreviousWeek : undefined}
              onFocusWeekSelector={() => weekSelectorRef.current?.scrollIntoView({ behavior: 'smooth' })}
            />
          )}

          {(viewState === 'ready' || viewState === 'completed') && (
            <section aria-label="전체 웜업">
              <PhaseControls
                onStart={handleStart}
                disabled={viewState === 'completed'}
                metaLine="약 2분 · 이번 주 프리셋"
              />
            </section>
          )}
        </div>
      )}

      {playMode && viewState === 'playing' && !scheduleLoading && (
        <FullSequencePlayer
          weekKey={weekKey}
          mode={playMode}
          onPhaseChange={handlePhaseChange}
          onExit={handleExit}
          renderPlay={({ onEnd }) => (
            <SpokeduRhythmGame
              allowEdit={false}
              onEnd={onEnd}
              initialBpm={challengeProps.initialBpm}
              initialLevel={challengeProps.initialLevel}
              initialGrid={challengeProps.initialGrid}
              initialLevelData={challengeProps.initialLevelData}
              bgmPath={scheduleData?.challengeBgmPath ?? undefined}
              bgmStartOffsetMs={scheduleData?.challengeBgmStartOffsetMs ?? 0}
            />
          )}
          renderThink={({ weekKey: wk, onEnd }) => (
            <ThinkPhaseWrapper
              weekKey={wk}
              onEnd={onEnd}
              scheduleSnapshot={thinkSnapshot}
              thinkPackByMonthAndWeek={scheduleData?.thinkPackByMonthAndWeek ?? undefined}
              month={month}
            />
          )}
          renderFlow={({ weekKey: wk, onEnd }) => (
            <FlowFrame weekKey={wk} onEnd={onEnd} autoStart />
          )}
        />
      )}

      <CompletionModal
        open={completedModalOpen}
        onClose={handleCloseCompletion}
        onRestart={handleRestart}
      />
    </div>
  );
}
