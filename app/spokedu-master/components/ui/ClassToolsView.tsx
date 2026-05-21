'use client';

import { FileText, LayoutList, ListOrdered, Pause, Play, RotateCcw, Shuffle, Timer, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMasterStore } from '../../store';
import type { StudentProfile } from '../../types';

type TabId = 'stopwatch' | 'scoreboard' | 'picker' | 'teams' | 'order';

const TABS: { id: TabId; label: string; icon: typeof Timer }[] = [
  { id: 'stopwatch', label: '타이머', icon: Timer },
  { id: 'scoreboard', label: '점수판', icon: LayoutList },
  { id: 'picker', label: '무작위 선택', icon: Shuffle },
  { id: 'teams', label: '팀 나누기', icon: Users },
  { id: 'order', label: '진행 순서', icon: ListOrdered },
];

const SAMPLE_STUDENTS: StudentProfile[] = [
  { id: 'sample-1', name: '민준', group: 'A그룹', meta: '', level: '', attendance: 0, classes: 0, streak: 0, risk: null, skills: [{ label: '균형', value: 72, delta: '+4' }], badges: [], history: [] },
  { id: 'sample-2', name: '서연', group: 'A그룹', meta: '', level: '', attendance: 0, classes: 0, streak: 0, risk: null, skills: [{ label: '반응', value: 81, delta: '+6' }], badges: [], history: [] },
  { id: 'sample-3', name: '지호', group: 'B그룹', meta: '', level: '', attendance: 0, classes: 0, streak: 0, risk: null, skills: [{ label: '협동', value: 68, delta: '+2' }], badges: [], history: [] },
  { id: 'sample-4', name: '하윤', group: 'B그룹', meta: '', level: '', attendance: 0, classes: 0, streak: 0, risk: null, skills: [{ label: '민첩', value: 76, delta: '+5' }], badges: [], history: [] },
];

function ActionButton({
  onClick,
  disabled,
  accent,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 min-w-[132px] items-center justify-center gap-2 rounded-[14px] px-6 text-[14px] font-black text-white transition-opacity disabled:opacity-40"
      style={{ background: accent ?? 'var(--spm-acc)', boxShadow: `0 8px 24px ${accent ?? 'rgba(99,102,241,0.3)'}40` }}
    >
      {children}
    </button>
  );
}

function formatMs(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

function StopwatchTab() {
  const timerMs = useMasterStore((state) => state.classTimerMs);
  const timerRunning = useMasterStore((state) => state.classTimerRunning);
  const timerStartedAt = useMasterStore((state) => state.classTimerStartedAt);
  const timerStart = useMasterStore((state) => state.classTimerStart);
  const timerStop = useMasterStore((state) => state.classTimerStop);
  const timerReset = useMasterStore((state) => state.classTimerReset);
  const [displayMs, setDisplayMs] = useState(timerMs);

  useEffect(() => {
    if (!timerRunning) {
      setDisplayMs(timerMs);
      return;
    }

    const update = () => setDisplayMs(timerMs + (timerStartedAt ? Date.now() - timerStartedAt : 0));
    update();
    const id = window.setInterval(update, 80);
    return () => window.clearInterval(id);
  }, [timerMs, timerRunning, timerStartedAt]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 p-8">
      <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-t3)' }}>수업 진행 타이머</p>
      <div
        className="font-mono text-[clamp(4rem,20vw,9rem)] font-black tabular-nums leading-none"
        style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}
      >
        {formatMs(displayMs)}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <ActionButton onClick={timerRunning ? timerStop : timerStart} accent={timerRunning ? 'rgba(239,68,68,0.85)' : 'var(--spm-acc)'}>
          {timerRunning ? <><Pause size={18} fill="currentColor" />일시정지</> : <><Play size={18} fill="currentColor" />시작</>}
        </ActionButton>
        <button
          type="button"
          onClick={() => {
            timerReset();
            setDisplayMs(0);
          }}
          className="flex h-14 items-center gap-2 rounded-[14px] px-6 text-[14px] font-black"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
        >
          <RotateCcw size={16} />초기화
        </button>
      </div>
    </div>
  );
}

function ScorePanel({ label, score, tone, onPlus, onMinus }: { label: string; score: number; tone: 'red' | 'blue'; onPlus: () => void; onMinus: () => void }) {
  const colors = tone === 'red'
    ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.28)', text: 'var(--spm-red)' }
    : { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.28)', text: '#60a5fa' };

  return (
    <div className="flex flex-col items-center gap-5 rounded-[22px] p-6" style={{ background: colors.bg, border: `1.5px solid ${colors.border}` }}>
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: colors.text }}>{label}</p>
      <div className="text-[clamp(4rem,16vw,8rem)] font-black tabular-nums leading-none" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{score}</div>
      <div className="flex gap-3">
        <button type="button" onClick={onMinus} className="grid h-14 w-14 place-items-center rounded-full text-[24px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>-</button>
        <button type="button" onClick={onPlus} className="grid h-14 w-14 place-items-center rounded-full text-[24px] font-black text-white" style={{ background: colors.text }}>+</button>
      </div>
    </div>
  );
}

