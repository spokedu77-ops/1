'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer, LayoutList, Shuffle, Users, RefreshCw, ListOrdered } from 'lucide-react';
import { useStudentStore, balanceTeams, type Student } from '../hooks/useStudentStore';
import { trackSpokeduProEvent } from '../utils/spokeduProAnalytics';

type TabId = 'stopwatch' | 'scoreboard' | 'picker' | 'teams' | 'order';

// ── 술래 정하기 탭 ───────────────────────────────────────────────────
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
      const filtered = presentStudents.filter((s) => s.id !== previousPickerId);
      if (filtered.length > 0) pool = filtered;
    }
    setSpinning(true);
    setPicked(null);

    let count = 0;
    const maxCount = 20;
    const interval = setInterval(() => {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setDisplay(rand.name);
      count++;
      if (count >= maxCount) {
        clearInterval(interval);
        const final = pool[Math.floor(Math.random() * pool.length)];
        setPicked(final);
        setDisplay(final.name);
        setPreviousPickerId(final.id);
        setSpinning(false);
        try {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(12);
          }
        } catch {
          /* ignore */
        }
        trackSpokeduProEvent('spokedu_pro_assistant_picker_run', { presentCount: presentStudents.length });
      }
    }, 80);
  }, [presentStudents, excludePreviousPicker, previousPickerId]);

  if (presentStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <Users className="w-7 h-7 text-slate-600" />
        </div>
        <p className="text-white font-black text-lg">{tr('출석한 원생이 없습니다')}</p>
        <p className="text-slate-400 text-sm max-w-xs">
          {tr('원생 관리 탭에서 원생을 등록하고 출석 처리를 먼저 해주세요.')}
        </p>
        {onGoToDataCenter && (
          <button
            type="button"
            onClick={onGoToDataCenter}
            className="mt-2 min-h-[44px] px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors"
          >
            {tr('원생 관리에서 출석 처리하기')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
        {tr('출석 인원')} {presentStudents.length}{tr('명 중 술래 선택')}
      </p>

      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none max-w-md text-center">
        <input
          type="checkbox"
          checked={excludePreviousPicker}
          onChange={(e) => setExcludePreviousPicker(e.target.checked)}
          className="rounded border-slate-600 text-amber-500 shrink-0"
        />
        <span>{tr('직전에 뽑은 술래는 제외하고 다시 뽑기')}</span>
      </label>

      {/* 결과 박스 */}
      <div className="w-full max-w-md min-h-[180px] bg-slate-800/60 border-2 border-slate-700 rounded-3xl flex flex-col items-center justify-center p-8">
        {(spinning || picked) ? (
          <div className="text-center space-y-3">
            <div className={`text-7xl font-black text-white ${spinning ? 'opacity-60' : ''} transition-opacity`}>
              {display}
            </div>
            {!spinning && picked && (
              <>
                <div className="text-blue-400 font-bold text-sm">{picked.classGroup}</div>
                <div className="inline-block mt-2 px-4 py-1.5 bg-red-500 text-white font-black text-sm rounded-full">
                  {tr('🎯 술래!')}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center space-y-2">
            <div className="text-6xl mb-4">🎲</div>
            <p className="text-slate-400 font-medium">{tr('버튼을 눌러 술래를 정하세요')}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handlePick}
        disabled={spinning}
        className="flex items-center gap-3 min-h-[44px] px-12 py-5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xl rounded-2xl transition-colors shadow-lg"
      >
        <Shuffle className="w-6 h-6" />
        {spinning ? tr('뽑는 중...') : tr('술래 정하기')}
      </button>

      {/* 출석 명단 */}
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {presentStudents.map((s) => (
          <span
            key={s.id}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              picked?.id === s.id
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 팀 나누기 탭 ─────────────────────────────────────────────────────
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

  if (presentStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <Users className="w-7 h-7 text-slate-600" />
        </div>
        <p className="text-white font-black text-lg">{tr('출석한 원생이 없습니다')}</p>
        <p className="text-slate-400 text-sm max-w-xs">
          {tr('원생 관리 탭에서 원생을 등록하고 출석 처리를 먼저 해주세요.')}
        </p>
        {onGoToDataCenter && (
          <button
            type="button"
            onClick={onGoToDataCenter}
            className="mt-2 min-h-[44px] px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors"
          >
            {tr('원생 관리에서 출석 처리하기')}
          </button>
        )}
      </div>
    );
  }

  const scoreSum = (arr: Student[]) =>
    arr.reduce((acc, s) => acc + Object.values(s.physical).reduce((a, b) => a + b, 0), 0);

  return (
    <div className="flex flex-col items-center h-full gap-6 px-6 pt-6 pb-8 overflow-y-auto">
      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
        {tr('출석')} {presentStudents.length}{tr('명 팀 배분')}
      </p>

      <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 w-full max-w-xl">
        <button
          type="button"
          onClick={handleBalance}
          className="flex min-h-[44px] flex-1 min-w-[10rem] items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg text-sm"
        >
          ⚖️ {tr('신체 기능 균형 배분')}
        </button>
        <button
          type="button"
          onClick={handleRandom}
          className="flex min-h-[44px] flex-1 min-w-[10rem] items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors text-sm"
        >
          <Shuffle className="w-4 h-4" /> {tr('랜덤 배분')}
        </button>
      </div>

      {teams ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {/* A팀 */}
          <div className="bg-red-900/20 border-2 border-red-500/40 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                value={teamNames.a}
                onChange={(e) => setTeamNames((t) => ({ ...t, a: e.target.value }))}
                className="text-red-400 font-black text-lg bg-transparent border-b border-red-500/40 focus:outline-none w-20"
              />
              <span className="text-xs text-red-400/60 font-bold">{tr('점수')} {scoreSum(teams.teamA)}</span>
            </div>
            <div className="space-y-2">
              {teams.teamA.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-red-900/20 rounded-xl px-3 py-2">
                  <span className="text-white font-bold text-sm">{s.name}</span>
                  <span className="text-red-400/60 text-xs">
                    {Object.values(s.physical).reduce((a, b) => a + b, 0)}pt
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* B팀 */}
          <div className="bg-blue-900/20 border-2 border-blue-500/40 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                value={teamNames.b}
                onChange={(e) => setTeamNames((t) => ({ ...t, b: e.target.value }))}
                className="text-blue-400 font-black text-lg bg-transparent border-b border-blue-500/40 focus:outline-none w-20"
              />
              <span className="text-xs text-blue-400/60 font-bold">{tr('점수')} {scoreSum(teams.teamB)}</span>
            </div>
            <div className="space-y-2">
              {teams.teamB.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-blue-900/20 rounded-xl px-3 py-2">
                  <span className="text-white font-bold text-sm">{s.name}</span>
                  <span className="text-blue-400/60 text-xs">
                    {Object.values(s.physical).reduce((a, b) => a + b, 0)}pt
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 균형도: 좁은 화면에서 wrap 되도록 */}
          <div className="col-span-2 bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400 font-bold shrink-0">{tr('팀 균형도')}</span>
            <div className="flex-1 min-w-[120px] h-3 bg-slate-700 rounded-full overflow-hidden flex">
              {(() => {
                const total = scoreSum(teams.teamA) + scoreSum(teams.teamB);
                const aPct = total === 0 ? 50 : Math.round((scoreSum(teams.teamA) / total) * 100);
                return (
                  <>
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${aPct}%` }} />
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${100 - aPct}%` }} />
                  </>
                );
              })()}
            </div>
            <span className="text-xs font-bold text-slate-300 shrink-0">
              {scoreSum(teams.teamA)} : {scoreSum(teams.teamB)}
            </span>
          </div>
          <div className="col-span-2 flex flex-wrap justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleBalance}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors"
            >
              {tr('팀 다시 나누기 (균형)')}
            </button>
            <button
              type="button"
              onClick={handleRandom}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors"
            >
              {tr('팀 다시 나누기 (랜덤)')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-5xl mb-2">⚖️</div>
          <p className="text-slate-400 font-medium text-sm leading-relaxed">
            {tr('위 버튼을 눌러 팀을 나누세요.')}
            <br />
            <span className="text-blue-400">
              {tr('신체 기능 균형 배분은 원생 관리에서 입력한 신체 기능 점수를 기반으로 합니다.')}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── 순서 정하기 탭 ─────────────────────────────────────────────────────
function OrderTab({ presentStudents, onGoToDataCenter }: { presentStudents: Student[]; onGoToDataCenter?: () => void }) {
  const tr = useTranslator();
  const [ordered, setOrdered] = useState<Student[]>([]);
  const studentKey = presentStudents.map((s) => s.id).join('|');

  const reshuffle = useCallback(() => {
    setOrdered([...presentStudents].sort(() => Math.random() - 0.5));
  }, [presentStudents]);

  useEffect(() => {
    reshuffle();
  }, [studentKey, reshuffle]);

  if (presentStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <Users className="w-7 h-7 text-slate-600" />
        </div>
        <p className="text-white font-black text-lg">{tr('출석한 원생이 없습니다')}</p>
        <p className="text-slate-400 text-sm max-w-xs">
          {tr('원생 관리 탭에서 원생을 등록하고 출석 처리를 먼저 해주세요.')}
        </p>
        {onGoToDataCenter && (
          <button
            type="button"
            onClick={onGoToDataCenter}
            className="mt-2 min-h-[44px] px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors"
          >
            {tr('원생 관리에서 출석 처리하기')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 px-4 py-6 overflow-y-auto">
      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest text-center mb-4">
        {tr('발표·게임 순서')} · {presentStudents.length}
        {tr('명')}
      </p>
      <button
        type="button"
        onClick={reshuffle}
        className="min-h-[44px] self-center mb-6 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors"
      >
        {tr('순서 다시 섞기')}
      </button>
      <ol className="max-w-md mx-auto w-full space-y-2 list-none">
        {ordered.map((s, i) => (
          <li
            key={`${s.id}-${i}`}
            className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400 font-black text-sm">
              {i + 1}
            </span>
            <span className="text-white font-bold truncate">{s.name}</span>
            <span className="text-slate-500 text-xs shrink-0">{s.classGroup}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function AssistantToolsView({
  onGoToDataCenter,
  focusStopwatchToken = 0,
}: {
  onGoToDataCenter?: () => void;
  /** 값이 바뀔 때마다 스톱워치 탭으로 포커스 (대시보드「수업 시작」등). */
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
    if (team === 'red') setScoreRed((s) => Math.max(0, s + delta));
    else setScoreBlue((s) => Math.max(0, s + delta));
  }, []);

  const minutes = Math.floor(stopwatchMs / 60000);
  const seconds = Math.floor((stopwatchMs % 60000) / 1000);
  const centis = Math.floor((stopwatchMs % 1000) / 10);

  const TABS: { id: TabId; label: string; icon: React.ElementType; iconClass?: string }[] = [
    { id: 'stopwatch', label: '스톱워치', icon: Timer },
    { id: 'scoreboard', label: '점수판', icon: LayoutList },
    { id: 'picker', label: '술래 정하기', icon: Shuffle, iconClass: 'text-red-400' },
    { id: 'teams', label: '팀 나누기', icon: Users, iconClass: 'text-blue-400' },
    { id: 'order', label: '순서 정하기', icon: ListOrdered, iconClass: 'text-amber-400' },
  ];

  return (
    <section className="flex flex-col h-full min-h-0 bg-[#0F172A]">
      {/* 탭 바 */}
      <div className="shrink-0 flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon, iconClass }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-[44px] items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === id
                ? 'border-amber-400 text-amber-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <Icon className={`w-4 h-4 ${tab === id ? 'text-amber-400' : (iconClass ?? 'text-slate-400')}`} />
            {tr(label)}
            {(id === 'picker' || id === 'teams' || id === 'order') && presentStudents.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                {presentStudents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loaded && syncError && (
        <div className="shrink-0 px-4 py-2.5 bg-red-950/85 border-b border-red-800/50 flex flex-wrap items-center gap-2 text-sm text-red-100">
          <p className="flex-1 min-w-[200px]">
            {tr('원생·출결 정보를 불러오지 못했습니다.')}{' '}
            <span className="text-red-300/90 font-mono text-xs">({syncError})</span>
          </p>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void refetch()}
            className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-lg bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {tr('다시 시도')}
          </button>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'stopwatch' && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="w-full max-w-4xl flex flex-col items-center justify-center">
              <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-6">{tr('수업 진행 타이머')}</p>
              <div className="font-mono text-[clamp(4rem,18vw,12rem)] font-black text-white tracking-tighter tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}.{String(centis).padStart(2, '0')}
              </div>
              <div className="flex gap-4 mt-10">
                <button
                  type="button"
                  onClick={() => setStopwatchRunning((r) => !r)}
                  className="flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl transition-colors shadow-lg"
                >
                  {stopwatchRunning
                    ? <Pause className="w-6 h-6 fill-current" />
                    : <Play className="w-6 h-6 fill-current" />}
                  {stopwatchRunning ? tr('일시정지') : tr('시작')}
                </button>
                <button
                  type="button"
                  onClick={() => { setStopwatchRunning(false); setStopwatchMs(0); }}
                  className="flex items-center gap-3 px-10 py-5 bg-slate-700 hover:bg-slate-600 text-white font-black text-lg rounded-2xl transition-colors"
                >
                  <RotateCcw className="w-6 h-6" />
                  {tr('리셋')}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'scoreboard' && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="w-full max-w-5xl grid grid-cols-2 gap-8 lg:gap-12">
              <div className="bg-red-900/20 border-2 border-red-500/50 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center min-h-[280px]">
                <p className="text-red-400 font-black text-sm uppercase tracking-widest mb-6">{tr('A 팀')}</p>
                <div className="text-[clamp(4rem,15vw,10rem)] font-black text-white tabular-nums leading-none">
                  {scoreRed}
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => updateScore('red', -1)}
                    className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-black text-2xl flex items-center justify-center transition-colors"
                  >−</button>
                  <button
                    type="button"
                    onClick={() => updateScore('red', 1)}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-2xl flex items-center justify-center transition-colors"
                  >+</button>
                </div>
              </div>
              <div className="bg-blue-900/20 border-2 border-blue-500/50 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center min-h-[280px]">
                <p className="text-blue-400 font-black text-sm uppercase tracking-widest mb-6">{tr('B 팀')}</p>
                <div className="text-[clamp(4rem,15vw,10rem)] font-black text-white tabular-nums leading-none">
                  {scoreBlue}
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => updateScore('blue', -1)}
                    className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-black text-2xl flex items-center justify-center transition-colors"
                  >−</button>
                  <button
                    type="button"
                    onClick={() => updateScore('blue', 1)}
                    className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-2xl flex items-center justify-center transition-colors"
                  >+</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'picker' && <PickerTab presentStudents={presentStudents} onGoToDataCenter={onGoToDataCenter} />}
        {tab === 'teams' && <TeamsTab presentStudents={presentStudents} onGoToDataCenter={onGoToDataCenter} />}
        {tab === 'order' && <OrderTab presentStudents={presentStudents} onGoToDataCenter={onGoToDataCenter} />}
      </div>
    </section>
  );
}
