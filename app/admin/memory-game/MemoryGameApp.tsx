'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { COLORS, MODES, MEMORY_ROUNDS, NUMBER_RULES, NBACK_ROUNDS } from './constants';
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
import { TeamBattle } from './components/TeamBattle';
import { NBackGame } from './components/NBackGame';
import { MemoryGame } from './components/MemoryGame';
import { CSS, S } from './styles';

type Screen = 'home' | 'setup' | 'teamsetup' | 'guide' | 'history' | 'students' | 'training' | 'memory' | 'nback' | 'team' | 'result';

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
  _teamSignal?: string;
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
  const [teamSettings, setTeamSettings] = useState({ teamA: '빨강팀', teamB: '파랑팀', targetScore: 5 });
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('spokedu_theme') || 'light' : 'light'));
  const [isOffline, setIsOffline] = useState(false);

  const [isTraining, setIsTraining] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [signal, setSignal] = useState<Record<string, unknown> | null>(null);
  const [signalKey, setSignalKey] = useState(0);
  const [prevSignal, setPrevSignal] = useState<Record<string, unknown> | null>(null);
  const [flashing, setFlashing] = useState(false);
  const prevBgRef = useRef<string | null>(null);
  const [stats, setStats] = useState({ timeLeft: 30, repsLeft: 20, progress: 0 });
  const [result, setResult] = useState<{ count: number; cfg: Settings; nbackScore?: { hits: number; misses: number; falseAlarms: number; accuracy: number; level: number }; battleResult?: unknown } | null>(null);
  const [sessionMemo, setSessionMemo] = useState('');
  const [displayCount, setDisplayCount] = useState(0);
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setSignal((prev) => {
      setPrevSignal(prev);
      return sig;
    });
    setSignalKey((k) => k + 1);
  }, []);

  const onFinish = useCallback(() => {
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
      } else if (cfg.mode === 'nback') {
        setScreen('nback');
      } else if (cfg.mode === 'team') {
        setScreen('team');
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
            <button type="button" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', flexShrink: 0, cursor: 'pointer' }}>{theme === 'light' ? '🌙' : '☀️'}</button>
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
                const rgbMap: Record<string, string> = { '#3B82F6': '59,130,246', '#A855F7': '168,85,247', '#22C55E': '34,197,94', '#F97316': '249,115,22', '#F43F5E': '244,63,94', '#06B6D4': '6,182,212' };
                const rgb = rgbMap[m.accent] ?? '249,115,22';
                const active = settings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSettings((s) => ({ ...s, mode: m.id, level: 1 }));
                      setScreen(m.id === 'team' ? 'teamsetup' : 'setup');
                    }}
                    style={{ background: active ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? m.accent + '70' : 'rgba(255,255,255,0.08)'}`, borderRadius: '0.85rem', padding: 'clamp(0.6rem,2vw,0.85rem)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}
                  >
                    <div style={{ fontSize: 'clamp(1rem,2.5vw,1.2rem)', marginBottom: '0.25rem' }}>{m.icon}</div>
                    <div style={{ fontSize: 'clamp(0.72rem,1.8vw,0.82rem)', fontWeight: 800, color: active ? m.accent : 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>{m.title}</div>
                    <div style={{ fontSize: 'clamp(0.58rem,1.4vw,0.65rem)', color: 'rgba(255,255,255,0.28)', marginTop: '0.12rem', fontWeight: 500 }}>{m.en}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="home-fadein-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(() => {
              const modeLabel: Record<string, string> = { basic: '반응 인지', stroop: '스트룹', spatial: '순차 기억', dual: '이중 과제', nback: 'N-Back' };
              const todayRecords = records.filter((r) => new Date(r.date).toDateString() === new Date().toDateString());
              const recentSpm = records.filter((r) => r.spm != null).slice(-5).map((r) => r.spm!);
              const avgSpm = recentSpm.length ? Math.round(recentSpm.reduce((a, b) => a + b, 0) / recentSpm.length) : null;
              let mission: { icon: string; text: string; sub: string; done: boolean };
              if (todayRecords.length === 0) mission = { icon: '🌅', text: '오늘 첫 훈련을 시작해보세요!', sub: '어떤 모드든 1회만 완료하면 달성', done: false };
              else if (avgSpm != null && avgSpm < 15) mission = { icon: '⚡', text: `SPM ${avgSpm + 3} 이상 달성하기`, sub: `현재 평균 ${avgSpm} SPM · 속도를 조금 올려보세요`, done: false };
              else if (todayRecords.length < 3) mission = { icon: '🎯', text: '오늘 총 3회 훈련 완료', sub: `${todayRecords.length}/3회 진행됨`, done: false };
              else mission = { icon: '✅', text: '오늘 미션 완료!', sub: `총 ${todayRecords.length}회 훈련 · 수고했어요`, done: true };
              return (
                <div style={{ background: mission.done ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.08)', border: `1px solid ${mission.done ? 'rgba(34,197,94,0.25)' : 'rgba(249,115,22,0.2)'}`, borderRadius: '0.85rem', padding: '0.7rem 0.9rem', display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.15rem', flexShrink: 0, marginTop: '0.05rem' }}>{mission.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: mission.done ? '#86EFAC' : '#FED7AA', lineHeight: 1.3 }}>{mission.text}</div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.15rem' }}>{mission.sub}</div>
                  </div>
                </div>
              );
            })()}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.55rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem' }}>{M_cur.icon}</span>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{M_cur.title}</span>
              <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>단계 {settings.level}</span>
              <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{settings.speed.toFixed(1)}초 간격</span>
            </div>
            <button type="button" onClick={() => setShowStudentModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s' }}>
              {(() => {
                const s = students.find((st) => st.id === selectedStudentId);
                if (s) return <><div style={{ width: 22, height: 22, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: '#fff' }}>{s.name[0]}</div><span style={{ fontSize: '0.8rem', fontWeight: 700, color: s.color }}>{s.name}</span><span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>탭하여 변경</span></>;
                return <><span style={{ fontSize: '0.88rem' }}>👤</span><span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>학생 선택</span><span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>탭하여 선택</span></>;
              })()}
            </button>
            <button type="button" onClick={() => startSession()} style={{ background: '#F97316', color: '#fff', border: 'none', borderRadius: '1rem', padding: 'clamp(0.9rem,2.5vw,1.1rem)', fontSize: 'clamp(0.97rem,2.8vw,1.1rem)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(249,115,22,0.35)', letterSpacing: '0.02em' }}>훈련 시작 →</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <button type="button" onClick={() => setScreen('setup')} style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.85rem', padding: 'clamp(0.7rem,2vw,0.9rem)', fontSize: 'clamp(0.78rem,2vw,0.86rem)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>⚙ 설정</button>
              <button type="button" onClick={() => setScreen('guide')} style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.85rem', padding: 'clamp(0.7rem,2vw,0.9rem)', fontSize: 'clamp(0.78rem,2vw,0.86rem)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>📖 가이드</button>
              <button type="button" onClick={() => setScreen('history')} style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.85rem', padding: 'clamp(0.7rem,2vw,0.9rem)', fontSize: 'clamp(0.78rem,2vw,0.86rem)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', position: 'relative' }}>📊 기록{records.length > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#F97316', display: 'block' }} />}</button>
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
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F97316', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>스포키듀가 특별한 이유</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75 }}>몸을 움직이는 순간, 뇌가 가장 잘 깨어납니다. 스포키듀는 <strong style={{ color: '#fff' }}>신호 보기 → 생각하기 → 몸으로 반응하기</strong>를 반복하면서 집중력, 기억력, 판단력, 순발력을 자연스럽게 키웁니다.</div>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>수업 준비</div>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.85rem', padding: '0.9rem 1.1rem', marginBottom: '1.5rem', fontSize: '0.855rem', color: '#475569', lineHeight: 1.8 }}>체육관 바닥 네 방향에 <strong style={{ color: '#1E293B' }}>빨강 / 파랑 / 초록 / 노랑</strong> 콘을 하나씩 놓아주세요.<br />화면에 신호가 나오면 해당 콘으로 달려가 터치하고 제자리로 돌아옵니다.</div>
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
              <div style={S.sec}>
                {stepNum(3, '신호 속도를 정하세요')}
                <SpeedSelector value={settings.speed} onChange={(v) => set('speed', v)} />
              </div>
            )}
            {settings.mode === 'basic' && settings.level === 3 && (
              <div style={S.sec}>
                {stepNum(4, '판단 규칙을 정하세요')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {NUMBER_RULES.map((rule) => (
                    <button key={rule.id} type="button" onClick={() => set('numberRule', rule.id)} style={{ padding: '0.7rem 1rem', borderRadius: '0.85rem', border: `2px solid ${settings.numberRule === rule.id ? '#3B82F6' : '#E2E8F0'}`, background: settings.numberRule === rule.id ? '#EFF6FF' : '#fff', color: settings.numberRule === rule.id ? '#1D4ED8' : '#475569', fontWeight: settings.numberRule === rule.id ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s' }}>{settings.numberRule === rule.id ? '✓ ' : ''}{rule.label}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" style={{ ...S.btn, ...S.bPrimary, flex: 3, fontSize: '1.05rem', padding: '1.1rem' }} onClick={() => startSession()}>훈련 시작 →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── TEAM SETUP ──
  if (screen === 'teamsetup') {
    return (
      <div style={S.page}>
        <style>{CSS}</style>
        <div style={S.scroll}>
          <div style={{ ...S.card, maxWidth: '34rem' }}>
            <button type="button" style={S.back} onClick={() => setScreen('home')}>← 처음으로</button>
            <h2 style={S.ctitle}>⚔️ 팀 대결 설정</h2>
            <p style={S.csub}>두 팀의 이름과 목표 점수를 정하세요.</p>
            {(['A', 'B'] as const).map((t) => (
              <div key={t} style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '0.4rem' }}>{t}팀 이름</div>
                <input value={t === 'A' ? teamSettings.teamA : teamSettings.teamB} onChange={(e) => setTeamSettings((s) => ({ ...s, [t === 'A' ? 'teamA' : 'teamB']: e.target.value }))} placeholder={t === 'A' ? '빨강팀' : '파랑팀'} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '2px solid #3B82F644', background: '#F8FAFC', fontSize: '0.95rem', fontFamily: 'inherit', fontWeight: 700, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '0.6rem' }}>목표 점수</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[3, 5, 7, 10].map((n) => (
                  <button key={n} type="button" onClick={() => setTeamSettings((s) => ({ ...s, targetScore: n }))} style={{ flex: '1 0 60px', padding: '0.75rem', borderRadius: '0.85rem', border: `2px solid ${teamSettings.targetScore === n ? '#F97316' : '#E2E8F0'}`, background: teamSettings.targetScore === n ? '#FFF7ED' : '#fff', fontWeight: 800, fontSize: '1rem', color: teamSettings.targetScore === n ? '#C2410C' : '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>{n}점</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginBottom: '0.5rem' }}>신호 종류</div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[{ id: 'basic', label: '색 신호' }, { id: 'stroop', label: '스트룹' }, { id: 'dual', label: '이중과제' }].map((m) => (
                  <button key={m.id} type="button" onClick={() => setSettings((s) => ({ ...s, mode: 'team', _teamSignal: m.id }))} style={{ flex: 1, padding: '0.65rem', borderRadius: '0.75rem', border: `2px solid ${(settings._teamSignal || 'basic') === m.id ? '#0F172A' : '#E2E8F0'}`, background: (settings._teamSignal || 'basic') === m.id ? '#0F172A' : '#fff', color: (settings._teamSignal || 'basic') === m.id ? '#fff' : '#64748B', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>{m.label}</button>
                ))}
              </div>
            </div>
            <button type="button" style={{ ...S.btn, ...S.bPrimary, width: '100%' }} onClick={() => setScreen('team')}>⚔️ 대결 시작!</button>
          </div>
        </div>
      </div>
    );
  }

  // ── TEAM / NBACK / MEMORY / TRAINING / RESULT ──
  if (screen === 'team')
    return (
      <TeamBattle teamA={teamSettings.teamA || '빨강팀'} teamB={teamSettings.teamB || '파랑팀'} targetScore={Math.max(1, Number(teamSettings.targetScore) || 5)} mode={settings._teamSignal || 'basic'} level={settings.level} audioMode={settings.audioMode} onExit={stop} onComplete={(battleResult) => { setResult({ count: (battleResult as { round: number }).round, cfg: { ...settings }, battleResult }); setScreen('result'); }} />
    );

  if (screen === 'nback')
    return (
      <NBackGame level={settings.level} audioMode={settings.audioMode} colors={COLORS} onExit={stop} onComplete={(score) => { pushRecord({ ...settings }, NBACK_ROUNDS, selectedStudentId); setResult({ count: NBACK_ROUNDS, cfg: { ...settings }, nbackScore: score }); setScreen('result'); }} />
    );

  if (screen === 'memory')
    return (
      <MemoryGame level={settings.level} onExit={stop} onComplete={() => { pushRecord({ ...settings }, MEMORY_ROUNDS, selectedStudentId); setResult({ count: MEMORY_ROUNDS, cfg: { ...settings } }); setScreen('result'); }} />
    );

  if (screen === 'training') {
    const bg = flashing ? '#ffffff' : (signal?.bg as string) ?? '#0F172A';
    const dark = !flashing && (bg === '#0F172A' || bg.startsWith('#0') || bg.startsWith('#1'));
    const currentRule = NUMBER_RULES.find((r) => r.id === settings.numberRule);
    return (
      <div style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', transition: flashing ? 'none' : 'background 0.06s' }}>
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
                {prevSignal && (
                  <div style={{ width: '70%', aspectRatio: 1, borderRadius: '1rem', background: (prevSignal.bg as string) ?? '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.5rem' }}>{(prevSignal.content as { name?: string; word?: string; label?: string })?.name ?? (prevSignal.content as { word?: string })?.word ?? (prevSignal.content as { label?: string })?.label ?? '—'}</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, position: 'relative' }}>{signal ? <SignalDisplay signal={signal} animKey={signalKey} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '1.5rem', fontWeight: 700 }}>준비하세요</div>}</div>
            </div>
          ) : signal ? <SignalDisplay signal={signal} animKey={signalKey} /> : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '2rem', fontWeight: 700 }}>준비하세요</div>}
        </div>
      </div>
    );
  }

  if (screen === 'result' && result) {
    const { count, cfg, nbackScore } = result;
    const mo = MODES[cfg.mode];
    const isMem = cfg.mode === 'spatial';
    const isNback = cfg.mode === 'nback';
    const isTeam = cfg.mode === 'team';
    const totalSec = isMem ? MEMORY_ROUNDS * 5 : cfg.timeMode === 'time' ? (cfg.duration ?? 0) : (cfg.targetReps ?? 0) * (cfg.speed ?? 1);
    const spm = !isMem && !isTeam && totalSec > 0 ? Math.round((count / totalSec) * 60) : null;
    const prevRecords = records.filter((r) => r.mode === cfg.mode && r.level === cfg.level && r.spm != null).slice(-9, -1);
    const prevSpm = prevRecords.length ? prevRecords[prevRecords.length - 1]!.spm! : null;
    const spmDiff = spm != null && prevSpm != null ? spm - prevSpm : null;
    const recentSpm = records.filter((r) => r.mode === cfg.mode && r.level === cfg.level && r.spm != null).slice(-8).map((r) => r.spm!);
    const mainVal = isNback ? `${nbackScore?.accuracy ?? 0}%` : spm != null ? `${spm}` : `${count}`;
    const mainLabel = isNback ? '정확도' : spm != null ? 'SPM' : '회';
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
