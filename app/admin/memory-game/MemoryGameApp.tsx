'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { COLORS, MODES, MEMORY_ROUNDS, NUMBER_RULES } from './constants';
import { useStudents } from './hooks/useStudents';
import { useHistory } from './hooks/useHistory';
import { useIntervalTimer } from './hooks/useIntervalTimer';
import { useTrainingTimer } from './hooks/useTrainingTimer';
import { tts } from './lib/tts';
import { StudentModal } from './components/StudentModal';
import { StudentManageScreen } from './components/StudentManageScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { Sparkline } from './components/Sparkline';
import { SpeedSelector } from './components/SpeedSelector';
import { SignalDisplay } from './components/SignalDisplay';
import { MemoryGame } from './components/MemoryGame';
import { CSS, S } from './styles';

type Screen = 'home' | 'setup' | 'guide' | 'history' | 'students' | 'training' | 'memory' | 'result';

type Settings = {
  mode: string;
  level: number;
  speed: number;
  timeMode: string;
  duration: number;
  targetReps: number;
  audioMode: string;
  numberRule: string;
  intervalMode: boolean;
  intervalWork: number;
  intervalRest: number;
  intervalSets: number;
  splitMode: boolean;
  warmup: number;
  accel: boolean;
};

const defaultSettings: Settings = {
  mode: 'basic',
  level: 1,
  speed: 4.0,
  timeMode: 'time',
  duration: 60,
  targetReps: 20,
  audioMode: 'signal',
  numberRule: 'odd_left',
  intervalMode: false,
  intervalWork: 30,
  intervalRest: 15,
  intervalSets: 4,
  splitMode: false,
  warmup: 3,
  accel: false,
};

