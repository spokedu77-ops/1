'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FileText, LayoutList, ListOrdered, Pause, Play, RotateCcw, Shuffle, Timer, Users } from 'lucide-react';
import { useMasterStore } from '../../store';
import type { StudentProfile } from '../../types';

type TabId = 'stopwatch' | 'scoreboard' | 'picker' | 'teams' | 'order';

const TABS: { id: TabId; label: string; icon: typeof Timer }[] = [
  { id: 'stopwatch', label: '스톱워치', icon: Timer },
  { id: 'scoreboard', label: '점수판', icon: LayoutList },
  { id: 'picker', label: '학생 뽑기', icon: Shuffle },
  { id: 'teams', label: '팀 나누기', icon: Users },
  { id: 'order', label: '순서', icon: ListOrdered },
];

function Btn({
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
      className="flex h-14 min-w-[140px] items-center justify-center gap-2 rounded-[14px] px-8 text-[15px] font-black text-white transition-opacity disabled:opacity-40"
      style={{ background: accent ?? 'var(--spm-acc)', boxShadow: `0 8px 24px ${accent ?? 'rgba(99,102,241,0.3)'}40` }}
    >
      {children}
    </button>
  );
}

function EmptyStudents() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <Users size={28} color="var(--spm-t3)" />
      </div>
      <p className="text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>등록된 학생이 없습니다</p>
      <p className="max-w-[280px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>
        학생을 먼저 등록해야 학생 뽑기, 팀 나누기, 순서 정하기를 사용할 수 있습니다.
      </p>
      <Link
        href="/spokedu-master/students"
        className="flex h-12 items-center rounded-[12px] px-6 text-[14px] font-black text-white"
        style={{ background: 'var(--spm-acc)' }}
      >
        학생 관리로 이동
      </Link>
    </div>
  );
}

function StopwatchTab() {
  const timerMs = useMasterStore((s) => s.classTimerMs);
  const timerRunning = useMasterStore((s) => s.classTimerRunning);
  const timerStartedAt = useMasterStore((s) => s.classTimerStartedAt);
  const timerStart = useMasterStore((s) => s.classTimerStart);
  const timerStop = useMasterStore((s) => s.classTimerStop);
  const timerReset = useMasterStore((s) => s.classTimerReset);

  const [displayMs, setDisplayMs] = useState(timerMs);

  useEffect(() => {
    if (!timerRunning) { setDisplayMs(timerMs); return; }
    const update = () => setDisplayMs(timerMs + (timerStartedAt ? Date.now() - timerStartedAt : 0));
    update();
    const id = setInterval(update, 50);
    return () => clearInterval(id);
  }, [timerRunning, timerMs, timerStartedAt]);

  const mins = Math.floor(displayMs / 60000);
  const secs = Math.floor((displayMs % 60000) / 1000);
  const centis = Math.floor((displayMs % 1000) / 10);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 p-8">
      <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--spm-t3)' }}>수업 진행 타이머</p>
      <div
        className="font-mono text-[clamp(4rem,20vw,9rem)] font-black tabular-nums leading-none tracking-tighter"
        style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: '-0.02em' }}
      >
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}.{String(centis).padStart(2, '0')}
      </div>
      <div className="flex gap-3">
        <Btn onClick={timerRunning ? timerStop : timerStart} accent={timerRunning ? 'rgba(239,68,68,0.85)' : 'var(--spm-acc)'}>
          {timerRunning ? <><Pause size={18} fill="currentColor" />일시정지</> : <><Play size={18} fill="currentColor" />시작</>}
        </Btn>
        <button
          type="button"
          onClick={() => { timerReset(); setDisplayMs(0); }}
          className="flex h-14 items-center gap-2 rounded-[14px] px-6 text-[14px] font-black"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
        >
          <RotateCcw size={16} />리셋
        </button>
      </div>
    </div>
  );
}

