'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpomoveDiveEnvironments } from '@/app/lib/admin/hooks/useSpomoveDiveEnvironments';
import { resolveDivePanoramaUrls } from '@/app/lib/spomove/diveThemes';
import { BeatRushDiveScene } from './BeatRushDiveScene';
import { BeatRushImpactAudio } from './BeatRushImpactAudio';
import { useEngineStopRequest } from '../lib/engineStopRequest';
import { spomoveCancelAnimationFrame as cancelAnimationFrame, spomovePerformance as performance, spomoveRequestAnimationFrame as requestAnimationFrame } from '../lib/runtimeClock';
import { bindViewportResize } from '../lib/bindViewportResize';
import { setupCanvas } from '../lib/canvasUtils';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import { ReactTrainStartCountdownOverlay, REACT_TRAIN_START_COUNTDOWN_SEC, runReactTrainStartCountdown } from '../lib/reactTrainStartCountdown';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';

// Visual lane order follows the reference; result indices retain the canonical
// red/blue/green/yellow order used by laneCountToColorStimulusCounts.
const LANES = [
  { color: '#ff4268', name: '빨강', resultIndex: 0 },
  { color: '#ffda45', name: '노랑', resultIndex: 3 },
  { color: '#39e6a0', name: '초록', resultIndex: 2 },
  { color: '#489bff', name: '파랑', resultIndex: 1 },
] as const;
type Note = { lane: number; age: number; hold: number; presented: boolean; lastPulse?: number; lastBeat?: number };
type Spark = { lane: number; age: number; angle: number; speed: number; size: number };
type Props = { durationSec: number; speedSec: number; effectsEnabled: boolean; onComplete: (stats: ReactTrainCompleteStats) => void };

