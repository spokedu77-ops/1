'use client';

/**
 * 구독자용 IIWARMUP 페이지
 * 연/월/주차 선택 + 4버튼 (전체/Play/Think/Flow) + FullSequencePlayer
 */

import { useMemo, useState } from 'react';
import { generateWeekKey } from '@/app/lib/admin/assets/storagePaths';
import { WeekSelector } from '@/app/components/subscriber/WeekSelector';
import { PhaseControls, type PlayMode } from '@/app/components/subscriber/PhaseControls';
import { FullSequencePlayer } from '@/app/components/subscriber/FullSequencePlayer';
import { PlayRuntimeWrapper } from '@/app/components/subscriber/PlayRuntimeWrapper';
import { ThinkPhaseWrapper } from '@/app/components/subscriber/ThinkPhaseWrapper';
import { FlowFrame } from '@/app/components/subscriber/FlowFrame';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

export default function IIWarmupSubscriberPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [week, setWeek] = useState(1);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);

  const weekKey = useMemo(
    () => generateWeekKey(year, month, week),
    [year, month, week]
  );

  const handleStart = (mode: PlayMode) => {
    setPlayMode(mode);
  };

  const handlePhaseEnd = () => {
    setPlayMode(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl space-y-8 px-5 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            I.I. Warm-up
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Play → Think → Flow 순서로 진행되는 몰입형 웜업
          </p>
        </header>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur-sm">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-500">
            프로그램 선택
          </h2>
          <WeekSelector
            year={year}
            month={month}
            week={week}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onWeekChange={setWeek}
          />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-500">
            재생 모드
          </h2>
          <PhaseControls onStart={handleStart} disabled={!!playMode} />
        </section>
      </div>

      {playMode && (
        <FullSequencePlayer
          weekKey={weekKey}
          mode={playMode}
          onPhaseChange={(p) => {
            if (p === 'end') handlePhaseEnd();
          }}
          renderPlay={({ weekKey: wk, onEnd }) => (
            <PlayRuntimeWrapper weekKey={wk} onEnd={onEnd} />
          )}
          renderThink={({ weekKey: wk, onEnd }) => (
            <ThinkPhaseWrapper weekKey={wk} onEnd={onEnd} />
          )}
          renderFlow={({ weekKey: wk, onEnd }) => (
            <FlowFrame weekKey={wk} onEnd={onEnd} />
          )}
        />
      )}
    </div>
  );
}