function ScoreboardTab() {
  const [red, setRed] = useState(0);
  const [blue, setBlue] = useState(0);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="grid w-full max-w-[560px] grid-cols-2 gap-4">
        <ScorePanel label="A팀" score={red} tone="red" onPlus={() => setRed((score) => score + 1)} onMinus={() => setRed((score) => Math.max(0, score - 1))} />
        <ScorePanel label="B팀" score={blue} tone="blue" onPlus={() => setBlue((score) => score + 1)} onMinus={() => setBlue((score) => Math.max(0, score - 1))} />
      </div>
      <button type="button" onClick={() => { setRed(0); setBlue(0); }} className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>점수 초기화</button>
    </div>
  );
}

function StudentModeNote({ usingSample }: { usingSample: boolean }) {
  if (!usingSample) return null;
  return (
    <div className="mx-auto mb-4 max-w-[520px] rounded-[14px] px-4 py-3 text-center text-[12px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.24)', color: 'var(--spm-amb)' }}>
      학생 명단 기능은 확장 단계입니다. 지금은 예시 명단으로 도구 흐름만 확인합니다.
    </div>
  );
}

function PickerTab({ students, usingSample }: { students: StudentProfile[]; usingSample: boolean }) {
  const [picked, setPicked] = useState<StudentProfile | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState('');
  const [excludePrev, setExcludePrev] = useState(false);
  const [prevId, setPrevId] = useState<string | null>(null);

  const handlePick = useCallback(() => {
    let pool = students;
    if (excludePrev && prevId) {
      const filtered = students.filter((student) => student.id !== prevId);
      if (filtered.length > 0) pool = filtered;
    }

    setSpinning(true);
    setPicked(null);
    let count = 0;
    const id = window.setInterval(() => {
      const candidate = pool[Math.floor(Math.random() * pool.length)]!;
      setDisplay(candidate.name);
      count += 1;
      if (count >= 18) {
        window.clearInterval(id);
        const final = pool[Math.floor(Math.random() * pool.length)]!;
        setPicked(final);
        setDisplay(final.name);
        setPrevId(final.id);
        setSpinning(false);
        try {
          navigator.vibrate?.(12);
        } catch {
          // Vibration is optional.
        }
      }
    }, 80);
  }, [excludePrev, prevId, students]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
      <StudentModeNote usingSample={usingSample} />
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>명단 {students.length}명 중 1명 선택</p>
      <label className="flex cursor-pointer items-center gap-2 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
        <input type="checkbox" checked={excludePrev} onChange={(event) => setExcludePrev(event.target.checked)} className="rounded" />
        직전 선택 제외
      </label>
      <div
        className="flex min-h-[160px] w-full max-w-[400px] flex-col items-center justify-center rounded-[22px] p-8"
        style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
      >
        {spinning || picked ? (
          <div className="space-y-2 text-center">
            <div className={`text-[64px] font-black leading-none transition-opacity ${spinning ? 'opacity-50' : ''}`} style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{display}</div>
            {!spinning && picked ? <p className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>{picked.group}</p> : null}
          </div>
        ) : (
          <div className="text-center">
            <Shuffle size={40} color="var(--spm-t3)" className="mx-auto mb-3" />
            <p className="text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>버튼을 눌러 한 명을 선택합니다.</p>
          </div>
        )}
      </div>
      <ActionButton onClick={handlePick} disabled={spinning} accent="rgba(239,68,68,0.85)">
        <Shuffle size={18} />{spinning ? '선택 중...' : '선택하기'}
      </ActionButton>
    </div>
  );
}

function scoreOf(student: StudentProfile) {
  return student.skills.reduce((sum, skill) => sum + skill.value, 0);
}

