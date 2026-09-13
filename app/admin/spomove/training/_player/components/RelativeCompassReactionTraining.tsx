'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { bindViewportResize } from '../lib/bindViewportResize';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import { ReactTrainStartCountdownOverlay, REACT_TRAIN_START_COUNTDOWN_SEC, runReactTrainStartCountdown } from '../lib/reactTrainStartCountdown';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';

export type RelativeCompassDifficulty = 'easy' | 'normal' | 'hard';
export type RelativeCompassSeconds = 2 | 3 | 4 | 5 | 6;
export type RelativeDirection = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';
type Position = { x: 0 | 1; y: 0 | 1 };
type Phase = 'COUNTDOWN' | 'START_POSITION' | 'CUE' | 'RESPONSE' | 'UPDATE' | 'NEXT_CUE';

type Props = {
  targetRounds: number;
  difficulty: RelativeCompassDifficulty;
  startSeconds: RelativeCompassSeconds;
  responseSeconds: RelativeCompassSeconds;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const UPDATE_DURATION_MS = 1000;
const DIRECTIONS: Record<RelativeDirection, { dx: -1 | 0 | 1; dy: -1 | 0 | 1; rotation: number }> = {
  up: { dx: 0, dy: -1, rotation: 0 },
  'up-right': { dx: 1, dy: -1, rotation: 45 },
  right: { dx: 1, dy: 0, rotation: 90 },
  'down-right': { dx: 1, dy: 1, rotation: 135 },
  down: { dx: 0, dy: 1, rotation: 180 },
  'down-left': { dx: -1, dy: 1, rotation: 225 },
  left: { dx: -1, dy: 0, rotation: 270 },
  'up-left': { dx: -1, dy: -1, rotation: 315 },
};
const CARDINALS: RelativeDirection[] = ['up', 'down', 'left', 'right'];
const ALL_DIRECTIONS = Object.keys(DIRECTIONS) as RelativeDirection[];
const PADS = [
  { x: 0, y: 0, name: '빨강', color: '#ef4444' },
  { x: 1, y: 0, name: '노랑', color: '#facc15' },
  { x: 0, y: 1, name: '초록', color: '#22c55e' },
  { x: 1, y: 1, name: '파랑', color: '#3b82f6' },
] as const;

function samePosition(a: Position, b: Position) { return a.x === b.x && a.y === b.y; }
function applyDirection(pos: Position, direction: RelativeDirection): Position | null {
  const vector = DIRECTIONS[direction];
  const x = pos.x + vector.dx;
  const y = pos.y + vector.dy;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x: x as 0 | 1, y: y as 0 | 1 };
}
function validDirections(pos: Position, diagonal: boolean): RelativeDirection[] {
  return (diagonal ? ALL_DIRECTIONS : CARDINALS).filter((direction) => applyDirection(pos, direction) !== null);
}
function pick<T>(values: T[]): T { return values[Math.floor(Math.random() * values.length)]!; }
function buildCue(pos: Position, difficulty: RelativeCompassDifficulty) {
  const first = pick(validDirections(pos, difficulty !== 'easy'));
  const intermediate = applyDirection(pos, first)!;
  if (difficulty !== 'hard') return { directions: [first], target: intermediate };
  const validSecond = validDirections(intermediate, true);
  const noImmediateReturn = validSecond.filter((direction) => {
    const target = applyDirection(intermediate, direction);
    return target && !samePosition(target, pos);
  });
  const second = pick(noImmediateReturn.length ? noImmediateReturn : validSecond);
  return { directions: [first, second], target: applyDirection(intermediate, second)! };
}
function wait(ms: number, token: number, tokenRef: { current: number }, timers: Set<number>) {
  return new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => { timers.delete(timer); resolve(tokenRef.current === token); }, ms);
    timers.add(timer);
  });
}
function Arrow({ direction }: { direction: RelativeDirection }) {
  return (
    <svg viewBox="0 0 120 120" aria-label={direction} className="rcmp-arrow" style={{ transform: `rotate(${DIRECTIONS[direction].rotation}deg)` }}>
      <path d="M60 108V24M25 58l35-35 35 35" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const css = `
.rcmp{position:fixed;inset:0;height:100dvh;background:#090d16;color:#fff;z-index:320;display:flex;flex-direction:column;overflow:hidden;font-family:Barlow Condensed,Noto Sans KR,sans-serif}.rcmp *{box-sizing:border-box}
.rcmp-hud{height:74px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:max(0px,env(safe-area-inset-top)) clamp(16px,3vw,34px) 0;border-bottom:1px solid rgba(255,255,255,.09);background:#0c111c;flex:none}.rcmp-title{font-size:clamp(16px,2vw,22px);font-weight:850}.rcmp-round{font-size:clamp(18px,2.5vw,27px);font-weight:900}.rcmp-meta{justify-self:end;display:flex;align-items:center;gap:14px;color:rgba(255,255,255,.62);font-size:13px;font-weight:800}.rcmp-stop{display:flex;align-items:center;gap:6px;padding:8px 15px;border-radius:10px;border:1px solid rgba(255,255,255,.17);background:transparent;color:rgba(255,255,255,.7);font:700 13px inherit;cursor:pointer}
.rcmp-stage{position:relative;flex:1;min-height:0;display:grid;place-items:center;padding:clamp(18px,4vh,42px)}.rcmp-cue{display:flex;align-items:center;justify-content:center;gap:clamp(28px,7vw,90px)}.rcmp-step{display:flex;align-items:center;gap:12px}.rcmp-stepnum{font-size:clamp(14px,2vw,21px);font-weight:900;color:rgba(255,255,255,.42)}.rcmp-arrow{width:clamp(145px,29vmin,330px);height:clamp(145px,29vmin,330px);color:#fff;filter:drop-shadow(0 0 22px rgba(255,255,255,.18))}
.rcmp-start{text-align:center}.rcmp-start-label{font-size:clamp(17px,2.5vw,26px);font-weight:700;color:rgba(255,255,255,.58)}.rcmp-start-color{margin-top:12px;font-size:clamp(42px,8vw,88px);font-weight:900}.rcmp-update{font-size:clamp(28px,5vw,58px);font-weight:900;color:rgba(255,255,255,.88)}
.rcmp-map{position:absolute;right:clamp(16px,3vw,36px);bottom:clamp(22px,5vh,52px);width:clamp(112px,15vw,180px);display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:rgba(5,8,14,.7)}.rcmp-tile{aspect-ratio:1;border-radius:8px;display:grid;place-items:center;font-size:11px;font-weight:850;color:#fff;border:2px solid transparent;opacity:.58}.rcmp-tile.current{opacity:1;border-color:#fff;box-shadow:0 0 17px rgba(255,255,255,.55)}.rcmp-status{position:absolute;left:clamp(16px,3vw,36px);bottom:clamp(28px,6vh,62px);font-size:13px;font-weight:800;color:rgba(255,255,255,.5)}.rcmp-status strong{display:block;margin-top:5px;font-size:20px;color:#fff}.rcmp-progress{position:absolute;left:0;right:0;bottom:0;height:5px;background:rgba(255,255,255,.1)}.rcmp-progress>i{display:block;height:100%;background:#f97316;transition:width .05s linear}
${REACT_TRAIN_VIEWPORT_CSS}`;

export function RelativeCompassReactionTraining({ targetRounds, difficulty, startSeconds, responseSeconds, onExit, onComplete }: Props) {
  useViewportScrollLock(true);
  const totalRounds = Math.max(1, Math.round(targetRounds));
  const [phase, setPhase] = useState<Phase>('COUNTDOWN');
  const [round, setRound] = useState(1);
  const [currentPos, setCurrentPos] = useState<Position>({ x: 0, y: 0 });
  const [directions, setDirections] = useState<RelativeDirection[]>([]);
  const [progress, setProgress] = useState(1);
  const [startCountdown, setStartCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const stageRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(0);
  const timersRef = useRef(new Set<number>());
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(0);
  const completeRef = useRef(onComplete);
  const exitRef = useRef(onExit);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { exitRef.current = onExit; }, [onExit]);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current.clear();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  const finish = useCallback(() => {
    cancel();
    completeRef.current({ stims: completedRef.current, maxCombo: 0, laneCount: [0, 0, 0, 0] });
  }, [cancel]);
  const stop = useCallback(() => finish(), [finish]);

  useEffect(() => {
    let mounted = true;
    const animateProgress = (duration: number, token: number) => {
      const started = performance.now();
      const tick = (now: number) => {
        if (tokenRef.current !== token) return;
        setProgress(Math.max(0, 1 - (now - started) / duration));
        if (now - started < duration) rafRef.current = requestAnimationFrame(tick);
      };
      setProgress(1);
      rafRef.current = requestAnimationFrame(tick);
    };
    const runCue = async (cueRound: number, origin: Position) => {
      const token = ++tokenRef.current;
      const cue = buildCue(origin, difficulty);
      setRound(cueRound);
      setDirections(cue.directions);
      setPhase('CUE');
      setPhase('RESPONSE');
      animateProgress(responseSeconds * 1000, token);
      if (!(await wait(responseSeconds * 1000, token, tokenRef, timersRef.current))) return;
      setCurrentPos(cue.target);
      setPhase('UPDATE');
      setProgress(0);
      if (!(await wait(UPDATE_DURATION_MS, token, tokenRef, timersRef.current))) return;
      completedRef.current = cueRound;
      if (cueRound >= totalRounds) finish();
      else {
        setPhase('NEXT_CUE');
        if (await wait(0, token, tokenRef, timersRef.current)) void runCue(cueRound + 1, cue.target);
      }
    };
    const begin = async () => {
      const token = ++tokenRef.current;
      const start: Position = { x: Math.random() < .5 ? 0 : 1, y: Math.random() < .5 ? 0 : 1 };
      setCurrentPos(start);
      setPhase('START_POSITION');
      animateProgress(startSeconds * 1000, token);
      if (await wait(startSeconds * 1000, token, tokenRef, timersRef.current)) void runCue(1, start);
    };
    const stopCountdown = runReactTrainStartCountdown({ onTick: (value) => mounted && setStartCountdown(value), onDone: () => { if (mounted) void begin(); } });
    const unbindResize = bindViewportResize(stageRef.current, () => undefined);
    return () => { mounted = false; stopCountdown(); unbindResize(); cancel(); };
  }, [cancel, difficulty, finish, responseSeconds, startSeconds, totalRounds]);

  const currentPad = PADS.find((pad) => pad.x === currentPos.x && pad.y === currentPos.y)!;
  return <div className="rcmp"><style>{css}</style><header className="rcmp-hud"><div className="rcmp-title">내 자리에서 방향 따라가기</div><div className="rcmp-round">ROUND {String(round).padStart(2, '0')} / {String(totalRounds).padStart(2, '0')}</div><div className="rcmp-meta"><span>난이도 {difficulty === 'easy' ? '쉬움' : difficulty === 'hard' ? '어려움' : '보통'}</span><button type="button" className="rcmp-stop" onClick={stop}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden><rect x="6" y="6" width="4" height="12" rx="1"/><rect x="14" y="6" width="4" height="12" rx="1"/></svg>STOP</button></div></header><main className="rcmp-stage" ref={stageRef}>{phase === 'START_POSITION' ? <div className="rcmp-start"><div className="rcmp-start-label">여기에서 시작하세요</div><div className="rcmp-start-color" style={{ color: currentPad.color }}>{currentPad.name}</div></div> : phase === 'UPDATE' ? <div className="rcmp-update">다음 위치</div> : phase === 'RESPONSE' || phase === 'CUE' ? <div className="rcmp-cue">{directions.map((direction, index) => <div className="rcmp-step" key={`${direction}-${index}`}>{directions.length > 1 ? <span className="rcmp-stepnum">{index + 1}</span> : null}<Arrow direction={direction}/></div>)}</div> : null}<div className="rcmp-status">현재 위치<strong><span style={{ color: currentPad.color }}>●</span> {currentPad.name}</strong></div><div className="rcmp-map">{PADS.map((pad) => <div key={pad.name} className={`rcmp-tile${pad.x === currentPos.x && pad.y === currentPos.y ? ' current' : ''}`} style={{ background: pad.color }}>{pad.name}</div>)}</div><div className="rcmp-progress"><i style={{ width: `${progress * 100}%` }}/></div><ReactTrainStartCountdownOverlay countdown={startCountdown}/></main></div>;
}
