'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer, LayoutList, Shuffle, Users } from 'lucide-react';
import { useStudentStore, balanceTeams, type Student } from '../hooks/useStudentStore';

type TabId = 'stopwatch' | 'scoreboard' | 'picker' | 'teams';

// ── 술래 정하기 탭 ───────────────────────────────────────────────────
function PickerTab({ presentStudents, onGoToDataCenter }: { presentStudents: Student[]; onGoToDataCenter?: () => void }) {
  const [picked, setPicked] = useState<Student | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState('');

  const handlePick = useCallback(() => {
    if (presentStudents.length === 0) return;
    setSpinning(true);
    setPicked(null);

    let count = 0;
    const maxCount = 20;
    const interval = setInterval(() => {
      const rand = presentStudents[Math.floor(Math.random() * presentStudents.length)];
      setDisplay(rand.name);
      count++;
      if (count >= maxCount) {
        clearInterval(interval);
        const final = presentStudents[Math.floor(Math.random() * presentStudents.length)];
        setPicked(final);
        setDisplay(final.name);
        setSpinning(false);
      }
    }, 80);
  }, [presentStudents]);

  if (presentStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <Users className="w-7 h-7 text-slate-600" />
        </div>
        <p className="text-white font-black text-lg">출석한 원생이 없습니다</p>
        <p className="text-slate-400 text-sm max-w-xs">
          원생 관리 탭에서 원생을 등록하고 출석 처리를 먼저 해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
        출석 인원 {presentStudents.length}명 중 술래 선택
      </p>

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
                  🎯 술래!
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center space-y-2">
            <div className="text-6xl mb-4">🎲</div>
            <p className="text-slate-400 font-medium">버튼을 눌러 술래를 정하세요</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handlePick}
        disabled={spinning}
        className="flex items-center gap-3 px-12 py-5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xl rounded-2xl transition-colors shadow-lg"
      >
        <Shuffle className="w-6 h-6" />
        {spinning ? '뽑는 중...' : '술래 정하기'}
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
        <p className="text-white font-black text-lg">출석한 원생이 없습니다</p>
        <p className="text-slate-400 text-sm max-w-xs">
          원생 관리 탭에서 원생을 등록하고 출석 처리를 먼저 해주세요.
        </p>
        {onGoToDataCenter && (
          <button
            type="button"
            onClick={onGoToDataCenter}
            className="mt-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors"
          >
            원생 관리에서 출석 처리하기
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
        출석 {presentStudents.length}명 팀 배분
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBalance}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg text-sm"
        >
          ⚖️ 신체 기능 균형 배분
        </button>
        <button
          type="button"
          onClick={handleRandom}
          className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors text-sm"
        >
          <Shuffle className="w-4 h-4" /> 랜덤 배분
        </button>
      </div>

      {teams ? (
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
          {/* A팀 */}
          <div className="bg-red-900/20 border-2 border-red-500/40 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                value={teamNames.a}
                onChange={(e) => setTeamNames((t) => ({ ...t, a: e.target.value }))}
                className="text-red-400 font-black text-lg bg-transparent border-b border-red-500/40 focus:outline-none w-20"
              />
              <span className="text-xs text-red-400/60 font-bold">점수 {scoreSum(teams.teamA)}</span>
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
              <span className="text-xs text-blue-400/60 font-bold">점수 {scoreSum(teams.teamB)}</span>
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
            <span className="text-xs text-slate-400 font-bold shrink-0">팀 균형도</span>
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
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-5xl mb-2">⚖️</div>
          <p className="text-slate-400 font-medium text-sm leading-relaxed">
            위 버튼을 눌러 팀을 나누세요.<br />
            <span className="text-blue-400">신체 기능 균형 배분</span>은 원생 관리에서<br />
            입력한 신체 기능 점수를 기반으로 합니다.
          </p>
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function AssistantToolsView({ onGoToDataCenter }: { onGoToDataCenter?: () => void } = {}) {
  const [tab, setTab] = useState<TabId>('stopwatch');
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [scoreRed, setScoreRed] = useState(0);
  const [scoreBlue, setScoreBlue] = useState(0);

  const { presentStudents } = useStudentStore();

  useEffect(() => {
    if (!stopwatchRunning) return;
    const start = Date.now() - stopwatchMs;
    const t = setInterval(() => setStopwatchMs(Date.now() - start), 10);
    return () => clearInterval(t);
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
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === id
                ? 'border-amber-400 text-amber-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <Icon className={`w-4 h-4 ${tab === id ? 'text-amber-400' : (iconClass ?? 'text-slate-400')}`} />
            {label}
            {(id === 'picker' || id === 'teams') && presentStudents.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
                {presentStudents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'stopwatch' && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="w-full max-w-4xl flex flex-col items-center justify-center">
              <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-6">수업 진행 타이머</p>
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
                  {stopwatchRunning ? '일시정지' : '시작'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStopwatchRunning(false); setStopwatchMs(0); }}
                  className="flex items-center gap-3 px-10 py-5 bg-slate-700 hover:bg-slate-600 text-white font-black text-lg rounded-2xl transition-colors"
                >
                  <RotateCcw className="w-6 h-6" />
                  리셋
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'scoreboard' && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="w-full max-w-5xl grid grid-cols-2 gap-8 lg:gap-12">
              <div className="bg-red-900/20 border-2 border-red-500/50 rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center min-h-[280px]">
                <p className="text-red-400 font-black text-sm uppercase tracking-widest mb-6">A 팀</p>
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
                <p className="text-blue-400 font-black text-sm uppercase tracking-widest mb-6">B 팀</p>
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
      </div>
    </section>
  );
}
