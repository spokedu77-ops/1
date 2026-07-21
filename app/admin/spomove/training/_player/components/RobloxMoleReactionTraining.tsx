'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import {
  MOLE_HOLES_SINGLE,
  pickRandomHole,
  pickTwoDifferentColors,
  pickTwoDifferentHoles,
  type MoleHole,
} from '../lib/moleHoleLayouts';
import { pickRandomMoleLook, type MoleLook, type MoleLookMode } from '../lib/moleLooks';
import { normalizeReactSpeedSec, speedSecToMs } from '../lib/reactTrainTiming';

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  lookMode?: MoleLookMode;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const MOLE_COLORS = [
  { hex: '#e12835', lane: 0 as const },
  { hex: '#0074bd', lane: 1 as const },
  { hex: '#27b758', lane: 2 as const },
  { hex: '#f5cd30', lane: 3 as const },
] as const;

type ActiveMole = { holeId: number; hex: string; lane: number; look: MoleLook };

const css = `
.rmt{--bg:#1a2e14;--hud-h:72px;position:fixed;inset:0;height:100dvh;max-height:100dvh;background:var(--bg);color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.rmt,.rmt *{box-sizing:border-box}
.rmt-hud{height:var(--hud-h);display:flex;align-items:stretch;background:rgba(12,22,10,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.rmt-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.06)}
.rmt-hc.grow{flex:1;align-items:center;border-right:none}
.rmt-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.32);text-transform:uppercase}
.rmt-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.rmt-hv.warn{animation:rmtw .5s ease-in-out infinite}
@keyframes rmtw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.rmt-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.45);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer}
.rmt-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.rmt-play{position:relative;flex:1;min-height:0;display:flex;padding:0}
.rmt-field{position:relative;flex:1;min-height:0;overflow:hidden;background:radial-gradient(ellipse 120% 80% at 50% 100%,#2d4a22 0%,#1a2e14 55%,#0f1a0c 100%)}
.rmt-field::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.03) 1px,transparent 1px);background-size:18px 18px;pointer-events:none;opacity:.6}
.rmt-hole-wrap{position:absolute;width:clamp(76px,13vw,128px);height:clamp(76px,13vw,128px);transform:translate(-50%,-50%);z-index:2}
.rmt-hole-glow{position:absolute;inset:-22%;border-radius:50%;opacity:0;transition:opacity .12s ease-out,transform .12s ease-out;pointer-events:none;filter:blur(8px)}
.rmt-hole-wrap--active .rmt-hole-glow{opacity:.72;transform:scale(1.05)}
.rmt-hole-ring{position:absolute;inset:-10%;border-radius:50%;opacity:0;border:3px solid transparent;transition:opacity .12s ease-out,border-color .12s ease-out,box-shadow .12s ease-out;pointer-events:none}
.rmt-hole-wrap--active .rmt-hole-ring{opacity:1;border-color:rgba(255,255,255,.35)}
.rmt-hole{width:100%;height:100%;background:#0a0a0a;border-radius:50%;position:relative;overflow:hidden;box-shadow:inset 0 14px 26px rgba(0,0,0,.95),0 3px 10px rgba(0,0,0,.4);border:2px solid rgba(0,0,0,.55);transition:border-color .12s,box-shadow .12s}
.rmt-hole-wrap--active .rmt-hole{box-shadow:inset 0 10px 20px rgba(0,0,0,.85),0 0 24px rgba(255,255,255,.08)}
.rmt-mole{width:92%;height:100%;position:absolute;left:50%;transform:translateX(-50%);bottom:-100%;transition:bottom .2s cubic-bezier(.175,.885,.32,1.275);display:flex;justify-content:flex-end;overflow:visible}
.rmt-mole.up{bottom:0}
.rmt-mole-body{width:100%;height:100%;border-radius:48% 48% 44% 44%;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:22%;border:2.5px solid rgba(0,0,0,.52);box-shadow:inset -6px 0 12px rgba(0,0,0,.16),inset 6px 0 10px rgba(255,255,255,.1),0 3px 8px rgba(0,0,0,.35)}
.rmt-eyes{display:flex;gap:clamp(10px,22%,18px);margin-bottom:clamp(5px,10%,9px);position:relative;z-index:2}
.rmt-eye{width:clamp(5px,14%,8px);height:clamp(10px,24%,14px);background:#111;border-radius:50%;flex-shrink:0}
.rmt-nose{width:clamp(22px,62%,34px);height:clamp(11px,22%,16px);background:#f48a9a;border-radius:999px;border:2px solid rgba(0,0,0,.45);position:relative;flex-shrink:0;box-shadow:inset -2px -2px 0 rgba(0,0,0,.1);z-index:2}
.rmt-nose::after{content:'';position:absolute;top:15%;right:18%;width:28%;height:32%;background:rgba(255,255,255,.5);border-radius:50%}
.rmt-acc{position:absolute;pointer-events:none;z-index:3}
.rmt-acc--sunglasses{left:50%;top:24%;transform:translateX(-50%);width:72%;height:18%;display:flex;align-items:center;justify-content:center;gap:14%}
.rmt-acc--sunglasses-bar{position:absolute;left:8%;right:8%;top:42%;height:18%;background:#111;border-radius:999px;border:2px solid rgba(255,255,255,.15)}
.rmt-acc--lens{width:28%;height:100%;background:#111;border-radius:999px;border:2.5px solid rgba(255,255,255,.22);box-shadow:inset 0 0 0 2px rgba(255,255,255,.08)}
.rmt-acc--cap{left:8%;right:8%;top:-8%;height:34%;background:#1e3a8a;border-radius:999px 999px 12% 12%;border:2px solid rgba(0,0,0,.45);box-shadow:inset 0 4px 0 rgba(255,255,255,.12)}
.rmt-acc--cap::after{content:'';position:absolute;left:-8%;right:-8%;top:58%;height:22%;background:#1e40af;border-radius:999px;border:2px solid rgba(0,0,0,.4)}
.rmt-acc--topHat{left:18%;right:18%;top:-28%;height:42%;background:#111827;border:2px solid rgba(0,0,0,.5);border-radius:4px 4px 0 0;box-shadow:inset 0 3px 0 rgba(255,255,255,.08)}
.rmt-acc--topHat::after{content:'';position:absolute;left:-22%;right:-22%;bottom:-18%;height:18%;background:#111827;border-radius:999px;border:2px solid rgba(0,0,0,.45)}
.rmt-acc--bow{left:50%;top:58%;transform:translateX(-50%);width:42%;height:16%;background:#ec4899;border-radius:4px;border:2px solid rgba(0,0,0,.35)}
.rmt-acc--bow::before,.rmt-acc--bow::after{content:'';position:absolute;top:10%;width:38%;height:120%;background:#db2777;border-radius:50% 50% 40% 40%;border:2px solid rgba(0,0,0,.3)}
.rmt-acc--bow::before{left:-28%;transform:rotate(-18deg)}
.rmt-acc--bow::after{right:-28%;transform:rotate(18deg)}
.rmt-combo{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(.7);z-index:40;text-align:center;pointer-events:none;opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.rmt-combo.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.rmt-combo-n{font-family:Bebas Neue,sans-serif;font-size:clamp(60px,12vw,110px);color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5);line-height:1}
.rmt-combo-w{font-size:clamp(10px,1.8vw,14px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.45)}
${REACT_TRAIN_VIEWPORT_CSS}
`;