function ScorePanel({ label, score, tone, onPlus, onMinus }: { label: string; score: number; tone: 'red' | 'blue'; onPlus: () => void; onMinus: () => void }) {
  const c = tone === 'red' ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.28)', text: 'var(--spm-red)' } : { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.28)', text: '#60a5fa' };
  return (
    <div className="flex flex-col items-center gap-5 rounded-[22px] p-6" style={{ background: c.bg, border: `1.5px solid ${c.border}` }}>
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: c.text }}>{label}</p>
      <div className="text-[clamp(4rem,16vw,8rem)] font-black tabular-nums leading-none" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{score}</div>
      <div className="flex gap-3">
        <button type="button" onClick={onMinus} className="grid h-14 w-14 place-items-center rounded-full text-[24px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>−</button>
        <button type="button" onClick={onPlus} className="grid h-14 w-14 place-items-center rounded-full text-[24px] font-black text-white" style={{ background: c.text }}>+</button>
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
        <ScorePanel label="A팀" score={red} tone="red" onPlus={() => setRed((s) => s + 1)} onMinus={() => setRed((s) => Math.max(0, s - 1))} />
        <ScorePanel label="B팀" score={blue} tone="blue" onPlus={() => setBlue((s) => s + 1)} onMinus={() => setBlue((s) => Math.max(0, s - 1))} />
      </div>
      <button type="button" onClick={() => { setRed(0); setBlue(0); }} className="mt-2 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>점수 초기화</button>
    </div>
  );
}

function PickerTab({ students }: { students: StudentProfile[] }) {
  const [picked, setPicked] = useState<StudentProfile | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState('');
  const [excludePrev, setExcludePrev] = useState(false);
  const [prevId, setPrevId] = useState<string | null>(null);

  const handlePick = useCallback(() => {
    let pool = students;
    if (excludePrev && prevId) {
      const filtered = students.filter((s) => s.id !== prevId);
      if (filtered.length > 0) pool = filtered;
    }
    setSpinning(true);
    setPicked(null);
    let count = 0;
    const id = setInterval(() => {
      setDisplay(pool[Math.floor(Math.random() * pool.length)].name);
      count += 1;
      if (count >= 20) {
        clearInterval(id);
        const final = pool[Math.floor(Math.random() * pool.length)];
        setPicked(final);
        setDisplay(final.name);
        setPrevId(final.id);
        setSpinning(false);
        try { if (navigator.vibrate) navigator.vibrate(12); } catch { /* ignore */ }
      }
    }, 80);
  }, [students, excludePrev, prevId]);

  if (students.length === 0) return <EmptyStudents />;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>학생 {students.length}명 중 한 명 선택</p>
      <label className="flex cursor-pointer items-center gap-2 text-[12px] font-bold" style={{ color: 'var(--spm-t2)' }}>
        <input type="checkbox" checked={excludePrev} onChange={(e) => setExcludePrev(e.target.checked)} className="rounded" />
        직전 선택 학생 제외
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
            <p className="text-[13px] font-medium" style={{ color: 'var(--spm-t3)' }}>버튼을 눌러 학생을 뽑으세요.</p>
          </div>
        )}
      </div>
      <Btn onClick={handlePick} disabled={spinning} accent="rgba(239,68,68,0.85)">
        <Shuffle size={18} />{spinning ? '뽑는 중...' : '학생 뽑기'}
      </Btn>
      <div className="flex flex-wrap justify-center gap-2">
        {students.map((s) => (
          <span
            key={s.id}
            className="rounded-full px-3 py-1 text-[11px] font-bold"
            style={{
              background: picked?.id === s.id ? 'rgba(239,68,68,0.18)' : 'var(--spm-s2)',
              border: `1px solid ${picked?.id === s.id ? 'rgba(239,68,68,0.45)' : 'var(--spm-br2)'}`,
              color: picked?.id === s.id ? 'var(--spm-red)' : 'var(--spm-t2)',
            }}
          >{s.name}</span>
        ))}
      </div>
    </div>
  );
}

