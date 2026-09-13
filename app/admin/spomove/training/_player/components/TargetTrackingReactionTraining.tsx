'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bindViewportResize } from '../lib/bindViewportResize';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import {
  ReactTrainStartCountdownOverlay,
  REACT_TRAIN_START_COUNTDOWN_SEC,
  runReactTrainStartCountdown,
} from '../lib/reactTrainStartCountdown';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { useViewportScrollLock } from '../lib/lockViewportScroll';

export type ShellTrackingDifficulty = 'easy' | 'normal' | 'hard';
export type ShellTrackingSeconds = 2 | 3 | 4 | 5 | 6;
export type ShellTrackingShuffleCount = 4 | 6 | 8 | 10 | 12;

type PositionIndex = 0 | 1 | 2 | 3;
type NodeId = PositionIndex;
type Phase = 'COUNTDOWN' | 'TARGET' | 'HIDE' | 'TRACK' | 'RESPONSE' | 'ANSWER' | 'NEXT_ROUND';

type TrackingNode = {
  id: NodeId;
  currentPosIdx: PositionIndex;
};

type Props = {
  targetRounds: number;
  difficulty: ShellTrackingDifficulty;
  targetSeconds: ShellTrackingSeconds;
  shuffleCount: ShellTrackingShuffleCount;
  responseSeconds: ShellTrackingSeconds;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const ANSWER_DURATION_MS = 2000;
const HIDE_DURATION_MS = 500;
const SWAP_DURATION_MS: Record<ShellTrackingDifficulty, number> = {
  easy: 600,
  normal: 400,
  hard: 250,
};

const QUADRANTS = [
  { name: '빨강', color: '#ef4444', wash: 'rgba(239,68,68,.22)' },
  { name: '노랑', color: '#facc15', wash: 'rgba(250,204,21,.22)' },
  { name: '초록', color: '#22c55e', wash: 'rgba(34,197,94,.22)' },
  { name: '파랑', color: '#3b82f6', wash: 'rgba(59,130,246,.22)' },
] as const;

const INITIAL_NODES: TrackingNode[] = [
  { id: 0, currentPosIdx: 0 },
  { id: 1, currentPosIdx: 1 },
  { id: 2, currentPosIdx: 2 },
  { id: 3, currentPosIdx: 3 },
];

function randomPosition(): PositionIndex {
  return Math.floor(Math.random() * 4) as PositionIndex;
}

function wait(
  ms: number,
  token: number,
  tokenRef: { current: number },
  timers: Set<number>,
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      resolve(tokenRef.current === token);
    }, ms);
    timers.add(timer);
  });
}

const css = `
.ttrk{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#080b12;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.ttrk,.ttrk *{box-sizing:border-box}
.ttrk-hud{height:72px;display:flex;align-items:stretch;background:rgba(8,11,18,.94);border-bottom:1px solid rgba(255,255,255,.08);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:20;flex-shrink:0}
.ttrk-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.08)}
.ttrk-hc.grow{flex:1;align-items:center;border-right:0}
.ttrk-hk{font-size:10px;font-weight:700;letter-spacing:.16em;color:rgba(255,255,255,.42);text-transform:uppercase}
.ttrk-hv{font-size:clamp(21px,3.2vw,32px);font-weight:800;line-height:1.1}
.ttrk-title{font-size:clamp(15px,2vw,20px);font-weight:800}
.ttrk-stop{align-self:center;margin-left:auto;padding:9px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:transparent;color:rgba(255,255,255,.7);font:700 13px inherit;letter-spacing:.08em;cursor:pointer;display:flex;align-items:center;gap:6px}
.ttrk-play{position:relative;flex:1;min-height:0;overflow:hidden}
.ttrk-board{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.ttrk-quadrant{position:relative;border:1px solid rgba(255,255,255,.1);transition:background-color .2s ease,box-shadow .2s ease}
.ttrk-quadrant.answer{z-index:1}
.ttrk-qlabel{position:absolute;inset:14px auto auto 16px;font-size:clamp(13px,2vw,19px);font-weight:800;color:rgba(255,255,255,.65)}
.ttrk-node{position:absolute;left:25%;top:25%;width:clamp(58px,10vmin,112px);aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);background:#f4f4f5;border:4px solid rgba(255,255,255,.86);box-shadow:0 10px 28px rgba(0,0,0,.38);transition-property:left,top;transition-timing-function:cubic-bezier(.4,0,.2,1);z-index:4}
.ttrk-node.target{background:#f97316;border-color:#fff;box-shadow:0 0 0 9px rgba(249,115,22,.4),0 0 52px 22px rgba(249,115,22,.9);animation:ttrk-target-pulse .7s ease-in-out infinite alternate}
.ttrk-node.target::after{content:'목표';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:clamp(15px,2.5vmin,24px);font-weight:900;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.45)}
@keyframes ttrk-target-pulse{from{transform:translate(-50%,-50%) scale(1)}to{transform:translate(-50%,-50%) scale(1.12)}}
.ttrk-message{position:absolute;z-index:10;left:50%;top:clamp(18px,5vh,52px);transform:translateX(-50%);padding:10px 24px;border-radius:999px;background:rgba(5,8,14,.72);font-size:clamp(18px,3vw,30px);font-weight:900;white-space:nowrap;box-shadow:0 8px 30px rgba(0,0,0,.25)}
${REACT_TRAIN_VIEWPORT_CSS}
`;