function MoleAccessories({ look }: { look: MoleLook }) {
  if (look === 'default') return null;
  if (look === 'sunglasses') {
    return (
      <div className="rmt-acc rmt-acc--sunglasses" aria-hidden>
        <div className="rmt-acc--sunglasses-bar" />
        <div className="rmt-acc--lens" />
        <div className="rmt-acc--lens" />
      </div>
    );
  }
  if (look === 'cap') return <div className="rmt-acc rmt-acc--cap" aria-hidden />;
  if (look === 'topHat') return <div className="rmt-acc rmt-acc--topHat" aria-hidden />;
  if (look === 'bow') return <div className="rmt-acc rmt-acc--bow" aria-hidden />;
  return null;
}

function MoleHoleView({
  hole,
  active,
  hex,
  look = 'default',
}: {
  hole: MoleHole;
  active: boolean;
  hex: string;
  look?: MoleLook;
}) {
  const scale = hole.scale ?? 1;
  const rot = hole.rotateDeg ?? 0;
  return (
    <div
      className={`rmt-hole-wrap${active ? ' rmt-hole-wrap--active' : ''}`}
      style={{
        left: `${hole.xPct}%`,
        top: `${hole.yPct}%`,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`,
      }}
    >
      {active ? (
        <>
          <div className="rmt-hole-glow" style={{ backgroundColor: hex }} aria-hidden />
          <div
            className="rmt-hole-ring"
            style={{ borderColor: hex, boxShadow: `0 0 28px 6px ${hex}88, inset 0 0 16px ${hex}44` }}
            aria-hidden
          />
        </>
      ) : null}
      <div className="rmt-hole">
        <div className={`rmt-mole${active ? ' up' : ''}`}>
          <div className="rmt-mole-body" style={{ backgroundColor: hex }}>
            <MoleAccessories look={active ? look : 'default'} />
            <div className="rmt-eyes">
              <div className="rmt-eye" />
              <div className="rmt-eye" />
            </div>
            <div className="rmt-nose" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MoleField({
  uid,
  holes,
  activeMap,
}: {
  uid: string;
  holes: MoleHole[];
  activeMap: Map<number, ActiveMole>;
}) {
  return (
    <div className="rmt-field">
      {holes.map((hole) => {
        const active = activeMap.get(hole.id);
        return (
          <MoleHoleView
            key={`${uid}-h${hole.id}`}
            hole={hole}
            active={Boolean(active)}
            hex={active?.hex ?? '#3d2817'}
            look={active?.look ?? 'default'}
          />
        );
      })}
    </div>
  );
}

function addActiveMole(
  next: Map<number, ActiveMole>,
  hole: MoleHole,
  color: (typeof MOLE_COLORS)[number],
  lookMode: MoleLookMode,
) {
  next.set(hole.id, {
    holeId: hole.id,
    hex: color.hex,
    lane: color.lane,
    look: pickRandomMoleLook(lookMode),
  });
}

export function RobloxMoleReactionTraining({
  durationSec,
  speedLevel,
  speedSec,
  lookMode = 'classic',
  onExit,
  onComplete,
}: Props) {
  const uid = useId();
  const gRef = useRef<{
    running: boolean;
    timeLeft: number;
    exposeMs: number;
    cadenceMs: number;
    stims: number;
    combo: number;
    maxCombo: number;
    laneCount: [number, number, number, number];
    lastHoleSingle: number;
    lastHolePairA: number;
    lastHolePairB: number;
    spawnCount: number;
    lastSpawnDualBoth: boolean;
    timer: ReturnType<typeof setInterval> | null;
    hideTimer: ReturnType<typeof setTimeout> | null;
    nextTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const hudMaxRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboNRef = useRef<HTMLDivElement>(null);
  const [warn, setWarn] = useState(false);
  const [activeMap, setActiveMap] = useState<Map<number, ActiveMole>>(() => new Map());

  const clearSpawnTimers = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    if (g.hideTimer) {
      clearTimeout(g.hideTimer);
      g.hideTimer = null;
    }
    if (g.nextTimer) {
      clearTimeout(g.nextTimer);
      g.nextTimer = null;
    }
  }, []);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    clearSpawnTimers();
    onComplete({
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, [clearSpawnTimers, onComplete]);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    clearSpawnTimers();
    onComplete({
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, [clearSpawnTimers, onComplete]);

  const showCombo = useCallback((combo: number) => {
    if (combo < 5 || combo % 5 !== 0 || !comboRef.current || !comboNRef.current) return;
    comboNRef.current.textContent = String(combo);
    comboRef.current.classList.remove('show');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = comboRef.current;
        if (!el) return;
        el.classList.add('show');
        const r = el as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
        clearTimeout(r._t);
        r._t = setTimeout(() => el.classList.remove('show'), 650);
      }),
    );
  }, []);

  useEffect(() => {
    const lv = Math.max(1, Math.min(7, Math.round(speedLevel)));
    const normalizedSpeedSec = normalizeReactSpeedSec(speedSec);
    const cadenceMs = speedSecToMs(normalizedSpeedSec, { minMs: 700, maxMs: 6000 });
    const stepDur = Math.max(320, 820 - (lv - 1) * 70);
    const baseExposeMs = Math.max(
      300,
      Math.min(1100, Math.round(stepDur * 0.95), Math.round(cadenceMs * 0.75)),
    );
    const exposeMs = Math.min(1650, Math.round(baseExposeMs * 1.5));
    const g = {
      running: true,
      timeLeft: Math.max(1, durationSec),
      exposeMs,
      cadenceMs,
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0] as [number, number, number, number],
      lastHoleSingle: -1,
      lastHolePairA: -1,
      lastHolePairB: -1,
      spawnCount: 0,
      lastSpawnDualBoth: false,
      timer: null as ReturnType<typeof setInterval> | null,
      hideTimer: null as ReturnType<typeof setTimeout> | null,
      nextTimer: null as ReturnType<typeof setTimeout> | null,
    };
    gRef.current = g;

    const setHud = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
      if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);
      setWarn(g.timeLeft <= 10);
    };

    const registerStim = (lane: number) => {
      g.stims += 1;
      g.combo += 1;
      g.laneCount[lane] += 1;
      if (g.combo > g.maxCombo) g.maxCombo = g.combo;
      setHud();
      showCombo(g.combo);
    };

    const triggerMixed = () => {
      g.spawnCount += 1;
      const warmupSingleOnly = g.spawnCount <= 4;
      const spawnPair =
        lookMode === 'variant' && !warmupSingleOnly && Math.random() < 0.5;
      g.lastSpawnDualBoth = spawnPair;
      const next = new Map<number, ActiveMole>();

      if (spawnPair) {
        const [holeA, holeB] = pickTwoDifferentHoles(
          MOLE_HOLES_SINGLE,
          g.lastHolePairA,
          g.lastHolePairB,
        );
        g.lastHolePairA = holeA.id;
        g.lastHolePairB = holeB.id;
        g.lastHoleSingle = holeA.id;
        const [colorA, colorB] = pickTwoDifferentColors(MOLE_COLORS);
        registerStim(colorA.lane);
        registerStim(colorB.lane);
        addActiveMole(next, holeA, colorA, lookMode);
        addActiveMole(next, holeB, colorB, lookMode);
      } else {
        const hole = pickRandomHole(MOLE_HOLES_SINGLE, g.lastHoleSingle);
        g.lastHoleSingle = hole.id;
        const color = MOLE_COLORS[Math.floor(Math.random() * MOLE_COLORS.length)]!;
        registerStim(color.lane);
        addActiveMole(next, hole, color, lookMode);
      }

      setActiveMap(next);
    };

    const triggerMole = () => {
      if (!g.running) return;
      triggerMixed();
      g.hideTimer = setTimeout(() => setActiveMap(new Map()), g.exposeMs);
    };

    const scheduleNext = (delayMs: number) => {
      if (!g.running) return;
      g.nextTimer = setTimeout(() => {
        if (!g.running) return;
        triggerMole();
        const nextDelay = g.lastSpawnDualBoth ? Math.round(g.cadenceMs * 1.2) : g.cadenceMs;
        scheduleNext(nextDelay);
      }, delayMs);
    };

    setActiveMap(new Map());
    setHud();
    scheduleNext(g.cadenceMs);
    const endsAtMs = performance.now() + durationSec * 1000;
    g.timer = setInterval(() => {
      const newLeft = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
      if (g.timeLeft !== newLeft) {
        g.timeLeft = newLeft;
        setHud();
      }
      if (g.timeLeft <= 0) {
        if (g.timer) clearInterval(g.timer);
        g.timer = null;
        endGame();
      }
    }, 250);

    return () => {
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      clearSpawnTimers();
    };
  }, [clearSpawnTimers, durationSec, endGame, lookMode, showCombo, speedLevel, speedSec]);

  return (
    <div className="rmt">
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Noto+Sans+KR:wght@500;700;900&display=swap');",
        }}
      />
      <style>{css}</style>

      <div className="rmt-hud">
        <div className="rmt-hc">
          <div className="rmt-hk">Time</div>
          <div ref={hudTimeRef} className={`rmt-hv${warn ? ' warn' : ''}`} />
        </div>
        <div className="rmt-hc">
          <div className="rmt-hk">Stims</div>
          <div ref={hudStimsRef} className="rmt-hv" />
        </div>
        <div className="rmt-hc grow">
          <div className="rmt-hk">Max Streak</div>
          <div ref={hudMaxRef} className="rmt-hv" />
        </div>
        <div className="rmt-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.06)' }}>
          <button type="button" className="rmt-stop" onClick={stopGame}>
            STOP
          </button>
        </div>
      </div>

      <div className="rmt-play">
        <MoleField uid={uid} holes={MOLE_HOLES_SINGLE} activeMap={activeMap} />
        <div className="rmt-combo" ref={comboRef}>
          <div className="rmt-combo-n" ref={comboNRef}>
            0
          </div>
          <div className="rmt-combo-w">COMBO</div>
        </div>
      </div>
    </div>
  );
}