function TeamsTab({ students }: { students: StudentProfile[] }) {
  const [teams, setTeams] = useState<{ a: StudentProfile[]; b: StudentProfile[] } | null>(null);
  const [nameA, setNameA] = useState('A팀');
  const [nameB, setNameB] = useState('B팀');

  const scoreOf = (s: StudentProfile) => s.skills.reduce((sum, sk) => sum + sk.value, 0);

  const balance = useCallback(() => {
    const sorted = [...students].sort((a, b) => scoreOf(b) - scoreOf(a));
    const a: StudentProfile[] = [];
    const b: StudentProfile[] = [];
    sorted.forEach((s, i) => (i % 2 === 0 ? a : b).push(s));
    setTeams({ a, b });
  }, [students]);

  const random = useCallback(() => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    setTeams({ a: shuffled.slice(0, mid), b: shuffled.slice(mid) });
  }, [students]);

  if (students.length === 0) return <EmptyStudents />;

  const aScore = teams ? teams.a.reduce((sum, s) => sum + scoreOf(s), 0) : 0;
  const bScore = teams ? teams.b.reduce((sum, s) => sum + scoreOf(s), 0) : 0;
  const total = aScore + bScore;
  const aPct = total === 0 ? 50 : Math.round((aScore / total) * 100);

  return (
    <div className="flex h-full flex-col items-center gap-5 overflow-y-auto px-6 py-8">
      <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>학생 {students.length}명 팀 배분</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Btn onClick={balance} accent="#2563eb">
          <Users size={16} />균형 배분
        </Btn>
        <button type="button" onClick={random} className="flex h-14 items-center gap-2 rounded-[14px] px-6 text-[14px] font-black" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
          <Shuffle size={16} />랜덤
        </button>
      </div>
      {teams ? (
        <div className="grid w-full max-w-[560px] gap-4 sm:grid-cols-2">
          {(['a', 'b'] as const).map((key) => {
            const isA = key === 'a';
            const c = isA ? { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.28)', text: 'var(--spm-red)' } : { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.28)', text: '#60a5fa' };
            return (
              <div key={key} className="rounded-[18px] p-5" style={{ background: c.bg, border: `1.5px solid ${c.border}` }}>
                <div className="mb-4 flex items-center justify-between">
                  <input
                    value={isA ? nameA : nameB}
                    onChange={(e) => (isA ? setNameA : setNameB)(e.target.value)}
                    className="w-20 border-b bg-transparent text-[18px] font-black outline-none"
                    style={{ borderColor: c.border, color: c.text }}
                  />
                </div>
                <div className="space-y-2">
                  {teams[key].map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-[12px] px-3 py-2" style={{ background: 'rgba(0,0,0,0.12)' }}>
                      <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{s.name}</span>
                      <span className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>{s.group}</span>
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

function OrderTab({ students }: { students: StudentProfile[] }) {
  const [ordered, setOrdered] = useState<StudentProfile[]>([]);
  const key = students.map((s) => s.id).join('|');

  const reshuffle = useCallback(() => {
    setOrdered([...students].sort(() => Math.random() - 0.5));
  }, [students]);

  useEffect(() => { reshuffle(); }, [key, reshuffle]);

  if (students.length === 0) return <EmptyStudents />;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>발표·게임 순서 · {students.length}명</p>
        <button type="button" onClick={reshuffle} className="rounded-full px-4 py-2 text-[12px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)', border: '1px solid rgba(245,158,11,0.28)' }}>
          다시 섞기
        </button>
      </div>
      <ol className="mx-auto w-full max-w-[440px] space-y-2">
        {ordered.map((s, idx) => (
          <li key={`${s.id}-${idx}`} className="flex items-center gap-3 rounded-[13px] px-4 py-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[13px] font-black text-white" style={{ background: 'var(--spm-amb)', fontFamily: 'var(--spm-font-display)' }}>{idx + 1}</span>
            <span className="flex-1 text-[14px] font-bold" style={{ color: 'var(--spm-t)' }}>{s.name}</span>
            <span className="text-[11px]" style={{ color: 'var(--spm-t3)' }}>{s.group}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ClassToolsView() {
  const [tab, setTab] = useState<TabId>('stopwatch');
  const students = useMasterStore((state) => state.students);

  const needsStudents = tab === 'picker' || tab === 'teams' || tab === 'order';

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: 'var(--spm-bg)' }}>
      {/* 탭 */}
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

      {/* 콘텐츠 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'stopwatch' && <StopwatchTab />}
        {tab === 'scoreboard' && <ScoreboardTab />}
        {tab === 'picker' && <PickerTab students={students} />}
        {tab === 'teams' && <TeamsTab students={students} />}
        {tab === 'order' && <OrderTab students={students} />}
      </div>

      {/* 하단 — 설명 문구 링크 */}
      {!needsStudents || students.length > 0 ? (
        <div className="shrink-0 border-t px-5 py-3" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s1)' }}>
          <Link
            href="/spokedu-master/report"
            className="flex h-10 items-center justify-center gap-2 rounded-[11px] text-[12px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
          >
            <FileText size={14} />설명 문구 보기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