export default function MemoryGameApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const { records, push: pushRecord, clear: clearHistory } = useHistory();
  const { students, add: addStudent, remove: removeStudent, rename: renameStudent } = useStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('spokedu_theme') || 'light' : 'light'));
  const [isOffline, setIsOffline] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [isTraining, setIsTraining] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [signal, setSignal] = useState<Record<string, unknown> | null>(null);
  const [signalKey, setSignalKey] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const prevBgRef = useRef<string | null>(null);
  const [stats, setStats] = useState({ timeLeft: 30, repsLeft: 20, progress: 0 });
  const [result, setResult] = useState<{ count: number; cfg: Settings; nbackScore?: { hits: number; misses: number; falseAlarms: number; accuracy: number; level: number }; battleResult?: unknown } | null>(null);
  const [sessionMemo, setSessionMemo] = useState('');
  const [displayCount, setDisplayCount] = useState(0);
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trainingContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') localStorage.setItem('spokedu_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const set = useCallback((key: keyof Settings, value: unknown) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const onSignal = useCallback((sig: Record<string, unknown>) => {
    countRef.current++;
    setDisplayCount(countRef.current);
    if (sig.type === 'full_color' && (sig.bg as string) === prevBgRef.current) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 80);
    }
    prevBgRef.current = (sig.bg as string) ?? null;
    setSignal(sig);
    setSignalKey((k) => k + 1);
  }, []);

  const onFinish = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    setIsTraining(false);
    const cfg = { ...settings };
    const count = countRef.current;
    pushRecord(cfg, count, selectedStudentId);
    setResult({ count, cfg });
    setSessionMemo('');
    setScreen('result');
    if (cfg.audioMode !== 'off') setTimeout(() => tts('훈련 완료! 수고했어요!', true), 300);
  }, [settings, pushRecord, selectedStudentId]);

  const { getProgress } = useTrainingTimer({
    active: isTraining && !settings.intervalMode,
    speed: settings.speed,
    accel: settings.accel ?? false,
    timeMode: settings.timeMode,
    duration: settings.duration,
    targetReps: settings.targetReps,
    mode: settings.mode,
    level: settings.level,
    audioMode: settings.audioMode,
    colors: COLORS,
    onSignal,
    onFinish,
  });

  const { intervalPhase, intervalSet, intervalLeft } = useIntervalTimer({
    active: isTraining && !!settings.intervalMode,
    workSec: settings.intervalWork,
    restSec: settings.intervalRest,
    sets: settings.intervalSets,
    speed: settings.speed,
    mode: settings.mode,
    level: settings.level,
    audioMode: settings.audioMode,
    colors: COLORS,
    onSignal,
    onFinish,
  });

  const rafStatsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isTraining) return;
    const tick = () => setStats(getProgress());
    const loop = () => {
      tick();
      rafStatsRef.current = requestAnimationFrame(loop);
    };
    rafStatsRef.current = requestAnimationFrame(loop);
    return () => { if (rafStatsRef.current != null) cancelAnimationFrame(rafStatsRef.current); };
  }, [isTraining, getProgress]);

  useEffect(() => {
    if (!isTraining) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isTraining]);

  useEffect(() => {
    if (screen !== 'training') return;
    const id = requestAnimationFrame(() => {
      trainingContainerRef.current?.requestFullscreen?.().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, [screen]);

  const startSession = useCallback(
    (cfg: Settings = settings) => {
      setSettings(cfg);
      countRef.current = 0;
      setDisplayCount(0);
      setSignal(null);
      setFlashing(false);
      prevBgRef.current = null;

      if (cfg.mode === 'spatial') {
        setScreen('memory');
      } else {
        setScreen('training');
        setCountdown(cfg.warmup);
        let c = cfg.warmup;
        if (cfg.audioMode !== 'off') tts(cfg.warmup === 3 ? '셋' : String(cfg.warmup), true);
        timerRef.current = setInterval(() => {
          c--;
          if (c <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setCountdown(null);
            setIsTraining(true);
            if (cfg.audioMode !== 'off') tts('시작!', true);
          } else {
            setCountdown(c);
            const voices = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
            if (cfg.audioMode !== 'off') tts(voices[c - 1] ?? String(c), true);
          }
        }, 900);
      }
    },
    [settings]
  );

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (document.fullscreenElement) document.exitFullscreen();
    setIsTraining(false);
    setFlashing(false);
    setSignal(null);
    setScreen('home');
  }, []);

  const M = MODES[settings.mode];
  if (!M) return null;

  // ── HOME ──
  if (screen === 'home') {
    const M_cur = MODES[settings.mode];
    return (
      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <style>{CSS}</style>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-15%', width: '55vw', height: '55vw', maxWidth: 600, maxHeight: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(1.8rem,5vw,3rem) clamp(1.5rem,5vw,3rem)', maxWidth: 520, margin: '0 auto', width: '100%', gap: '1.8rem', boxSizing: 'border-box' }}>
          {isOffline && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', fontWeight: 700, color: '#FCA5A5' }}>
              <span>📵</span>
              <span>오프라인 상태입니다 — 저장된 데이터로 훈련은 계속 가능합니다</span>
            </div>
          )}
          <div className="home-fadein" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'clamp(0.6rem,1.5vw,0.72rem)', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Cognitive · Physical · Education</div>
              <div style={{ fontSize: 'clamp(1.5rem,4.5vw,2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>SPOKEDU</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button type="button" onClick={() => setShowStudentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.65rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.6rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                {(() => {
                  const s = students.find((st) => st.id === selectedStudentId);
                  if (s) return <><div style={{ width: 18, height: 18, borderRadius: '50%', background: s.color }} /><span>{s.name}</span></>;
                  return <><span>👤</span><span>학생 선택</span></>;
                })()}
              </button>
              <button type="button" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} style={{ width: 36, height: 36, borderRadius: '0.6rem', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, cursor: 'pointer' }}>{theme === 'light' ? '🌙' : '☀️'}</button>
            </div>
          </div>
          <div className="home-fadein-1" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(1rem,3vw,1.5rem)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {['PLAY', 'THINK', 'FLOW'].map((w, i) => (
                <React.Fragment key={w}>
                  <span style={{ fontSize: 'clamp(0.68rem,1.8vw,0.82rem)', fontWeight: 800, letterSpacing: '0.15em', color: i === 0 ? '#F97316' : i === 1 ? '#3B82F6' : '#22C55E' }}>{w}</span>
                  {i < 2 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>·</span>}
                </React.Fragment>
              ))}
            </div>
            <h1 style={{ fontSize: 'clamp(2.2rem,9vw,4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, margin: 0 }}>
              몸이 움직이면<br />
              <span style={{ color: '#F97316' }}>뇌가 깨어납니다</span>
            </h1>
            <p style={{ fontSize: 'clamp(0.85rem,2.2vw,0.97rem)', color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, fontWeight: 400 }}>신체 활동과 인지 훈련을 통합한<br />교육 기반 퍼포먼스 트레이닝 도구</p>
            <div className="home-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {Object.values(MODES).map((m) => {
                const rgbMap: Record<string, string> = { '#3B82F6': '59,130,246', '#A855F7': '168,85,247', '#22C55E': '34,197,94', '#F97316': '249,115,22' };
                const rgb = rgbMap[m.accent] ?? '249,115,22';
                const active = settings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSettings((s) => ({ ...s, mode: m.id, level: 1 }));
                      setScreen('setup');
                    }}
                    style={{ background: active ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.04)', border: `2px solid ${active ? m.accent : 'rgba(255,255,255,0.08)'}`, borderRadius: '0.85rem', padding: 'clamp(0.6rem,2vw,0.85rem)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}
                  >
                    <div style={{ fontSize: 'clamp(1rem,2.5vw,1.2rem)', marginBottom: '0.25rem' }}>{m.icon}</div>
                    <div style={{ fontSize: 'clamp(0.72rem,1.8vw,0.82rem)', fontWeight: 800, color: active ? m.accent : 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>{m.title}</div>
                    <div style={{ fontSize: 'clamp(0.58rem,1.4vw,0.65rem)', color: 'rgba(255,255,255,0.28)', marginTop: '0.12rem', fontWeight: 500 }}>{m.en}</div>
                    <div style={{ fontSize: 'clamp(0.55rem,1.3vw,0.62rem)', color: 'rgba(255,255,255,0.2)', marginTop: '0.2rem', fontWeight: 600 }}>3단계</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="home-fadein-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <button type="button" onClick={() => setScreen('history')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.85rem', padding: 'clamp(0.7rem,2vw,0.9rem)', fontSize: 'clamp(0.78rem,2vw,0.86rem)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', position: 'relative' }}>📊 기록{records.length > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#F97316', display: 'block' }} />}</button>
              <button type="button" onClick={() => setScreen('guide')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.85rem', padding: 'clamp(0.7rem,2vw,0.9rem)', fontSize: 'clamp(0.78rem,2vw,0.86rem)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📖 가이드</button>
            </div>
            <div className="home-fadein-3" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'clamp(0.62rem,1.6vw,0.7rem)', color: 'rgba(255,255,255,0.18)', fontWeight: 500, lineHeight: 1.6 }}>연세대학교 체육교육 전문가가 설계한<br />신체·인지 통합 트레이닝 도구</p>
            </div>
          </div>
        </div>
        {showStudentModal && (
          <StudentModal
            students={students}
            selectedId={selectedStudentId}
            onSelect={(id) => { setSelectedStudentId(id); setShowStudentModal(false); }}
            onClose={() => setShowStudentModal(false)}
            onManage={() => { setShowStudentModal(false); setScreen('students'); }}
          />
        )}
      </div>
    );
  }

  // ── STUDENTS / HISTORY / GUIDE (delegate to components) ──
  if (screen === 'students') return <StudentManageScreen students={students} onAdd={addStudent} onRemove={removeStudent} onRename={renameStudent} onBack={() => setScreen('home')} />;
  if (screen === 'history') return <HistoryScreen records={records} students={students} onBack={() => setScreen('home')} onClear={clearHistory} />;

  if (screen === 'guide') {
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, maxWidth: '36rem' }}>
            <button type="button" style={S.back} onClick={() => setScreen('home')}>← 처음으로</button>
            <h2 style={S.ctitle}>📖 훈련 가이드</h2>
            <p style={S.csub}>어떤 훈련인지, 어떻게 진행하는지 확인하세요.</p>
            <div style={{ background: '#0F172A', borderRadius: '1rem', padding: '1.1rem 1.3rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F97316', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>수업 준비 (고정)</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8 }}>체육관 바닥 네 방향에 <strong style={{ color: '#fff' }}>빨강 / 파랑 / 초록 / 노랑</strong> 콘을 하나씩 놓아주세요.<br />화면 신호가 나오면 해당 콘으로 달려가 터치하고 제자리로 돌아옵니다.</div>
            </div>
            {[
              { icon: '⚡', title: '반응 인지', tag: '키우는 능력: 순발력 · 색·방향·숫자 지각', steps: ['단계 1: 색깔 보고 달리기 — 화면 전체 색으로 해당 콘 달려가기', '단계 2: 화살표 보고 이동 — ↑앞/↓뒤/←→옆 방향으로 이동', '단계 3: 숫자 보고 판단 — 선생님이 규칙 지정 (홀수 왼쪽, 짝수 오른쪽 등)'], tip: '처음엔 단계 1부터. 익숙해지면 신호 간격을 줄여 난이도를 높입니다.', accent: '#3B82F6' },
              { icon: '🧠', title: '스트룹 과제', tag: '키우는 능력: 억제 제어 · 인지 유연성', steps: ['단계 1: 글자 색깔 맞히기 — "파란색 빨강"이 나오면 "파랑"이라 말하기', '단계 2: 배경색 함정 — 배경·글자·내용 모두 다른 색. 글자 색만 말하기', '단계 3: 역스트룹 — 색은 무시하고 글자 내용을 그대로 말하기'], tip: '음성 힌트를 켜면 단계 1·2에서 정답 색 이름을 소리로 알려줍니다.', accent: '#A855F7' },
              { icon: '🎨', title: '순차 기억', tag: '키우는 능력: 작업기억 · 순서 재생 · 집중력', steps: ['단계 1: 3가지 색 기억 — 색이 1초씩 3번 나온 뒤 순서대로 말하기', '단계 2: 5가지 색 기억 — 색이 1초씩 5번 나온 뒤 순서대로 말하기', '단계 3: 10가지 색 기억 — 4색이 무작위 10번, 선생님이 정답 공개'], tip: '색이 모두 나온 뒤 학생이 먼저 말하게 하고, 선생님이 버튼을 눌러 정답을 확인하세요.', accent: '#22C55E' },
              { icon: '🔀', title: '이중 과제', tag: '키우는 능력: 분산 주의 · 복합 실행력', steps: ['단계 1: 색깔 + 숫자 — 해당 색 콘으로 달린 뒤 숫자만큼 터치', '단계 2: 색깔 + 동작 — 해당 색 콘 위치에서 화면 동작 수행', '단계 3: 스트룹 + 동작 — 글자 색으로 판단해 이동 후 동작 수행'], tip: '단계 3은 가장 어렵습니다. 단계 1·2를 충분히 익힌 뒤 도전하세요.', accent: '#F97316' },
            ].map((block) => (
              <div key={block.title} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{block.icon}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: block.accent }}>{block.title}</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>{block.tag}</div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.85rem', padding: '0.85rem 1rem', marginBottom: '0.5rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.75 }}>
                  {block.steps.map((s, i) => (
                    <div key={i} style={{ marginBottom: i < block.steps.length - 1 ? '0.4rem' : 0 }}>{s}</div>
                  ))}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', lineHeight: 1.5 }}>팁: {block.tip}</div>
              </div>
            ))}
            <button type="button" style={{ ...S.btn, ...S.bDark, marginTop: '0.5rem' }} onClick={() => setScreen('home')}>🏠 처음으로</button>
          </div>
        </div>
      </div>
    );
  }

  // ── SETUP (abbreviated: only mode/level/speed/start to keep file size down; full setup can be added in same pattern)
  if (screen === 'setup') {
    const stepNum = (n: number, label: string) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F172A', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, flexShrink: 0, border: '2px solid #F97316' }}>{n}</div>
        <span style={{ fontSize: '0.93rem', fontWeight: 800, color: '#0F172A' }}>{label}</span>
      </div>
    );
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, maxWidth: '34rem' }}>
            <button type="button" style={S.back} onClick={() => setScreen('home')}>← 처음으로</button>
            <h2 style={S.ctitle}>훈련 설정</h2>
            <p style={S.csub}>아래 항목을 순서대로 설정하고 시작하세요.</p>
            <div style={S.sec}>
              {stepNum(1, '어떤 훈련을 할까요?')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                {Object.values(MODES).map((m) => (
                  <button key={m.id} type="button" onClick={() => setSettings((s) => ({ ...s, mode: m.id, level: 1 }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.85rem 0.95rem', borderRadius: '1rem', border: `2px solid ${settings.mode === m.id ? m.accent : '#E2E8F0'}`, background: settings.mode === m.id ? `${m.accent}10` : '#FAFAFA', cursor: 'pointer', gap: '0.15rem', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{m.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: '0.84rem', color: settings.mode === m.id ? m.accent : '#334155', marginTop: '0.3rem', lineHeight: 1.2 }}>{m.title}</span>
                    <span style={{ fontSize: '0.61rem', color: '#94A3B8', fontWeight: 500 }}>{m.en}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={S.sec}>
              {stepNum(2, '난이도를 선택하세요')}
              <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '0.7rem', lineHeight: 1.55 }}>{M.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {M.levels.map((lv) => (
                  <button key={lv.id} type="button" onClick={() => set('level', lv.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.8rem 1rem', borderRadius: '1rem', border: `2px solid ${settings.level === lv.id ? M.accent : '#E2E8F0'}`, background: settings.level === lv.id ? `${M.accent}08` : '#fff', cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'all 0.13s', textAlign: 'left' }}>
                    <div style={{ width: 40, height: 26, borderRadius: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.72rem', color: '#fff', background: settings.level === lv.id ? M.accent : '#CBD5E1', flexShrink: 0, marginTop: '0.05rem' }}>단계 {lv.id}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.12rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1E293B' }}>{lv.name}</span>
                        <span style={{ fontSize: '0.63rem', color: '#94A3B8', fontWeight: 500 }}>{lv.enName}</span>
                      </div>
                      <div style={{ fontSize: '0.77rem', color: '#64748B', lineHeight: 1.55 }}>{lv.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {settings.mode !== 'spatial' && (
              <>
                <div style={S.sec}>
                  {stepNum(3, '신호 속도를 정하세요')}
                  <SpeedSelector value={settings.speed} onChange={(v) => set('speed', v)} />
                </div>
                <div style={S.sec}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F172A', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, flexShrink: 0, border: '2px solid #F97316' }}>4</div>
                    <span style={{ fontSize: '0.93rem', fontWeight: 800, color: '#0F172A' }}>분량을 선택하세요</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {[
                      { id: 'time', label: '시간', sub: '초 단위' },
                      { id: 'reps', label: '횟수', sub: '신호 횟수' },
                    ].map((o) => (
                      <button key={o.id} type="button" onClick={() => set('timeMode', o.id)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.85rem', border: `2px solid ${settings.timeMode === o.id ? '#F97316' : '#E2E8F0'}`, background: settings.timeMode === o.id ? '#FFF7ED' : '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}<span style={{ display: 'block', fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>{o.sub}</span></button>
                    ))}
                  </div>
                  {settings.timeMode === 'time' ? (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {[30, 60, 90, 120].map((sec) => (
                        <button key={sec} type="button" onClick={() => set('duration', sec)} style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: `2px solid ${settings.duration === sec ? '#F97316' : '#E2E8F0'}`, background: settings.duration === sec ? '#FFF7ED' : '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{sec}초</button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {[10, 20, 30, 40].map((n) => (
                        <button key={n} type="button" onClick={() => set('targetReps', n)} style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: `2px solid ${settings.targetReps === n ? '#F97316' : '#E2E8F0'}`, background: settings.targetReps === n ? '#FFF7ED' : '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{n}회</button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {settings.mode === 'basic' && settings.level === 3 && (
              <div style={S.sec}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F172A', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, flexShrink: 0, border: '2px solid #3B82F6' }}>5</div>
                  <span style={{ fontSize: '0.93rem', fontWeight: 800, color: '#0F172A' }}>판단 규칙을 정하세요</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {NUMBER_RULES.map((rule) => (
                    <button key={rule.id} type="button" onClick={() => set('numberRule', rule.id)} style={{ padding: '0.7rem 1rem', borderRadius: '0.85rem', border: `2px solid ${settings.numberRule === rule.id ? '#3B82F6' : '#E2E8F0'}`, background: settings.numberRule === rule.id ? '#EFF6FF' : '#fff', color: settings.numberRule === rule.id ? '#1D4ED8' : '#475569', fontWeight: settings.numberRule === rule.id ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s' }}>{settings.numberRule === rule.id ? '✓ ' : ''}{rule.label}</button>
                  ))}
                </div>
              </div>
            )}
            {settings.mode === 'stroop' && (
              <div style={S.sec}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.93rem', fontWeight: 800, color: '#0F172A' }}>스트룹 힌트</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '0.6rem', lineHeight: 1.5 }}>스트룹 단계 1·2에서만 정답 색 이름을 읽어줍니다</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'off', label: '끔' },
                    { id: 'beep', label: '비프만' },
                    { id: 'signal', label: '켜기' },
                  ].map((o) => (
                    <button key={o.id} type="button" onClick={() => set('audioMode', o.id)} style={{ padding: '0.55rem 0.9rem', borderRadius: '0.75rem', border: `2px solid ${settings.audioMode === o.id ? '#A855F7' : '#E2E8F0'}`, background: settings.audioMode === o.id ? '#F5F3FF' : '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={S.sec}>
              <button type="button" onClick={() => setAdvancedOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700, color: '#64748B' }}>
                <span>{advancedOpen ? '▼' : '▶'}</span>
                <span>고급 설정</span>
              </button>
              {advancedOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: '0.35rem' }}>워밍업 카운트다운 (초)</div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>{[0, 3, 5].map((n) => (
                      <button key={n} type="button" onClick={() => set('warmup', n)} style={{ padding: '0.5rem 0.8rem', borderRadius: '0.6rem', border: `2px solid ${settings.warmup === n ? '#0F172A' : '#E2E8F0'}`, background: settings.warmup === n ? '#0F172A' : '#fff', color: settings.warmup === n ? '#fff' : '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>{n === 0 ? '없음' : `${n}초`}</button>
                    ))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: '0.35rem' }}>인터벌 모드 (Tabata)</div>
                    <button type="button" onClick={() => set('intervalMode', !settings.intervalMode)} style={{ padding: '0.5rem 0.9rem', borderRadius: '0.6rem', border: `2px solid ${settings.intervalMode ? '#22C55E' : '#E2E8F0'}`, background: settings.intervalMode ? '#F0FDF4' : '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>{settings.intervalMode ? '켜짐' : '끔'}</button>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: '0.35rem' }}>분할 화면 모드</div>
                    <button type="button" onClick={() => set('splitMode', !settings.splitMode)} style={{ padding: '0.5rem 0.9rem', borderRadius: '0.6rem', border: `2px solid ${settings.splitMode ? '#22C55E' : '#E2E8F0'}`, background: settings.splitMode ? '#F0FDF4' : '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>{settings.splitMode ? '켜짐' : '끔'}</button>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', marginBottom: '0.35rem' }}>점진 가속 (accel)</div>
                    <button type="button" onClick={() => set('accel', !settings.accel)} style={{ padding: '0.5rem 0.9rem', borderRadius: '0.6rem', border: `2px solid ${settings.accel ? '#22C55E' : '#E2E8F0'}`, background: settings.accel ? '#F0FDF4' : '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>{settings.accel ? '켜짐' : '끔'}</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" style={{ ...S.btn, ...S.bPrimary, flex: 3, fontSize: '1.05rem', padding: '1.1rem' }} onClick={() => startSession()}>훈련 시작 →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MEMORY / TRAINING / RESULT ──
  if (screen === 'memory')
    return (
      <MemoryGame level={settings.level} onExit={stop} onComplete={() => { pushRecord({ ...settings }, MEMORY_ROUNDS, selectedStudentId); setResult({ count: MEMORY_ROUNDS, cfg: { ...settings } }); setScreen('result'); }} />
    );

  if (screen === 'training') {
    const bg = flashing ? '#ffffff' : (signal?.bg as string) ?? '#0F172A';
    const dark = !flashing && (bg === '#0F172A' || bg.startsWith('#0') || bg.startsWith('#1'));
    const currentRule = NUMBER_RULES.find((r) => r.id === settings.numberRule);
    return (
      <div ref={trainingContainerRef} style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', transition: flashing ? 'none' : 'background 0.06s' }}>
        <style>{CSS}</style>
        {settings.mode === 'basic' && settings.level === 3 && currentRule && (
          <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', borderRadius: '2rem', padding: '0.5rem 1.2rem', color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(0.72rem,2vw,0.9rem)', fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.12)' }}>📋 규칙: {currentRule.label}</div>
        )}
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
          <div style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {settings.intervalMode ? <><span style={{ color: intervalPhase === 'work' ? '#FCA5A5' : '#86EFAC' }}>{intervalPhase === 'work' ? '🔥' : '😮‍💨'}</span><span>{intervalLeft}초</span><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{intervalSet}/{settings.intervalSets}세트</span></> : settings.timeMode === 'time' ? <><span style={{ color: '#FCA5A5' }}>⏱</span> {stats.timeLeft}초</> : <><span style={{ color: '#86EFAC' }}>🎯</span> {stats.repsLeft}회</>}
          </div>
          <button type="button" onClick={stop} style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
        {settings.intervalMode && intervalPhase === 'rest' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 25, gap: '1rem' }}>
            <div style={{ fontSize: '3.5rem' }}>😮‍💨</div>
            <div style={{ fontWeight: 900, fontSize: '2rem', color: '#86EFAC' }}>휴식 {intervalLeft}초</div>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.1)', zIndex: 20 }}>
          <div style={{ height: '100%', width: `${stats.progress * 100}%`, background: dark ? '#F97316' : 'rgba(0,0,0,0.3)', transition: 'width 0.1s linear', borderRadius: '0 2px 2px 0' }} />
        </div>
        {countdown !== null && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, backdropFilter: 'blur(8px)' }}>
            <div key={countdown} className="countdown-pop" style={{ fontSize: 'clamp(120px,30vw,240px)', fontWeight: 900, color: '#F97316', lineHeight: 1 }}>{countdown}</div>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0 }}>
          {countdown !== null ? null : settings.splitMode ? (
            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{ width: '35%', borderRight: '2px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.2rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>TEACHER</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#F97316' }}>{displayCount}</div>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>{signal ? <SignalDisplay signal={signal} animKey={signalKey} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '1.5rem', fontWeight: 700 }}>준비하세요</div>}</div>
            </div>
          ) : signal ? <SignalDisplay signal={signal} animKey={signalKey} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '2rem', fontWeight: 700 }}>준비하세요</div>}
        </div>
      </div>
    );
  }

  if (screen === 'result' && result) {
    const { count, cfg } = result;
    const mo = MODES[cfg.mode];
    const isMem = cfg.mode === 'spatial';
    const totalSec = isMem ? MEMORY_ROUNDS * 5 : cfg.timeMode === 'time' ? (cfg.duration ?? 0) : (cfg.targetReps ?? 0) * (cfg.speed ?? 1);
    const spm = !isMem && totalSec > 0 ? Math.round((count / totalSec) * 60) : null;
    const prevRecords = records.filter((r) => r.mode === cfg.mode && r.level === cfg.level && r.spm != null).slice(-9, -1);
    const prevSpm = prevRecords.length ? prevRecords[prevRecords.length - 1]!.spm! : null;
    const spmDiff = spm != null && prevSpm != null ? spm - prevSpm : null;
    const recentSpm = records.filter((r) => r.mode === cfg.mode && r.level === cfg.level && r.spm != null).slice(-8).map((r) => r.spm!);
    const mainVal = spm != null ? `${spm}` : `${count}`;
    const mainLabel = spm != null ? 'SPM' : '회';
    const mainColor = mo?.accent ?? '#F97316';
    const student = students.find((s) => s.id === selectedStudentId);
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, paddingTop: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{mo?.icon}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>{mo?.title} · 단계 {cfg.level}</span>
              </div>
              {student && <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><div style={{ width: 20, height: 20, borderRadius: '50%', background: student.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#fff' }}>{student.name[0]}</div><span style={{ fontSize: '0.78rem', fontWeight: 700, color: student.color }}>{student.name}</span></div>}
            </div>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: 'clamp(5rem,20vw,7rem)', fontWeight: 900, lineHeight: 1, color: mainColor, letterSpacing: '-0.03em' }}>{mainVal}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>{mainLabel}</div>
            </div>
            {spmDiff != null && (
              <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: spmDiff > 0 ? '#22C55E' : spmDiff < 0 ? '#EF4444' : '#94A3B8' }}>{spmDiff > 0 ? `▲ +${spmDiff}` : spmDiff < 0 ? `▼ ${spmDiff}` : '→ 동일'} SPM</span>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8', marginLeft: '0.4rem' }}>전 회차 대비</span>
              </div>
            )}
            {recentSpm.length >= 2 && (
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', marginBottom: '0.4rem' }}><span>최근 {recentSpm.length}회 추세</span><span style={{ color: '#F97316' }}>최고 {Math.max(...recentSpm)} SPM</span></div>
                <Sparkline data={recentSpm} color="#F97316" height={40} width={260} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" style={{ ...S.btn, ...S.bSecondary, flex: 1 }} onClick={() => setScreen('home')}>🏠 홈</button>
              <button type="button" style={{ ...S.btn, ...S.bSecondary, flex: 1 }} onClick={() => setScreen('history')}>📊 기록</button>
              <button type="button" style={{ ...S.btn, ...S.bPrimary, flex: 2 }} onClick={() => startSession(cfg)}>▶ 다시</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
