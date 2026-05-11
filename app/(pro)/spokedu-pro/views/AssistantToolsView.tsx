'use client';

import type { ElementType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslator } from '@/app/providers/I18nProvider';
import { LayoutList, ListOrdered, Pause, Play, RefreshCw, RotateCcw, Shuffle, Timer, Users } from 'lucide-react';
import { SubscriberBadge, SubscriberButton } from '../components/SubscriberWorkspacePrimitives';
import { balanceTeams, type Student, useStudentStore } from '../hooks/useStudentStore';
import { trackSpokeduProEvent } from '../utils/spokeduProAnalytics';

type TabId = 'stopwatch' | 'scoreboard' | 'picker' | 'teams' | 'order';

function EmptyRoster({ onGoToDataCenter }: { onGoToDataCenter?: () => void }) {
  const tr = useTranslator();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
        <Users className="h-7 w-7 text-slate-600" />
      </div>
      <p className="text-lg font-black text-white">{tr('출석한 학생이 없습니다')}</p>
      <p className="max-w-xs text-sm text-slate-400">
        {tr('학생 관리에서 학생을 등록하고 출석 처리를 먼저 해 주세요.')}
      </p>
      {onGoToDataCenter ? (
        <SubscriberButton tone="purple" onClick={onGoToDataCenter}>
          {tr('학생 관리로 이동')}
        </SubscriberButton>
      ) : null}
    </div>
  );
}

