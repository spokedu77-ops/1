'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { normalizeReactSpeedSec, speedSecToMs } from '../lib/reactTrainTiming';

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const MOLE_COLORS = [
  { hex: '#e12835', lane: 0 as const }, // RED
  { hex: '#0074bd', lane: 1 as const }, // BLUE
  { hex: '#27b758', lane: 2 as const }, // GREEN
  { hex: '#f5cd30', lane: 3 as const }, // YELLOW
] as const;

const css = `
.rmt{--bg:#2c241b;position:fixed;inset:0;background:var(--bg);color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.rmt,.rmt *{box-sizing:border-box}
.rmt-hud{height:72px;display:flex;align-items:stretch;background:rgba(25,21,16,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06);padding:0 clamp(12px,2.5vw,30px);z-index:30}
.rmt-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.06)}
.rmt-hc.grow{flex:1;align-items:center;border-right:none}
.rmt-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.32);text-transform:uppercase}
.rmt-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.rmt-hv.warn{animation:rmtw .5s ease-in-out infinite}
@keyframes rmtw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.rmt-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.45);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer}
.rmt-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.rmt-play{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:8px}
.rmt-board{width:min(96vw,calc(100vh - 104px));height:min(96vw,calc(100vh - 104px));display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:clamp(10px,1.8vw,18px);background:#545454;padding:clamp(12px,1.8vw,22px);border-radius:6px;border:4px solid #333;box-shadow:0 14px 0 #1f1f1f,0 24px 30px rgba(0,0,0,.45);background-image:linear-gradient(rgba(255,255,255,.05) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.05) 2px,transparent 2px);background-size:24px 24px;transform:perspective(900px) rotateX(6deg)}
.rmt-hole{width:100%;height:100%;background:#111;border-radius:4px;position:relative;overflow:hidden;border-top:6px solid #1a1a1a;border-left:6px solid #333;border-bottom:2px solid #777;border-right:2px solid #777;box-shadow:inset 0 20px 25px rgba(0,0,0,1)}
.rmt-mole{width:84%;height:84%;border-radius:4px;position:absolute;left:50%;transform:translateX(-50%);bottom:-88%;transition:bottom .2s cubic-bezier(.175,.885,.32,1.275);display:flex;flex-direction:column;align-items:center;padding-top:14px;box-shadow:inset 4px 4px 0 rgba(255,255,255,.36),inset -4px -4px 0 rgba(0,0,0,.28);border:2px solid rgba(0,0,0,.78)}
.rmt-mole.up{bottom:6px}
.rmt-eyes{display:flex;gap:14px;margin-bottom:6px}
.rmt-eye{width:11px;height:11px;background:#111;border-radius:2px}
.rmt-snout{position:relative;width:30px;height:20px;background:rgba(0,0,0,.16);border-radius:4px;display:flex;justify-content:center;align-items:center}
.rmt-nose{width:14px;height:9px;background:#ff8a80;border-radius:3px}
.rmt-snout::before,.rmt-snout::after{content:'';position:absolute;width:12px;height:2px;background:#222;top:8px}
.rmt-snout::before{left:-14px;transform:rotate(10deg)}
.rmt-snout::after{right:-14px;transform:rotate(-10deg)}
.rmt-combo{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(.7);z-index:40;text-align:center;pointer-events:none;opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.rmt-combo.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.rmt-combo-n{font-family:Bebas Neue,sans-serif;font-size:clamp(60px,12vw,110px);color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5);line-height:1}
.rmt-combo-w{font-size:clamp(10px,1.8vw,14px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.45)}
`;

export function RobloxMoleReactionTraining({ durationSec, speedLevel, speedSec, onExit, onComplete }: Props) {
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
    lastHole: number;
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
  const [holesUp, setHolesUp] = useState<boolean[]>(() => Array.from({ length: 9 }, () => false));
  const [holeColors, setHoleColors] = useState<string[]>(() => Array.from({ length: 9 }, () => '#d97706'));

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
    if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    clearSpawnTimers();
    onExit();
  }, [clearSpawnTimers, onExit]);

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

  useEffect(() => {
    const lv = Math.max(1, Math.min(7, Math.round(speedLevel)));
    // speedSec(설정한 초)를 직접 cadence에 반영해 체감 템포를 맞춘다.
    const normalizedSpeedSec = normalizeReactSpeedSec(speedSec);
    const cadenceMs = speedSecToMs(normalizedSpeedSec, { minMs: 700, maxMs: 6000 });
    // 노출 시간은 난이도/주기 모두를 고려하되, 다음 출현보다 너무 길어지지 않게 제한.
    const stepDur = Math.max(320, 820 - (lv - 1) * 70);
    const exposeMs = Math.max(
      300,
      Math.min(
        1100,
        Math.round(stepDur * 0.95),
        Math.round(cadenceMs * 0.75),
      ),
    );
    const g = {
      running: true,
      timeLeft: Math.max(1, durationSec),
      exposeMs,
      cadenceMs,
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0] as [number, number, number, number],
      lastHole: -1,
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

    const triggerMole = () => {
      if (!g.running) return;
      let hole = Math.floor(Math.random() * 9);
      if (hole === g.lastHole) hole = (hole + 1 + Math.floor(Math.random() * 8)) % 9;
      g.lastHole = hole;
      const color = MOLE_COLORS[Math.floor(Math.random() * MOLE_COLORS.length)]!;
      g.stims += 1;
      g.combo += 1;
      g.laneCount[color.lane] += 1;
      if (g.combo > g.maxCombo) g.maxCombo = g.combo;
      setHud();

      setHoleColors((prev) => {
        const next = [...prev];
        next[hole] = color.hex;
        return next;
      });
      setHolesUp(Array.from({ length: 9 }, (_, i) => i === hole));

      if (g.combo >= 5 && g.combo % 5 === 0 && comboRef.current && comboNRef.current) {
        comboNRef.current.textContent = String(g.combo);
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
      }

      g.hideTimer = setTimeout(() => {
        setHolesUp(Array.from({ length: 9 }, () => false));
      }, g.exposeMs);
    };

    const scheduleNext = (delayMs: number) => {
      if (!g.running) return;
      g.nextTimer = setTimeout(() => {
        if (!g.running) return;
        triggerMole();
        scheduleNext(g.cadenceMs);
      }, delayMs);
    };

    setHud();
    scheduleNext(g.cadenceMs);
    g.timer = setInterval(() => {
      g.timeLeft -= 1;
      setHud();
      if (g.timeLeft <= 0) endGame();
    }, 1000);

    return () => {
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      clearSpawnTimers();
    };
  }, [clearSpawnTimers, durationSec, endGame, speedLevel, speedSec]);

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
        <div className="rmt-board">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={`${uid}-h${i}`} className="rmt-hole">
              <div className={`rmt-mole${holesUp[i] ? ' up' : ''}`} style={{ backgroundColor: holeColors[i] }}>
                <div className="rmt-eyes">
                  <div className="rmt-eye" />
                  <div className="rmt-eye" />
                </div>
                <div className="rmt-snout">
                  <div className="rmt-nose" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