function TeamsTab({ students, usingSample }: { students: StudentProfile[]; usingSample: boolean }) {
  const [teams, setTeams] = useState<{ a: StudentProfile[]; b: StudentProfile[] } | null>(null);
  const [nameA, setNameA] = useState('A팀');
  const [nameB, setNameB] = useState('B팀');

  const balance = useCallback(() => {
    const sorted = [...students].sort((a, b) => scoreOf(b) - scoreOf(a));
    const a: StudentProfile[] = [];
    const b: StudentProfile[] = [];
    sorted.forEach((student, index) => (index % 2 === 0 ? a : b).push(student));
    setTeams({ a, b });
  }, [students]);

  const random = useCallback(() => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    setTeams({ a: shuffled.slice(0, mid), b: shuffled.slice(mid) });
  }, [students]);

  const aScore = teams ? teams.a.reduce((sum, student) => sum + scoreOf(student), 0) : 0;
  const bScore = teams ? teams.b.reduce((sum, student) => sum + scoreOf(student), 0) : 0;
  const total = aScore + bScore;
  const aPct = total === 0 ? 50 : Math.round((aScore / total) * 100);

  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-y-auto px-6 py-8">
      <StudentModeNote usingSample={usingSample} />
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>명단 {students.length}명 팀 배분</p>
      <div className="flex flex-wrap justify-center gap-3">
        <ActionButton onClick={balance} accent="#2563eb">
          <Users size={16} />균형 배분
        </ActionButton>
        <button type="button" onClick={random} className="flex h-14 items-center gap-2 rounded-[14px] px-6 text-[14px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
          <Shuffle size={16} />무작위
        </button>
      </div>
      {teams ? (
        <div className="grid w-full max-w-[560px] gap-4 sm:grid-cols-2">
          {(['a', 'b'] as const).map((key) => {
            const isA = key === 'a';
            const colors = isA ? { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.28)', text: 'var(--spm-red)' } : { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.28)', text: '#60a5fa' };
            return (
              <div key={key} className="rounded-[18px] p-5" style={{ background: colors.bg, border: `1.5px solid ${colors.border}` }}>
                <input
                  value={isA ? nameA : nameB}
                  onChange={(event) => (isA ? setNameA : setNameB)(event.target.value)}
                  className="mb-4 w-20 border-b bg-transparent text-[18px] font-black outline-none"
                  style={{ borderColor: colors.border, color: colors.text }}
                />
                <div className="space-y-2">
                  {teams[key].map((student) => (
                    <div key={student.id} className="flex items-center justify-between rounded-[12px] px-3 py-2" style={{ background: 'rgba(0,0,0,0.12)' }}>
                      <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{student.name}</span>
                      <span className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>{student.group}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 rounded-[14px] px-4 py-3 sm:col-span-2" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <span className="shrink-0 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>팀 균형</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--spm-s3)' }}>
              <div className="h-full bg-red-500 transition-all" style={{ width: `${aPct}%` }} />
            </div>
            <span className="shrink-0 text-[11px] font-bold" style={{ color: 'var(--spm-t2)' }}>{aScore} : {bScore}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Users size={40} color="var(--spm-t3)" />
          <p className="text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>팀 배분 방식을 선택하세요.</p>
        </div>
      )}
    </div>
  );
}

function OrderTab({ students, usingSample }: { students: StudentProfile[]; usingSample: boolean }) {
  const [ordered, setOrdered] = useState<StudentProfile[]>([]);
  const key = students.map((student) => student.id).join('|');

  const reshuffle = useCallback(() => {
    setOrdered([...students].sort(() => Math.random() - 0.5));
  }, [students]);

  useEffect(() => { reshuffle(); }, [key, reshuffle]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
      <StudentModeNote usingSample={usingSample} />
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>발표·게임 순서 · {students.length}명</p>
        <button type="button" onClick={reshuffle} className="rounded-full px-4 py-2 text-[12px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)', border: '1px solid rgba(245,158,11,0.28)' }}>
          다시 섞기
        </button>
      </div>
      <ol className="mx-auto w-full max-w-[440px] space-y-2">
        {ordered.map((student, index) => (
          <li key={`${student.id}-${index}`} className="flex items-center gap-3 rounded-[13px] px-4 py-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-black text-white" style={{ background: 'var(--spm-amb)', fontFamily: 'var(--spm-font-display)' }}>{index + 1}</span>
            <span className="flex-1 text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>{student.name}</span>
            <span className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>{student.group}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ClassToolsView() {
  const [tab, setTab] = useState<TabId>('stopwatch');
  const storeStudents = useMasterStore((state) => state.students);
  const students = useMemo(() => (storeStudents.length ? storeStudents : SAMPLE_STUDENTS), [storeStudents]);
  const usingSample = storeStudents.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: 'var(--spm-bg)' }}>
      <div className="flex shrink-0 overflow-x-auto border-b" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          const hasCount = (id === 'picker' || id === 'teams' || id === 'order') && students.length > 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="flex min-h-[48px] items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[13px] font-black transition-colors"
              style={{
                borderColor: active ? 'var(--spm-acc)' : 'transparent',
                color: active ? 'var(--spm-acc)' : 'var(--spm-t3)',
                background: active ? 'rgba(99,102,241,0.06)' : 'transparent',
              }}
            >
              <Icon size={15} />
              {label}
              {hasCount ? (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black" style={{ background: 'rgba(16,185,129,0.18)', color: 'var(--spm-grn)' }}>
                  {students.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'stopwatch' && <StopwatchTab />}
        {tab === 'scoreboard' && <ScoreboardTab />}
        {tab === 'picker' && <PickerTab students={students} usingSample={usingSample} />}
        {tab === 'teams' && <TeamsTab students={students} usingSample={usingSample} />}
        {tab === 'order' && <OrderTab students={students} usingSample={usingSample} />}
      </div>

      <div className="shrink-0 border-t px-5 py-3" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)' }}>
        <Link
          href="/spokedu-master/report"
          className="flex h-10 items-center justify-center gap-2 rounded-[11px] text-[12px] font-black"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
        >
          <FileText size={14} />설명 문구 보기
        </Link>
      </div>
    </div>
  );
}