export function BeatRushTraining({ durationSec, speedSec, effectsEnabled, onComplete }: Props) {
  const worldRef = useRef<HTMLDivElement>(null);
  const impactAudioRef = useRef<BeatRushImpactAudio | null>(null);
  const effectsRef = useRef(effectsEnabled);
  useEffect(() => { effectsRef.current = effectsEnabled; if (!effectsEnabled) impactAudioRef.current?.stop(); }, [effectsEnabled]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spaceRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BeatRushDiveScene | null>(null);
  const { data: environments, getPreviewUrl } = useSpomoveDiveEnvironments();
  const panorama = useMemo(() => resolveDivePanoramaUrls('space', environments.themes.space, getPreviewUrl), [environments.themes.space, getPreviewUrl]);
  const panoramaRef = useRef(panorama);
  useEffect(() => { panoramaRef.current = panorama; sceneRef.current?.setPanorama(panorama); }, [panorama]);
  const hostRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef(onComplete);
  const finishRef = useRef<(early: boolean) => void>(() => {});
  const [countdown, setCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const [presented, setPresented] = useState(0);
  const [holding, setHolding] = useState(false);
  const duration = Math.max(1, Math.round(Number(durationSec) || 60));
  const [remaining, setRemaining] = useState(duration);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  const stop = useCallback(() => finishRef.current(true), []);
  useEngineStopRequest(stop);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const space = spaceRef.current;
    if (!canvas || !host || !space) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const diveScene = new BeatRushDiveScene(space);
    sceneRef.current = diveScene;
    diveScene.setPanorama(panoramaRef.current);
    const fontFamily = getComputedStyle(host).fontFamily;
    const travel = Math.max(1, Math.min(6, Number(speedSec) || 3));
    const interval = travel * 1.25;
    const counts: [number, number, number, number] = [0, 0, 0, 0];
    const notes: Note[] = [];
    const sparks: Spark[] = [];
    const impactAudio = new BeatRushImpactAudio();
    impactAudioRef.current = impactAudio;
    // A shuffled two-item bag guarantees one short and one long per pair.
    const lengths: boolean[] = [];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0, height = 0, dpr = 1, elapsed = 0, spawned = 0, count = 0;
    let running = true, raf: number | null = null, last = 0, lastLane = -1;
    let flashLane = -1, flashAge = 1;
    let lastSecond = duration;
    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return;
      const size = setupCanvas(canvas, host.clientWidth, host.clientHeight);
      width = size.cssW; height = size.cssH; dpr = size.dpr;
      diveScene.resize(width, height);
    };
    const finish = (early: boolean) => {
      if (!running) return;
      running = false;
      if (raf !== null) cancelAnimationFrame(raf);
      impactAudio.stop();
      if (worldRef.current) worldRef.current.style.transform = 'none';
      completeRef.current({ stims: count, maxCombo: 0, laneCount: [...counts], stoppedEarly: early,
        completionReason: early ? (count === 0 ? 'cancelled' : 'stopped_early') : 'natural_complete' });
    };
    finishRef.current = finish;
    // All faces, rails and the arrival line share this stationary projection.
    // Progress zero is the front edge at spawn, one is the SAME edge at arrival.
    const point = (progress: number, laneX: number) => {
      const p = Math.max(0, Math.min(1.075, progress));
      const scale = 0.08 / (1.08 - p);
      return { x: width / 2 + laneX * width * 0.44 * scale,
        y: height * .43 + height * (height < 450 ? .30 : .40) * scale, scale };
    };
    const laneEnd = (laneX: number) => ({ x: width / 2 + laneX * width * .44 * ((1 - .43) / (height < 450 ? .30 : .40)), y: height });
    const polygon = (points: Array<{ x: number; y: number }>, fill: string, stroke?: string) => {
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
    };
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      // Ground markings and side beacons flow from the eye-level horizon,
      // past the strike line and below the viewer. No continuous camera bob.
      const phase = elapsed / (travel * 2) * (reducedMotion ? .35 : 1);
      for (let i = 0; i < 18; i++) {
        const depth = ((i / 18 + phase) % 1) * 1.065;
        const a = point(depth, -1), b = point(depth, 1);
        ctx.strokeStyle = '#79aaff40'; ctx.lineWidth = Math.max(1, a.scale * 1.3);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        for (const side of [-1, 1]) {
          const p = point(depth, side * 1.08), q = point(Math.max(0, depth - .018), side * 1.08);
          ctx.strokeStyle = '#a4dfff99'; ctx.lineWidth = Math.max(1, p.scale * 3);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      LANES.forEach((lane, index) => {
        const left = -1 + index * .5, right = left + .5;
        const laneShape = [point(0, left), point(0, right), laneEnd(right), laneEnd(left)];
        polygon(laneShape, lane.color + '0c');
        const activeHold = notes.some(n => n.lane === index && n.presented && n.age < travel + n.hold);
        const impact = flashLane === index ? Math.max(0, 1 - flashAge / .65) : 0;
        if (impact || activeHold) {
          ctx.save(); ctx.globalAlpha = activeHold ? .28 : impact * .42;
          polygon(laneShape, lane.color);
          ctx.restore();
        }
        ctx.save(); ctx.shadowColor = lane.color; ctx.shadowBlur = 12;
        ctx.strokeStyle = lane.color + '99'; ctx.lineWidth = 1.5;
        for (const edge of [left, right]) {
          const a = point(0, edge), b = laneEnd(edge);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        const a = point(1, left + .035), b = point(1, right - .035);
        // A recessed landing pad with a crisp luminous strike edge.
        ctx.fillStyle = '#081322';
        ctx.beginPath(); ctx.roundRect(a.x, a.y - 9, b.x - a.x, 20, 7); ctx.fill();
        ctx.strokeStyle = lane.color; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = lane.color; ctx.fillRect(a.x + 5, a.y - 2, Math.max(1, b.x - a.x - 10), 4);
        ctx.shadowBlur = 20;
        if (impact > 0) {
          const burst = 1 - impact;
          ctx.globalAlpha = impact;
          ctx.lineWidth = 2 + impact * 4;
          ctx.beginPath(); ctx.ellipse((a.x + b.x) / 2, a.y, (b.x - a.x) * (.2 + burst * .55), 5 + burst * height * .055, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = impact * .65;
          ctx.fillRect(a.x, a.y - 3, b.x - a.x, 6);
        }
        ctx.restore();
        const labelWidth = Math.min(68, (b.x - a.x) * .85);
        ctx.fillStyle = '#06101ed9'; ctx.strokeStyle = lane.color + '55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect((a.x + b.x - labelWidth) / 2, a.y + 19, labelWidth, 25, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = lane.color;
        ctx.font = `600 ${Math.max(11, Math.min(14, width / 42))}px ${fontFamily}`;
        ctx.textAlign = 'center'; ctx.fillText(lane.name, (a.x + b.x) / 2, a.y + 36);
      });
      // Far-to-near rendering prevents distant blocks painting over near ones.
      for (const note of [...notes].reverse()) {
        const front = Math.min(1, note.age / travel);
        const back = Math.max(0, (note.age - (note.hold || travel * .08)) / travel);
        const left = -1 + note.lane * .5 + .055, right = left + .39;
        const fl = point(front, left), fr = point(front, right);
        const bl = point(back, left), br = point(back, right);
        const lift = Math.max(1, 32 * fl.scale), backLift = Math.max(1, 32 * bl.scale);
        const color = LANES[note.lane].color;
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 10 + fl.scale * 20;
        ctx.globalAlpha = .22;
        polygon([bl, br, fr, fl], color);
        ctx.globalAlpha = 1;
        polygon([{ x: bl.x, y: bl.y - backLift }, { x: br.x, y: br.y - backLift }, { x: fr.x, y: fr.y - lift }, { x: fl.x, y: fl.y - lift }], color, color);
        ctx.fillStyle = color;
        ctx.fillRect(fl.x, fl.y - lift, fr.x - fl.x, lift);
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(fl.x, fl.y - lift, fr.x - fl.x, lift);
        // Bright top edge and inset rails make the block a solid, readable shape.
        ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, fl.scale * 2);
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y - backLift); ctx.lineTo(fl.x, fl.y - lift); ctx.lineTo(fr.x, fr.y - lift); ctx.lineTo(br.x, br.y - backLift); ctx.stroke();
        if (note.hold) {
          for (let p = back + .035; p < front; p += .055) {
            const l = point(p, left + .04), r = point(p, right - .04);
            ctx.strokeStyle = color + 'bb'; ctx.lineWidth = Math.max(1, l.scale * 2);
            ctx.beginPath(); ctx.moveTo(l.x, l.y - 32 * l.scale); ctx.lineTo(r.x, r.y - 32 * r.scale); ctx.stroke();
          }
        }
        ctx.restore();
      }
      // Capped, time-based sparks: no per-frame random scoring or camera motion.
      for (const spark of sparks) {
        const center = point(1, - .75 + spark.lane * .5);
        const life = Math.max(0, 1 - spark.age / .75);
        const distance = spark.speed * spark.age * Math.min(width / 1000, 1);
        const x = center.x + Math.cos(spark.angle) * distance;
        const y = center.y + Math.sin(spark.angle) * distance + spark.age * spark.age * 90;
        ctx.save(); ctx.globalAlpha = life; ctx.strokeStyle = LANES[spark.lane].color;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12; ctx.lineWidth = spark.size * life;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(spark.angle) * 14 * life, y - Math.sin(spark.angle) * 14 * life); ctx.stroke(); ctx.restore();
      }
      if (flashAge < .65) {
        ctx.save(); ctx.globalAlpha = Math.min(1, (1 - flashAge / .65) * 2);
        ctx.fillStyle = LANES[flashLane].color; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 20;
        ctx.textAlign = 'center'; ctx.font = `800 ${Math.min(54, Math.max(25, width * .045))}px ${fontFamily}`;
        ctx.fillText('BEAT!', width / 2, height * .45 - (reducedMotion ? 0 : flashAge * 18)); ctx.restore();
      }
    };
    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.max(0, (now - last) / 1000); last = now;
      const step = Math.min(dt, Math.max(0, duration - elapsed));
      elapsed += step; flashAge += step;
      for (let i = sparks.length - 1; i >= 0; i--) { sparks[i].age += step; if (sparks[i].age >= .75) sparks.splice(i, 1); }
      const seconds = Math.ceil(duration - elapsed);
      if (seconds !== lastSecond) { lastSecond = seconds; setRemaining(seconds); }
      if (elapsed + travel < duration && elapsed >= .5 + spawned * interval) {
        const choices = [0, 1, 2, 3].filter(lane => lane !== lastLane);
        lastLane = choices[Math.floor(Math.random() * choices.length)];
        if (lengths.length === 0) lengths.push(...(Math.random() < .5 ? [false, true] : [true, false]));
        notes.push({ lane: lastLane, age: 0, hold: lengths.shift() ? travel * .45 : 0, presented: false });
        spawned++;
      }
      let isHolding = false;
      for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i]; note.age += step;
        if (!note.presented && note.age >= travel) {
          note.presented = true; count++; counts[LANES[note.lane].resultIndex]++;
          flashLane = note.lane; flashAge = 0; setPresented(count);
          if (effectsRef.current) impactAudio.play();
          const amount = reducedMotion ? 8 : 42;
          for (let j = 0; j < amount && sparks.length < 180; j++) sparks.push({ lane: note.lane, age: 0, angle: -Math.PI + Math.random() * Math.PI, speed: 100 + Math.random() * 340, size: 1.5 + Math.random() * 3 });
        }
        if (note.presented && note.age < travel + note.hold) {
          isHolding = true;
          if (note.age - (note.lastBeat ?? travel) >= .18) {
            note.lastBeat = note.age;
            if (effectsRef.current) impactAudio.play(true);
          }
          if (!reducedMotion && note.age - (note.lastPulse ?? travel) >= .12) {
            note.lastPulse = note.age;
            for (let j = 0; j < 6 && sparks.length < 180; j++) sparks.push({ lane: note.lane, age: 0, angle: -Math.PI + Math.random() * Math.PI, speed: 80 + Math.random() * 160, size: 1 + Math.random() * 2 });
          }
        }
        if (note.age >= travel + note.hold + .12) notes.splice(i, 1);
      }
      setHolding(isHolding);
      if (worldRef.current) {
        const envelope = reducedMotion ? 0 : Math.max(0, 1 - flashAge / .16);
        const amplitude = Math.min(2.6, width * .0045) * envelope;
        worldRef.current.style.transform = envelope > 0
          ? `translate3d(${Math.sin(flashAge * 95) * amplitude}px,${Math.sin(flashAge * 70) * amplitude * .55}px,0)`
          : 'none';
      }
      diveScene.render(step, reducedMotion);
      draw();
      if (elapsed >= duration) { finish(false); return; }
      raf = requestAnimationFrame(loop);
    };
    resize(); diveScene.render(0, reducedMotion); draw(); setPresented(0); setHolding(false); setRemaining(duration);
    const unbind = bindViewportResize(host, resize);
    const stopCountdown = runReactTrainStartCountdown({ onTick: setCountdown, onDone: () => {
      if (!running) return; last = performance.now(); raf = requestAnimationFrame(loop);
    } });
    return () => { running = false; stopCountdown(); unbind(); if (raf !== null) cancelAnimationFrame(raf); finishRef.current = () => {}; sceneRef.current = null; impactAudioRef.current = null; impactAudio.stop(); if (worldRef.current) worldRef.current.style.transform = 'none'; diveScene.dispose(); };
  }, [duration, speedSec]);

  return <div className="beat-rush">
    <style>{`
      .beat-rush{position:fixed;inset:0;z-index:320;height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#050917;color:#fff;font-family:var(--spm-font-body)}
      .beat-rush *{box-sizing:border-box}.beat-rush header{display:flex;align-items:center;gap:clamp(6px,2vw,16px);padding:calc(12px + env(safe-area-inset-top)) clamp(14px,3vw,32px) 12px;border-bottom:1px solid #ffffff18;background:#080c1c}.beat-rush header>span{font-size:clamp(10px,1.3vw,14px);color:#a9c6ec;white-space:nowrap}.beat-rush header>strong{white-space:nowrap}
      .beat-rush strong{font-size:clamp(16px,2vw,24px)}.beat-rush output{margin-left:auto;font:700 clamp(20px,3vw,32px) var(--spm-font-display);font-variant-numeric:tabular-nums}
      .beat-rush button{min-height:44px;padding:8px 16px;border:1px solid #ffffff40;border-radius:10px;background:transparent;color:white;cursor:pointer}.beat-rush button:focus-visible{outline:3px solid #68cfff;outline-offset:3px}
      .beat-rush-stage{position:relative;flex:1;min-height:0}.beat-rush-world{position:absolute;inset:0;pointer-events:none}.beat-rush canvas{position:absolute;width:100%;height:100%;inset:0}
      .beat-rush-hint{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 24px);display:flex;align-items:center;gap:10px;padding:11px 18px;border:1px solid #82bfff30;border-radius:16px;background:linear-gradient(110deg,#101d36e8,#080d20e8);box-shadow:0 8px 32px #0005,inset 0 1px #ffffff0d;backdrop-filter:blur(12px);text-align:center;font-size:clamp(11px,1.3vw,15px);color:#d5e0f5;pointer-events:none}
      .beat-rush-hint b{flex-shrink:0;font:700 10px var(--spm-font-display);letter-spacing:.12em;border-radius:7px;padding:5px 8px;background:#53baff18;color:#91d4ff}.beat-rush-hint[data-hold=true]{border-color:#91d4ff88;box-shadow:0 0 28px #53baff1a}.beat-rush-hint span{line-height:1.5}
      @media(max-height:500px){.beat-rush-hint{padding:6px 12px;bottom:6px}.beat-rush-hint b{display:none}}
      .beat-rush progress{display:block;flex-shrink:0;width:100%;height:5px;border:0;accent-color:#68cfff}.beat-rush progress::-webkit-progress-bar{background:#18233b}.beat-rush progress::-webkit-progress-value{background:#68cfff}
      ${REACT_TRAIN_VIEWPORT_CSS}
    `}</style>
    <header><strong>비트 러시</strong><span aria-label="제시한 블럭 수">{presented} BLOCKS</span><output aria-label="남은 시간">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</output><button type="button" onClick={stop}>STOP</button></header>
    <div className="beat-rush-stage" ref={hostRef}><div className="beat-rush-world" ref={worldRef}><canvas ref={spaceRef} aria-hidden="true" /><canvas ref={canvasRef} aria-label="다이브 우주 공간을 전진하며 빨강, 노랑, 초록, 파랑 레인의 블럭을 통과합니다" /></div><ReactTrainStartCountdownOverlay countdown={countdown} /><div className="beat-rush-hint" data-hold={holding}><b>{holding ? 'STEP' : 'HIT ZONE'}</b><span>{holding ? '같은 색 매트에서 가볍게 잔발 스텝' : '도착선에 닿으면 같은 색 매트로 이동'}</span></div></div>
    <progress value={duration - remaining} max={duration} aria-label="활동 시간 진행" />
  </div>;
}
