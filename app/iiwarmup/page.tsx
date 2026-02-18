'use client';

/**
 * 구독자용 IIWARMUP 페이지
 * 한 화면 한 행동 / 큰 CTA / 진행 피드백 / 로딩·빈상태 / 접근성
 * 이번 주 프로그램만 자동 노출 (주차 선택 없음)
 */

import { useEffect, useMemo, useState } from 'react';
import { Clock, Music2 } from 'lucide-react';
import { getCurrentWeekKey } from '@/app/lib/admin/scheduler/getCurrentWeekKey';
import { useSubscriberSchedule, getChallengePropsFromPhases } from '@/app/lib/admin/hooks/useSubscriberSchedule';
import { PhaseControls, type PlayMode } from '@/app/components/subscriber/PhaseControls';
import { FullSequencePlayer } from '@/app/components/subscriber/FullSequencePlayer';
import { LoadingSkeleton } from '@/app/components/subscriber/LoadingSkeleton';
import { EmptyState } from '@/app/components/subscriber/EmptyState';
import { CompletionModal } from '@/app/components/subscriber/CompletionModal';
import { SpokeduRhythmGame } from '@/app/components/runtime/SpokeduRhythmGame';
import { ThinkPhaseWrapper } from '@/app/components/subscriber/ThinkPhaseWrapper';
import { FlowFrame } from '@/app/components/subscriber/FlowFrame';

type ViewState = 'idle' | 'loading' | 'empty' | 'ready' | 'playing' | 'completed';

/** weekKey → 표시 라벨 (예: 2025-02-W2 → 2025년 2월 · 2주차) */
function formatWeekLabel(weekKey: string): string {
  const m = weekKey.match(/^(\d{4})-(\d{2})-W(\d+)$/);
  if (!m) return weekKey;
  return `${m[1]}년 ${Number(m[2])}월 · ${m[3]}주차`;
}

export default function IIWarmupSubscriberPage() {
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [completedModalOpen, setCompletedModalOpen] = useState(false);

  const weekKey = useMemo(() => getCurrentWeekKey(), []);

  const { data: scheduleData, isLoading: scheduleLoading, refetch: refetchSchedule } = useSubscriberSchedule(weekKey);
  const challengeProps = useMemo(
    () => (getChallengePropsFromPhases(scheduleData?.challengePhases ?? scheduleData?.phases ?? null) ?? {}) as { initialBpm?: number; initialLevel?: number; initialGrid?: string[]; initialLevelData?: Record<number, string[]> },
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

  const handleStart = async (mode: PlayMode) => {
    await refetchSchedule();
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

  const handleCloseCompletion = () => {
    setCompletedModalOpen(false);
    setViewState('ready');
  };

  const handleRestart = () => {
    setCompletedModalOpen(false);
    setViewState('playing');
    setPlayMode('full');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {viewState === 'loading' && <LoadingSkeleton />}

      {viewState !== 'loading' && (
        <div className="mx-auto max-w-2xl space-y-8 px-5 py-10">
          <header className="relative rounded-2xl bg-gradient-to-b from-neutral-900/60 to-transparent px-6 py-8 text-center">
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgb(6_182_212_/0.08),transparent)] pointer-events-none" />
            <h1 className="relative text-2xl font-bold tracking-tight text-white md:text-3xl">
              SPOKEDU iiWarmup
            </h1>
            <p className="relative mt-2 text-lg font-medium text-neutral-200">
              이번 주 웜업을 약 10분 만에 완주해요
            </p>
            <p className="relative mt-1 text-sm text-neutral-400">
              아이들이 &apos;따라하기&apos;가 아니라 &apos;미션&apos;으로 몰입하도록 설계했어요
            </p>
          </header>

          <section
            className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 to-neutral-900/40 p-5 backdrop-blur-sm ring-1 ring-neutral-800/50 transition-all duration-200 hover:border-cyan-500/30 hover:ring-cyan-500/20"
            aria-label="이번 주 프로그램"
          >
            <span className="inline-block rounded-full bg-gradient-to-r from-cyan-500/25 to-blue-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/30">
              이번 주
            </span>
            <p className="mt-3 text-lg font-semibold text-white">{formatWeekLabel(weekKey)}</p>
            {viewState === 'ready' && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} strokeWidth={2} className="shrink-0 text-neutral-500" />
                  약 10분
                </span>
                <span>띵크 · 챌린지 · 플로우</span>
                {challengeProps.initialBpm != null && challengeProps.initialBpm > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Music2 size={14} strokeWidth={2} className="shrink-0 text-neutral-500" />
                    {challengeProps.initialBpm} BPM
                  </span>
                )}
              </div>
            )}
          </section>

          {viewState === 'empty' && (
            <EmptyState weekLabel={formatWeekLabel(weekKey)} />
          )}

          {(viewState === 'ready' || viewState === 'completed') && (
            <section aria-label="전체 웜업">
              <PhaseControls
                onStart={handleStart}
                disabled={viewState === 'completed'}
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
          renderPlay={({ onEnd }) => (
            <SpokeduRhythmGame
              allowEdit={false}
              autoStart
              onEnd={onEnd}
              initialBpm={challengeProps.initialBpm}
              initialLevel={challengeProps.initialLevel}
              initialGrid={challengeProps.initialGrid}
              initialLevelData={challengeProps.initialLevelData}
              bgmPath={scheduleData?.challengeBgmPath ?? undefined}
              bgmStartOffsetMs={scheduleData?.challengeBgmStartOffsetMs ?? 0}
              bgmSourceBpm={scheduleData?.challengeBgmSourceBpm ?? undefined}
            />
          )}
          renderThink={({ weekKey: wk, onEnd }) => (
            <ThinkPhaseWrapper
              weekKey={wk}
              onEnd={onEnd}
              scheduleSnapshot={thinkSnapshot}
              thinkPackByMonthAndWeek={scheduleData?.thinkPackByMonthAndWeek ?? undefined}
              thinkResolvedConfig={scheduleData?.thinkResolvedConfig ?? undefined}
              thinkPackForThisWeek={scheduleData?.thinkPackForThisWeek ?? undefined}
              month={undefined}
              hideProgressBar
            />
          )}
          renderFlow={({ weekKey: wk, onEnd, showLevelSelector }) => (
            <FlowFrame weekKey={wk} onEnd={onEnd} autoStart showLevelSelector={showLevelSelector} />
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