export function TargetTrackingReactionTraining({
  targetRounds,
  difficulty,
  targetSeconds,
  shuffleCount,
  responseSeconds,
  onExit,
  onComplete,
}: Props) {
  useViewportScrollLock(true);
  const totalRounds = Math.max(1, Math.round(targetRounds));
  const swapDuration = SWAP_DURATION_MS[difficulty];
  const [phase, setPhase] = useState<Phase>('COUNTDOWN');
  const [round, setRound] = useState(1);
  const [nodes, setNodes] = useState<TrackingNode[]>(INITIAL_NODES);
  const [targetNodeId, setTargetNodeId] = useState<NodeId>(0);
  const [answerPos, setAnswerPos] = useState<PositionIndex | null>(null);
  const [startCountdown, setStartCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const playRef = useRef<HTMLDivElement>(null);
  const runTokenRef = useRef(0);
  const timersRef = useRef(new Set<number>());
  const completedRoundsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);

  const complete = useCallback(() => {
    runTokenRef.current += 1;
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current.clear();
    onCompleteRef.current({
      stims: completedRoundsRef.current,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
    });
  }, []);

  const stop = useCallback(() => {
    runTokenRef.current += 1;
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current.clear();
    onCompleteRef.current({
      stims: completedRoundsRef.current,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const tokenRef = runTokenRef;

    const runRound = async (roundNumber: number) => {
      const token = ++tokenRef.current;
      const roundNodes = INITIAL_NODES.map((node) => ({ ...node }));
      const targetId = randomPosition();
      setRound(roundNumber);
      setNodes(roundNodes);
      setTargetNodeId(targetId);
      setAnswerPos(null);
      setPhase('TARGET');
      if (!(await wait(targetSeconds * 1000, token, tokenRef, timersRef.current))) return;

      setPhase('HIDE');
      if (!(await wait(HIDE_DURATION_MS, token, tokenRef, timersRef.current))) return;

      setPhase('TRACK');
      for (let i = 0; i < shuffleCount; i += 1) {
        const posA = randomPosition();
        let posB = randomPosition();
        while (posB === posA) posB = randomPosition();
        const nodeA = roundNodes.find((node) => node.currentPosIdx === posA);
        const nodeB = roundNodes.find((node) => node.currentPosIdx === posB);
        if (!nodeA || !nodeB) return;
        nodeA.currentPosIdx = posB;
        nodeB.currentPosIdx = posA;
        setNodes(roundNodes.map((node) => ({ ...node })));
        if (!(await wait(swapDuration, token, tokenRef, timersRef.current))) return;
      }

      setPhase('RESPONSE');
      if (!(await wait(responseSeconds * 1000, token, tokenRef, timersRef.current))) return;

      const targetNode = roundNodes.find((node) => node.id === targetId);
      if (!targetNode) return;
      setAnswerPos(targetNode.currentPosIdx);
      setPhase('ANSWER');
      if (!(await wait(ANSWER_DURATION_MS, token, tokenRef, timersRef.current))) return;

      completedRoundsRef.current = roundNumber;
      if (roundNumber >= totalRounds) complete();
      else {
        setPhase('NEXT_ROUND');
        if (await wait(0, token, tokenRef, timersRef.current)) void runRound(roundNumber + 1);
      }
    };

    const stopCountdown = runReactTrainStartCountdown({
      onTick: (value) => { if (mounted) setStartCountdown(value); },
      onDone: () => { if (mounted) void runRound(1); },
    });
    const unbindResize = bindViewportResize(playRef.current, () => undefined);

    return () => {
      mounted = false;
      stopCountdown();
      unbindResize();
      tokenRef.current += 1;
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current.clear();
    };
  }, [complete, responseSeconds, shuffleCount, swapDuration, targetSeconds, totalRounds]);

  const message = useMemo(() => {
    if (phase === 'TARGET') return '목표를 기억하세요';
    if (phase === 'HIDE' || phase === 'TRACK') return '끝까지 따라가세요';
    if (phase === 'RESPONSE') return '어디에 있을까요?';
    if (phase === 'ANSWER') return '정답 확인';
    return '';
  }, [phase]);

  return (
    <div className="ttrk">
      <style>{css}</style>
      <div className="ttrk-hud">
        <div className="ttrk-hc">
          <div className="ttrk-hk">Round</div>
          <div className="ttrk-hv">{round} / {totalRounds}</div>
        </div>
        <div className="ttrk-hc grow"><div className="ttrk-title">목표 끝까지 따라가기</div></div>
        <div className="ttrk-hc" style={{ borderRight: 0, borderLeft: '1px solid rgba(255,255,255,.08)' }}>
          <button type="button" className="ttrk-stop" onClick={stop}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>
      <div className="ttrk-play" ref={playRef}>
        <div className="ttrk-board">
          {QUADRANTS.map((quadrant, index) => (
            <div
              key={quadrant.name}
              className={`ttrk-quadrant${phase === 'ANSWER' && answerPos === index ? ' answer' : ''}`}
              style={{
                background: quadrant.wash,
                boxShadow: phase === 'ANSWER' && answerPos === index
                  ? `inset 0 0 0 5px ${quadrant.color}, inset 0 0 70px ${quadrant.color}`
                  : undefined,
              }}
            >
              <span className="ttrk-qlabel" style={{ color: quadrant.color }}>{quadrant.name}</span>
            </div>
          ))}
        </div>
        {nodes.map((node) => {
          const pos = node.currentPosIdx;
          const highlighted = node.id === targetNodeId && (phase === 'TARGET' || phase === 'ANSWER');
          return (
            <div
              key={node.id}
              className={`ttrk-node${highlighted ? ' target' : ''}`}
              style={{
                left: pos === 0 || pos === 2 ? '25%' : '75%',
                top: pos === 0 || pos === 1 ? '25%' : '75%',
                transitionDuration: `${swapDuration}ms`,
              }}
            />
          );
        })}
        {message ? <div className="ttrk-message">{message}</div> : null}
        <ReactTrainStartCountdownOverlay countdown={startCountdown} />
      </div>
    </div>
  );
}
