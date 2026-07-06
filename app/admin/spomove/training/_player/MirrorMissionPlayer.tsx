'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

type Phase = 'ready' | 'play' | 'done';
type Level = 'easy' | 'normal' | 'hard';
type Mission = { id: string; label: string; hint: string; color: string; mark: string };

const LEVELS: Record<Level, { label: string; round: number; mission: number; speed: number }> = {
  easy: { label: 'EASY', round: 90, mission: 6, speed: 1 },
  normal: { label: 'NORMAL', round: 75, mission: 5, speed: 1.35 },
  hard: { label: 'HARD', round: 60, mission: 4, speed: 1.7 },
};

const MISSIONS: Mission[] = [
  { id: 'up2', label: '양손 위로', hint: '팔을 귀 옆까지 높게', color: '#ef4444', mark: 'UP' },
  { id: 'right', label: '오른손 들기', hint: '화면 기준 오른손', color: '#facc15', mark: 'R' },
  { id: 'left', label: '왼손 들기', hint: '화면 기준 왼손', color: '#22c55e', mark: 'L' },
  { id: 'open', label: '양팔 벌리기', hint: '어깨 높이로 크게', color: '#38bdf8', mark: 'OPEN' },
  { id: 'jump', label: '제자리 점프', hint: '작게 뛰고 착지', color: '#fb7185', mark: 'JUMP' },
  { id: 'squat', label: '스쿼트', hint: '무릎을 살짝 굽히기', color: '#a78bfa', mark: 'LOW' },
  { id: 'balance', label: '한발 균형', hint: '3초 버티기', color: '#34d399', mark: 'BAL' },
  { id: 'fast', label: '제자리 달리기', hint: '빠르게 팔치기', color: '#60a5fa', mark: 'RUN' },
];

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function fmt(s: number) { const v = Math.max(0, Math.ceil(s)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`; }
function pick(except?: string) { const pool = MISSIONS.filter((m) => m.id !== except); return pool[Math.floor(Math.random() * pool.length)] ?? MISSIONS[0]; }
function makeQueue() { const q: Mission[] = []; for (let i = 0; i < 5; i += 1) q.push(pick(q[q.length - 1]?.id)); return q; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="mm-stat"><span>{label}</span><strong>{value}</strong></div>; }

export function MirrorMissionPlayer() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [levelId, setLevelId] = useState<Level>('normal');
  const level = useMemo(() => LEVELS[levelId], [levelId]);
  const [queue, setQueue] = useState<Mission[]>(() => MISSIONS.slice(0, 5));
  const [round, setRound] = useState(LEVELS.normal.round);
  const [left, setLeft] = useState(LEVELS.normal.mission);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [ok, setOk] = useState(0);
  const [no, setNo] = useState(0);
  const [speed, setSpeed] = useState(LEVELS.normal.speed);
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'no'>('idle');
  const [mirror, setMirror] = useState(true);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const current = queue[0] ?? MISSIONS[0];
  const progress = clamp((1 - round / level.round) * 100, 0, 100);
  const missionProgress = clamp((left / level.mission) * 100, 0, 100);
  const accuracy = ok + no ? Math.round((ok / (ok + no)) * 100) : 0;
  const vars = { '--mm-accent': current.color, '--mm-speed': `${clamp(6 - speed, 1.5, 5)}s` } as CSSProperties & Record<string, string>;

  const clearDelay = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const next = useCallback(() => {
    setFeedback('idle');
    setQueue((old) => {
      const rest = old.length > 1 ? old.slice(1) : makeQueue();
      return [...rest, pick(rest[rest.length - 1]?.id)];
    });
    setLeft(level.mission);
  }, [level.mission]);

  const start = useCallback(() => {
    clearDelay();
    const cfg = LEVELS[levelId];
    setQueue(makeQueue());
    setRound(cfg.round);
    setLeft(cfg.mission);
    setDistance(0);
    setScore(0);
    setCombo(0);
    setOk(0);
    setNo(0);
    setSpeed(cfg.speed);
    setFeedback('idle');
    setPhase('play');
  }, [clearDelay, levelId]);

  const reset = useCallback(() => {
    clearDelay();
    setPhase('ready');
    setFeedback('idle');
    setRound(level.round);
    setLeft(level.mission);
    setDistance(0);
    setScore(0);
    setCombo(0);
    setOk(0);
    setNo(0);
    setSpeed(level.speed);
  }, [clearDelay, level]);

  const judge = useCallback((result: 'ok' | 'no') => {
    if (phase !== 'play' || feedback !== 'idle') return;
    clearDelay();
    setFeedback(result);
    if (result === 'ok') {
      setOk((v) => v + 1);
      setCombo((v) => v + 1);
      setScore((v) => v + 120 + combo * 20);
      setDistance((v) => v + 18 + combo * 3);
      setSpeed((v) => clamp(v + 0.08, 0.7, 3.2));
    } else {
      setNo((v) => v + 1);
      setCombo(0);
      setSpeed((v) => clamp(v - 0.18, 0.7, 3.2));
    }
    timeoutRef.current = window.setTimeout(next, result === 'ok' ? 520 : 700);
  }, [clearDelay, combo, feedback, next, phase]);

  useEffect(() => () => clearDelay(), [clearDelay]);

  useEffect(() => {
    if (phase !== 'play') return undefined;
    const id = window.setInterval(() => {
      setRound((v) => Math.max(0, v - 0.1));
      setLeft((v) => Math.max(0, v - 0.1));
      setDistance((v) => v + speed * 0.28);
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, speed]);

  useEffect(() => {
    if (phase === 'play' && round <= 0.05) {
      clearDelay();
      setFeedback('idle');
      setPhase('done');
    }
  }, [clearDelay, phase, round]);

  useEffect(() => {
    if (phase === 'play' && feedback === 'idle' && left <= 0.05) judge('no');
  }, [feedback, judge, left, phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space') { event.preventDefault(); phase === 'play' ? judge('ok') : start(); }
      if (event.code === 'KeyX') { event.preventDefault(); judge('no'); }
      if (event.code === 'Enter') { event.preventDefault(); phase === 'play' ? next() : start(); }
      if (event.code === 'ArrowUp') { event.preventDefault(); setSpeed((v) => clamp(v + 0.15, 0.7, 3.2)); }
      if (event.code === 'ArrowDown') { event.preventDefault(); setSpeed((v) => clamp(v - 0.15, 0.7, 3.2)); }
      if (event.code === 'KeyM') { event.preventDefault(); setMirror((v) => !v); }
      if (event.code === 'KeyR') { event.preventDefault(); reset(); }
      if (event.code === 'KeyF') { event.preventDefault(); document.fullscreenElement ? void document.exitFullscreen() : void stageRef.current?.requestFullscreen(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [judge, next, phase, reset, start]);

  return <main className="mm-page" style={vars}><div className={feedback === 'no' ? 'mm-stage mm-shake' : 'mm-stage'} ref={stageRef}>
    <div className="mm-bg"><div className="mm-grid" /><div className="mm-road" /></div>
    <header className="mm-top"><Link href="/admin/spomove/training">← TRAINING</Link><section><div><b>SPOMOVE RUN</b><strong>{fmt(round)}</strong></div><i><em style={{ width: `${progress}%` }} /></i></section><aside><strong>{Math.round(distance)}</strong><span>m</span></aside></header>
    <section className="mm-play"><div className="mm-mission"><p>{current.id.toUpperCase()}</p><div className="mm-figure"><b style={{ color: current.color, transform: mirror ? 'scaleX(-1)' : undefined }}>{current.mark}</b>{mirror && <span>MIRROR</span>}</div><h1>{current.label}</h1><h2>{current.hint}</h2><i><em style={{ width: `${missionProgress}%` }} /></i></div>{feedback !== 'idle' && <div className={feedback === 'ok' ? 'mm-fb mm-ok' : 'mm-fb mm-no'}>{feedback === 'ok' ? 'PERFECT' : 'TRY AGAIN'}</div>}</section>
    <footer className="mm-bottom"><div className="mm-nexts">{queue.slice(1, 4).map((mission, index) => <div key={`${mission.id}-${index}`}><i style={{ background: mission.color }} /><b>{mission.label}</b><span>NEXT {index + 1}</span></div>)}</div><div className="mm-stats"><Stat label="SCORE" value={score.toLocaleString('ko-KR')} /><Stat label="COMBO" value={`${combo}`} /><Stat label="SPEED" value={`${speed.toFixed(1)}x`} /></div></footer>
    {phase !== 'play' && <div className="mm-modal"><div className="mm-card">{phase === 'ready' ? <><small>교사용 수동 판정형 플레이어</small><h3>SPOMOVE RUN</h3><p>카메라 인식 없이 선생님이 키보드로 성공·실패를 조작하는 프로젝터용 러닝 미션 화면입니다.</p><div className="mm-levels">{(Object.keys(LEVELS) as Level[]).map((id) => <button type="button" className={id === levelId ? 'active' : ''} onClick={() => setLevelId(id)} key={id}><b>{LEVELS[id].label}</b><span>{LEVELS[id].round}초 · 미션 {LEVELS[id].mission}초</span></button>)}</div><nav><button type="button" onClick={start}>시작 · SPACE</button><button type="button" onClick={() => void stageRef.current?.requestFullscreen()}>전체화면 · F</button></nav></> : <><small>라운드 종료</small><h3>{Math.round(distance)}m</h3><p>성공 {ok}회 · 실패 {no}회 · 정확도 {accuracy}%</p><nav><button type="button" onClick={start}>다시 시작</button><button type="button" onClick={reset}>설정으로</button></nav></>}</div></div>}
    <div className="mm-help"><b>SPACE 성공</b><b>X 실패</b><b>ENTER 다음</b><b>↑↓ 속도</b><b>M 미러</b><b>F 전체화면</b><b>R 리셋</b></div>
  </div><style>{`.mm-page{min-height:100svh;background:#020617;color:#f8fafc;font-family:ui-sans-serif,system-ui;overflow:hidden}.mm-stage{position:relative;min-height:100svh;overflow:hidden;background:radial-gradient(circle at 50% 40%,rgba(56,189,248,.23),transparent 24%),linear-gradient(#08111f,#030712);isolation:isolate}.mm-bg,.mm-grid,.mm-road{position:absolute;inset:0;pointer-events:none}.mm-bg{z-index:-1}.mm-grid{bottom:-8%;height:68%;background-image:linear-gradient(rgba(56,189,248,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.14) 1px,transparent 1px);background-size:90px 90px;transform:perspective(520px) rotateX(62deg);transform-origin:bottom;animation:mm-grid 12s linear infinite}.mm-road{left:50%;right:auto;top:auto;bottom:-14vh;width:min(82vw,1040px);height:62vh;transform:translateX(-50%) perspective(520px) rotateX(58deg);transform-origin:bottom;clip-path:polygon(47% 0,53% 0,100% 100%,0 100%);background:repeating-linear-gradient(180deg,rgba(255,255,255,.85) 0 42px,transparent 42px 92px),linear-gradient(rgba(15,23,42,.2),rgba(15,23,42,.9));background-size:100% 180px,100%;animation:mm-road var(--mm-speed) linear infinite}.mm-top{z-index:2;position:relative;display:grid;grid-template-columns:160px 1fr 160px;gap:20px;align-items:center;padding:22px}.mm-top a,.mm-top section,.mm-top aside,.mm-bottom>div>div,.mm-stat,.mm-card,.mm-levels button,.mm-help{border:1px solid rgba(148,163,184,.24);background:rgba(2,6,23,.62);box-shadow:0 18px 42px rgba(0,0,0,.26);backdrop-filter:blur(14px);border-radius:18px}.mm-top a{display:grid;place-items:center;min-height:44px;color:#e2e8f0;text-decoration:none;font-size:12px;font-weight:900}.mm-top section{padding:12px 14px}.mm-top section div{display:flex;justify-content:space-between;font-size:12px;letter-spacing:.12em}.mm-top section i,.mm-mission>i{display:block;height:10px;margin-top:9px;border-radius:999px;background:rgba(15,23,42,.9);overflow:hidden}.mm-top section em,.mm-mission>i em{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#22c55e,#facc15,#ef4444);border-radius:inherit}.mm-top aside{min-height:62px;display:flex;align-items:baseline;justify-content:center;gap:4px;color:#facc15}.mm-top aside strong{font-size:46px;letter-spacing:-.08em}.mm-play{min-height:58vh;display:grid;place-items:center;position:relative}.mm-mission{display:grid;justify-items:center;gap:12px;width:min(520px,88vw)}.mm-mission p{margin:0;color:var(--mm-accent);border:1px solid color-mix(in srgb,var(--mm-accent) 60%,transparent);border-radius:999px;padding:8px 18px;background:rgba(2,6,23,.72);font-size:12px;font-weight:1000;letter-spacing:.16em}.mm-figure{position:relative;width:min(330px,64vw);aspect-ratio:.88;display:grid;place-items:center;border-radius:42px;background:radial-gradient(circle,rgba(255,255,255,.44),rgba(148,163,184,.12) 48%,rgba(15,23,42,.36));border:2px solid rgba(255,255,255,.24);box-shadow:0 0 70px color-mix(in srgb,var(--mm-accent) 34%,transparent)}.mm-figure b{font-size:clamp(78px,14vw,150px);font-weight:1000;filter:drop-shadow(0 16px 20px rgba(0,0,0,.35))}.mm-figure span{position:absolute;right:18px;top:18px;border:1px solid rgba(125,211,252,.36);border-radius:10px;padding:7px 10px;color:#bae6fd;font-size:11px;font-weight:1000}.mm-mission h1{margin:0;text-align:center;font-size:clamp(44px,8vw,92px);font-weight:1000;letter-spacing:-.08em}.mm-mission h2{margin:0;color:rgba(241,245,249,.78)}.mm-fb{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-4deg);z-index:5;font-size:clamp(54px,11vw,136px);font-weight:1000;letter-spacing:-.08em;animation:mm-pop .62s ease-out both}.mm-ok{color:#fef08a}.mm-no{color:#fecaca}.mm-bottom{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto;gap:18px;padding:0 22px 22px}.mm-nexts,.mm-stats{display:grid;grid-template-columns:repeat(3,minmax(100px,1fr));gap:12px}.mm-nexts div{min-height:72px;padding:14px 14px 12px 46px;position:relative}.mm-nexts i{position:absolute;left:14px;top:18px;width:18px;height:18px;border-radius:7px}.mm-nexts b,.mm-stat strong{display:block;font-weight:1000}.mm-nexts span,.mm-stat span{display:block;color:rgba(226,232,240,.55);font-size:10px;font-weight:900}.mm-stat{padding:12px 14px;min-width:100px}.mm-stat strong{font-size:24px}.mm-modal{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:rgba(2,6,23,.58);backdrop-filter:blur(8px);padding:24px}.mm-card{width:min(760px,94vw);padding:clamp(26px,4vw,44px);text-align:center;border-radius:34px}.mm-card small{color:#7dd3fc;font-size:12px;font-weight:1000}.mm-card h3{margin:8px 0 0;font-size:clamp(42px,8vw,86px);font-weight:1000;letter-spacing:-.08em}.mm-card p{max-width:640px;margin:18px auto;color:rgba(226,232,240,.75);line-height:1.7}.mm-levels{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.mm-levels button{padding:18px 14px;color:inherit;text-align:left;cursor:pointer}.mm-levels .active{border-color:#38bdf8;background:rgba(14,165,233,.16)}.mm-levels b,.mm-levels span{display:block}.mm-levels span{margin-top:8px;color:rgba(226,232,240,.65)}.mm-card nav{display:flex;justify-content:center;gap:12px;margin-top:28px}.mm-card nav button{border:0;border-radius:999px;padding:15px 24px;font-weight:1000;cursor:pointer}.mm-card nav button:first-child{background:linear-gradient(135deg,#fef08a,#38bdf8 62%,#a78bfa);color:#020617}.mm-card nav button:last-child{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.14)}.mm-help{position:fixed;right:18px;top:102px;z-index:4;display:grid;gap:7px;padding:14px;font-size:11px;color:rgba(226,232,240,.76)}.mm-shake{animation:mm-shake .45s both}@keyframes mm-grid{to{background-position:0 360px,360px 360px}}@keyframes mm-road{to{background-position:0 360px,0 0}}@keyframes mm-pop{0%{opacity:0;transform:translate(-50%,-50%) scale(.72) rotate(-7deg)}55%{opacity:1;transform:translate(-50%,-50%) scale(1.04) rotate(-4deg)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.18) rotate(-2deg)}}@keyframes mm-shake{30%,70%{transform:translateX(-5px)}40%,60%{transform:translateX(5px)}}@media(max-width:900px){.mm-top,.mm-bottom{grid-template-columns:1fr}.mm-help{display:none}}@media(max-width:680px){.mm-levels,.mm-nexts,.mm-stats{grid-template-columns:1fr}}`}</style></main>;
}