function PickerTab({ presentStudents, onGoToDataCenter }: { presentStudents: Student[]; onGoToDataCenter?: () => void }) {
  const tr = useTranslator();
  const [picked, setPicked] = useState<Student | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState('');
  const [excludePreviousPicker, setExcludePreviousPicker] = useState(false);
  const [previousPickerId, setPreviousPickerId] = useState<string | null>(null);

  const handlePick = useCallback(() => {
    if (presentStudents.length === 0) return;
    let pool = presentStudents;
    if (excludePreviousPicker && previousPickerId) {
      const filtered = presentStudents.filter((student) => student.id !== previousPickerId);
      if (filtered.length > 0) pool = filtered;
    }

    setSpinning(true);
    setPicked(null);

    let count = 0;
    const maxCount = 20;
    const interval = setInterval(() => {
      const randomStudent = pool[Math.floor(Math.random() * pool.length)];
      setDisplay(randomStudent.name);
      count += 1;
      if (count >= maxCount) {
        clearInterval(interval);
        const finalStudent = pool[Math.floor(Math.random() * pool.length)];
        setPicked(finalStudent);
        setDisplay(finalStudent.name);
        setPreviousPickerId(finalStudent.id);
        setSpinning(false);
        try {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(12);
        } catch {
          /* ignore */
        }
        trackSpokeduProEvent('spokedu_pro_assistant_picker_run', { presentCount: presentStudents.length });
      }
    }, 80);
  }, [presentStudents, excludePreviousPicker, previousPickerId]);

  if (presentStudents.length === 0) return <EmptyRoster onGoToDataCenter={onGoToDataCenter} />;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
        {tr('출석 인원')} {presentStudents.length}{tr('명 중 한 명 선택')}
      </p>

      <label className="flex max-w-md cursor-pointer select-none items-center gap-2 text-center text-xs font-bold text-slate-400">
        <input
          type="checkbox"
          checked={excludePreviousPicker}
          onChange={(event) => setExcludePreviousPicker(event.target.checked)}
          className="shrink-0 rounded border-slate-600 text-amber-500"
        />
        <span>{tr('직전에 뽑힌 학생은 제외하고 다시 뽑기')}</span>
      </label>

      <div className="flex min-h-[180px] w-full max-w-md flex-col items-center justify-center rounded-3xl border-2 border-slate-700 bg-slate-800/60 p-8">
        {spinning || picked ? (
          <div className="space-y-3 text-center">
            <div className={`text-6xl font-black text-white transition-opacity sm:text-7xl ${spinning ? 'opacity-60' : ''}`}>
              {display}
            </div>
            {!spinning && picked ? (
              <>
                <div className="text-sm font-bold text-blue-400">{picked.classGroup}</div>
                <SubscriberBadge tone="amber">{tr('이번 차례')}</SubscriberBadge>
              </>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 text-center">
            <Shuffle className="mx-auto mb-4 h-14 w-14 text-red-400" />
            <p className="font-medium text-slate-400">{tr('버튼을 눌러 학생을 정하세요.')}</p>
          </div>
        )}
      </div>

      <SubscriberButton
        tone="red"
        disabled={spinning}
        icon={<Shuffle className="h-6 w-6" />}
        onClick={handlePick}
      >
        {spinning ? tr('뽑는 중...') : tr('학생 뽑기')}
      </SubscriberButton>

      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {presentStudents.map((student) => (
          <span
            key={student.id}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
              picked?.id === student.id
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            {student.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamsTab({ presentStudents, onGoToDataCenter }: { presentStudents: Student[]; onGoToDataCenter?: () => void }) {
  const tr = useTranslator();
  const [teams, setTeams] = useState<{ teamA: Student[]; teamB: Student[] } | null>(null);
  const [teamNames, setTeamNames] = useState({ a: 'A팀', b: 'B팀' });

  const handleBalance = useCallback(() => {
    setTeams(balanceTeams(presentStudents));
  }, [presentStudents]);

  const handleRandom = useCallback(() => {
    const shuffled = [...presentStudents].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    setTeams({ teamA: shuffled.slice(0, mid), teamB: shuffled.slice(mid) });
  }, [presentStudents]);

  const scoreSum = useCallback((students: Student[]) => (
    students.reduce((acc, student) => acc + Object.values(student.physical).reduce((a, b) => a + b, 0), 0)
  ), []);

  if (presentStudents.length === 0) return <EmptyRoster onGoToDataCenter={onGoToDataCenter} />;

  return (
    <div className="flex h-full flex-col items-center gap-6 overflow-y-auto px-6 pb-8 pt-6">
      <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
        {tr('출석')} {presentStudents.length}{tr('명 팀 배분')}
      </p>

      <div className="flex w-full max-w-xl flex-col flex-wrap justify-center gap-3 sm:flex-row">
        <SubscriberButton tone="blue" wide icon={<Users className="h-4 w-4" />} onClick={handleBalance}>
          {tr('신체 기능 균형 배분')}
        </SubscriberButton>
        <SubscriberButton tone="slate" wide icon={<Shuffle className="h-4 w-4" />} onClick={handleRandom}>
          {tr('랜덤 배분')}
        </SubscriberButton>
      </div>

      {teams ? (
        <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <TeamPanel
            tone="red"
            name={teamNames.a}
            students={teams.teamA}
            score={scoreSum(teams.teamA)}
            onNameChange={(value) => setTeamNames((current) => ({ ...current, a: value }))}
          />
          <TeamPanel
            tone="blue"
            name={teamNames.b}
            students={teams.teamB}
            score={scoreSum(teams.teamB)}
            onNameChange={(value) => setTeamNames((current) => ({ ...current, b: value }))}
          />

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4 sm:col-span-2">
            <span className="shrink-0 text-xs font-bold text-slate-400">{tr('팀 균형')}</span>
            <div className="flex h-3 min-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-700">
              {(() => {
                const aScore = scoreSum(teams.teamA);
                const bScore = scoreSum(teams.teamB);
                const total = aScore + bScore;
                const aPct = total === 0 ? 50 : Math.round((aScore / total) * 100);
                return (
                  <>
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${aPct}%` }} />
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${100 - aPct}%` }} />
                  </>
                );
              })()}
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-300">
              {scoreSum(teams.teamA)} : {scoreSum(teams.teamB)}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1 sm:col-span-2">
            <SubscriberButton tone="slate" size="sm" onClick={handleBalance}>
              {tr('균형으로 다시 나누기')}
            </SubscriberButton>
            <SubscriberButton tone="slate" size="sm" onClick={handleRandom}>
              {tr('랜덤으로 다시 나누기')}
            </SubscriberButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Users className="mb-2 h-14 w-14 text-blue-400" />
          <p className="text-sm font-medium leading-relaxed text-slate-400">
            {tr('버튼을 눌러 팀을 나누세요.')}
            <br />
            <span className="text-blue-400">{tr('균형 배분은 학생 관리의 신체 기능 점수를 기준으로 합니다.')}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function TeamPanel({
  tone,
  name,
  students,
  score,
  onNameChange,
}: {
  tone: 'red' | 'blue';
  name: string;
  students: Student[];
  score: number;
  onNameChange: (value: string) => void;
}) {
  const tr = useTranslator();
  const color = tone === 'red' ? 'red' : 'blue';

  return (
    <div className={`rounded-2xl border-2 p-5 ${color === 'red' ? 'border-red-500/40 bg-red-900/20' : 'border-blue-500/40 bg-blue-900/20'}`}>
      <div className="mb-4 flex items-center justify-between">
        <input
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className={`w-20 border-b bg-transparent text-lg font-black outline-none ${
            color === 'red' ? 'border-red-500/40 text-red-400' : 'border-blue-500/40 text-blue-400'
          }`}
        />
        <span className={`text-xs font-bold ${color === 'red' ? 'text-red-400/60' : 'text-blue-400/60'}`}>
          {tr('점수')} {score}
        </span>
      </div>
      <div className="space-y-2">
        {students.map((student) => (
          <div key={student.id} className={`flex items-center justify-between rounded-xl px-3 py-2 ${color === 'red' ? 'bg-red-900/20' : 'bg-blue-900/20'}`}>
            <span className="text-sm font-bold text-white">{student.name}</span>
            <span className={`text-xs ${color === 'red' ? 'text-red-400/60' : 'text-blue-400/60'}`}>
              {Object.values(student.physical).reduce((a, b) => a + b, 0)}pt
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderTab({ presentStudents, onGoToDataCenter }: { presentStudents: Student[]; onGoToDataCenter?: () => void }) {
  const tr = useTranslator();
  const [ordered, setOrdered] = useState<Student[]>([]);
  const studentKey = presentStudents.map((student) => student.id).join('|');

  const reshuffle = useCallback(() => {
    setOrdered([...presentStudents].sort(() => Math.random() - 0.5));
  }, [presentStudents]);

  useEffect(() => {
    reshuffle();
  }, [studentKey, reshuffle]);

  if (presentStudents.length === 0) return <EmptyRoster onGoToDataCenter={onGoToDataCenter} />;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-6">
      <p className="mb-4 text-center text-sm font-bold uppercase tracking-widest text-slate-400">
        {tr('발표·게임 순서')} · {presentStudents.length}{tr('명')}
      </p>
      <SubscriberButton tone="amber" className="mb-6 self-center" onClick={reshuffle}>
        {tr('순서 다시 섞기')}
      </SubscriberButton>
      <ol className="mx-auto w-full max-w-md space-y-2">
        {ordered.map((student, index) => (
          <li
            key={`${student.id}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-black text-amber-400">
              {index + 1}
            </span>
            <span className="truncate font-bold text-white">{student.name}</span>
            <span className="shrink-0 text-xs text-slate-500">{student.classGroup}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function AssistantToolsView({
  onGoToDataCenter,
  focusStopwatchToken = 0,
}: {
  onGoToDataCenter?: () => void;
  focusStopwatchToken?: number;
} = {}) {
  const tr = useTranslator();
  const [tab, setTab] = useState<TabId>('stopwatch');
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [scoreRed, setScoreRed] = useState(0);
  const [scoreBlue, setScoreBlue] = useState(0);

  const { presentStudents, loaded, syncing, syncError, refetch } = useStudentStore();

  useEffect(() => {
    if (focusStopwatchToken > 0) setTab('stopwatch');
  }, [focusStopwatchToken]);

  useEffect(() => {
    if (!stopwatchRunning) return;
    const start = Date.now() - stopwatchMs;
    const timerId = setInterval(() => setStopwatchMs(Date.now() - start), 10);
    return () => clearInterval(timerId);
  }, [stopwatchRunning, stopwatchMs]);

  const updateScore = useCallback((team: 'red' | 'blue', delta: number) => {
    if (team === 'red') setScoreRed((score) => Math.max(0, score + delta));
    else setScoreBlue((score) => Math.max(0, score + delta));
  }, []);

  const minutes = Math.floor(stopwatchMs / 60000);
  const seconds = Math.floor((stopwatchMs % 60000) / 1000);
  const centis = Math.floor((stopwatchMs % 1000) / 10);

  const tabs = useMemo<{ id: TabId; label: string; icon: ElementType; iconClass?: string }[]>(
    () => [
      { id: 'stopwatch', label: '스톱워치', icon: Timer },
      { id: 'scoreboard', label: '점수판', icon: LayoutList },
      { id: 'picker', label: '학생 뽑기', icon: Shuffle, iconClass: 'text-red-400' },
      { id: 'teams', label: '팀 나누기', icon: Users, iconClass: 'text-blue-400' },
      { id: 'order', label: '순서 정하기', icon: ListOrdered, iconClass: 'text-amber-400' },
    ],
    []
  );

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0F172A]">
      <div className="flex shrink-0 overflow-x-auto border-b border-slate-800 bg-slate-900/50">
        {tabs.map(({ id, label, icon: Icon, iconClass }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-6 py-3 text-sm font-bold transition-colors ${
              tab === id
                ? 'border-amber-400 bg-slate-800/50 text-amber-400'
                : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-white'
            }`}
          >
            <Icon className={`h-4 w-4 ${tab === id ? 'text-amber-400' : iconClass ?? 'text-slate-400'}`} />
            {tr(label)}
            {(id === 'picker' || id === 'teams' || id === 'order') && presentStudents.length > 0 ? (
              <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                {presentStudents.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loaded && syncError ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-red-800/50 bg-red-950/85 px-4 py-2.5 text-sm text-red-100">
          <p className="min-w-[200px] flex-1">
            {tr('학생·출석 정보를 불러오지 못했습니다.')}{' '}
            <span className="font-mono text-xs text-red-300/90">({syncError})</span>
          </p>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void refetch()}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-red-800 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {tr('다시 시도')}
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'stopwatch' ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="flex w-full max-w-4xl flex-col items-center justify-center">
              <p className="mb-6 text-sm font-bold uppercase tracking-widest text-slate-500">{tr('수업 진행 타이머')}</p>
              <div className="font-mono text-[clamp(4rem,18vw,12rem)] font-black tabular-nums tracking-tighter text-white">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}.{String(centis).padStart(2, '0')}
              </div>
              <div className="mt-10 flex gap-4">
                <SubscriberButton
                  tone="blue"
                  className="px-10 py-5 text-lg"
                  icon={stopwatchRunning ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                  onClick={() => setStopwatchRunning((running) => !running)}
                >
                  {stopwatchRunning ? tr('일시정지') : tr('시작')}
                </SubscriberButton>
                <SubscriberButton
                  tone="slate"
                  className="px-10 py-5 text-lg"
                  icon={<RotateCcw className="h-6 w-6" />}
                  onClick={() => {
                    setStopwatchRunning(false);
                    setStopwatchMs(0);
                  }}
                >
                  {tr('리셋')}
                </SubscriberButton>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'scoreboard' ? (
          <Scoreboard scoreRed={scoreRed} scoreBlue={scoreBlue} onUpdateScore={updateScore} />
        ) : null}

        {tab === 'picker' ? <PickerTab presentStudents={presentStudents} onGoToDataCenter={onGoToDataCenter} /> : null}
        {tab === 'teams' ? <TeamsTab presentStudents={presentStudents} onGoToDataCenter={onGoToDataCenter} /> : null}
        {tab === 'order' ? <OrderTab presentStudents={presentStudents} onGoToDataCenter={onGoToDataCenter} /> : null}
      </div>
    </section>
  );
}

function Scoreboard({
  scoreRed,
  scoreBlue,
  onUpdateScore,
}: {
  scoreRed: number;
  scoreBlue: number;
  onUpdateScore: (team: 'red' | 'blue', delta: number) => void;
}) {
  const tr = useTranslator();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="grid w-full max-w-5xl grid-cols-2 gap-8 lg:gap-12">
        <ScorePanel label="A팀" score={scoreRed} tone="red" onMinus={() => onUpdateScore('red', -1)} onPlus={() => onUpdateScore('red', 1)} />
        <ScorePanel label="B팀" score={scoreBlue} tone="blue" onMinus={() => onUpdateScore('blue', -1)} onPlus={() => onUpdateScore('blue', 1)} />
      </div>
      <span className="sr-only">{tr('점수판')}</span>
    </div>
  );
}

function ScorePanel({
  label,
  score,
  tone,
  onMinus,
  onPlus,
}: {
  label: string;
  score: number;
  tone: 'red' | 'blue';
  onMinus: () => void;
  onPlus: () => void;
}) {
  const tr = useTranslator();
  const isRed = tone === 'red';

  return (
    <div className={`flex min-h-[280px] flex-col items-center justify-center rounded-3xl border-2 p-8 lg:p-12 ${isRed ? 'border-red-500/50 bg-red-900/20' : 'border-blue-500/50 bg-blue-900/20'}`}>
      <p className={`mb-6 text-sm font-black uppercase tracking-widest ${isRed ? 'text-red-400' : 'text-blue-400'}`}>{tr(label)}</p>
      <div className="text-[clamp(4rem,15vw,10rem)] font-black leading-none tabular-nums text-white">{score}</div>
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={onMinus}
          aria-label={`${label} ${tr('점수 빼기')}`}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700 text-2xl font-black text-white transition-colors hover:bg-slate-600"
        >
          -
        </button>
        <button
          type="button"
          onClick={onPlus}
          aria-label={`${label} ${tr('점수 더하기')}`}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black text-white transition-colors ${isRed ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
