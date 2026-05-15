'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { speedSecToMs } from '../lib/reactTrainTiming';

const COLORS = [
  { main: '#FF1744', rgb: '255,23,68', name: 'RED' },
  { main: '#FFD600', rgb: '255,214,0', name: 'YEL' },
  { main: '#2979FF', rgb: '41,121,255', name: 'BLU' },
  { main: '#00E676', rgb: '0,230,118', name: 'GRN' },
] as const;

type BlackoutState = {
  running: boolean;
  timeLeft: number;
  stepDur: number;
  holdDur: number;
  restDur: number;
  diff: number;
  roundTimer: ReturnType<typeof setTimeout> | null;
  /** vanish 체인용 — roundTimer만으로는 forEach 타이머가 누락되어 이전 라운드 콜백이 남을 수 있음 */
  roundTimers: ReturnType<typeof setTimeout>[];
  timer: ReturnType<typeof setInterval> | null;
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
};

const css = `
.bot{--bg:#07070F;position:fixed;inset:0;background:var(--bg);color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.bot,.bot *{box-sizing:border-box}
.bot-hud{height:72px;display:flex;align-items:stretch;background:rgba(7,7,15,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(12px,2.5vw,30px);z-index:30}
.bot-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.bot-hc.grow{flex:1;align-items:center;border-right:none}
.bot-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.bot-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.bot-hv.warn{animation:botw .5s ease-in-out infinite}
@keyframes botw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.bot-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer}
.bot-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.bot-play{position:relative;flex:1;min-height:0}
.bot-grid{position:absolute;inset:4px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4px;z-index:10}
.bot-quad{border-radius:14px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;transition:opacity .28s ease,transform .28s ease}
.bot-quad[data-c="0"]{background:#FF1744}
.bot-quad[data-c="1"]{background:#FFD600}
.bot-quad[data-c="2"]{background:#2979FF}
.bot-quad[data-c="3"]{background:#00E676}
.bot-quad::before{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0px,rgba(0,0,0,.18) 1px,transparent 1px,transparent 22px),repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0px,rgba(0,0,0,.18) 1px,transparent 1px,transparent 22px);pointer-events:none}
.bot-quad.gone{opacity:0;transform:scale(.92)}
.bot-label{font-family:Bebas Neue,sans-serif;font-size:clamp(20px,5vw,52px);letter-spacing:.1em;color:rgba(255,255,255,.35);z-index:2;pointer-events:none}
.bot-stim{position:absolute;inset:0;z-index:20;pointer-events:none;opacity:0;transition:opacity .06s}
.bot-seq{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);z-index:25;display:flex;gap:8px;pointer-events:none}
.bot-dot{width:10px;height:10px;border-radius:50%;opacity:.15;transition:all .2s;border:2px solid transparent}
.bot-dot.filled{opacity:.9;transform:scale(1.2)}
.bot-dot.last{opacity:1;transform:scale(1.5);border-color:rgba(255,255,255,.8);box-shadow:0 0 10px currentColor}
.bot-pad-label{position:absolute;font-family:Bebas Neue,sans-serif;font-size:clamp(13px,2.2vw,22px);letter-spacing:.1em;pointer-events:none;z-index:22;opacity:.1;transition:opacity .08s}
.bot-pad-label.lit{opacity:1}
.bot-pad-label.l0{top:14px;left:14px;color:#FF1744}
.bot-pad-label.l1{top:14px;right:14px;color:#FFD600}
.bot-pad-label.l2{bottom:12px;left:14px;color:#2979FF}
.bot-pad-label.l3{bottom:12px;right:14px;color:#00E676}
.bot-combo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.7);z-index:40;text-align:center;pointer-events:none;opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.bot-combo.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.bot-combo-n{font-family:Bebas Neue,sans-serif;font-size:clamp(60px,12vw,110px);color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5);line-height:1}
.bot-combo-w{font-size:clamp(10px,1.8vw,14px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.4)}
`;

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j] as T;
    out[j] = tmp as T;
  }
  return out;
}

export function BlackoutReactionTraining({ durationSec, speedLevel, speedSec, onExit, onComplete }: Props) {
  const uid = useId();
  const gRef = useRef<BlackoutState | null>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const hudMaxRef = useRef<HTMLDivElement>(null);
  const quadRefs = useRef<(HTMLDivElement | null)[]>([]);
  const padLabelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const seqRef = useRef<HTMLDivElement>(null);
  const stimRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboNRef = useRef<HTMLDivElement>(null);
  const [warn, setWarn] = useState(false);

  const clearRoundTimer = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    if (g.roundTimer) {
      clearTimeout(g.roundTimer);
      g.roundTimer = null;
    }
    if (g.roundTimers?.length) {
      for (const t of g.roundTimers) clearTimeout(t);
      g.roundTimers.length = 0;
    }
  }, []);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    clearRoundTimer();
    onExit();
  }, [clearRoundTimer, onExit]);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    clearRoundTimer();
    onComplete({
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, [clearRoundTimer, onComplete]);

  useEffect(() => {
    const lv = Math.max(1, Math.min(7, Math.round(speedLevel)));
    const diff = lv <= 3 ? 1 : lv <= 6 ? 2 : 3;
    const targetRoundMs = speedSecToMs(speedSec, { minMs: 900, maxMs: 6000 });
    const restDur = Math.max(320, Math.min(1200, Math.round(targetRoundMs * 0.28)));
    const holdDur = Math.max(380, Math.min(2200, Math.round(targetRoundMs * 0.42)));
    const vanishBudget = Math.max(240, targetRoundMs - restDur - holdDur);
    const stepDur = Math.max(110, Math.min(1200, Math.round(vanishBudget / Math.max(1, diff))));
    const g: BlackoutState = {
      running: true,
      timeLeft: Math.max(1, durationSec),
      stepDur,
      holdDur,
      restDur,
      diff,
      roundTimer: null,
      roundTimers: [],
      timer: null,
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
    };

    const pushRoundTimer = (t: ReturnType<typeof setTimeout>) => {
      g.roundTimers.push(t);
      g.roundTimer = t;
    };
    gRef.current = g;

    const setHudTime = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(g.timeLeft <= 10);
    };

    const restoreAll = () => {
      quadRefs.current.forEach((q) => q?.classList.remove('gone'));
      padLabelRefs.current.forEach((l) => l?.classList.remove('lit'));
      if (seqRef.current) seqRef.current.innerHTML = '';
    };

    const updateSeq = (seq: number[]) => {
      const host = seqRef.current;
      if (!host) return;
      host.innerHTML = '';
      for (let i = 0; i < g.diff; i++) {
        const dot = document.createElement('div');
        dot.className = 'bot-dot';
        if (i < seq.length) {
          const color = COLORS[seq[i] as 0 | 1 | 2 | 3]?.main ?? '#fff';
          dot.style.background = color;
          dot.style.color = color;
          dot.classList.add('filled');
          if (i === seq.length - 1) dot.classList.add('last');
        }
        host.appendChild(dot);
      }
    };

    const onStim = (lane: number) => {
      if (!g.running) return;
      g.stims += 1;
      g.combo += 1;
      g.laneCount[lane] += 1;
      if (g.combo > g.maxCombo) g.maxCombo = g.combo;
      if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
      if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);

      const stim = stimRef.current;
      if (stim) {
        stim.style.background = `rgba(${COLORS[lane as 0 | 1 | 2 | 3].rgb},0.6)`;
        stim.style.transition = 'none';
        stim.style.opacity = '1';
        const t = stim as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
        clearTimeout(t._t);
        t._t = setTimeout(() => {
          stim.style.transition = 'opacity .5s ease-out';
          stim.style.opacity = '0';
        }, 80);
      }

      const label = padLabelRefs.current[lane];
      if (label) {
        label.classList.add('lit');
        const l = label as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
        clearTimeout(l._t);
        l._t = setTimeout(() => label.classList.remove('lit'), 350);
      }

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
          })
        );
      }

      pushRoundTimer(
        setTimeout(() => {
          if (!g.running) return;
          nextRound();
        }, g.restDur)
      );
    };

    /** 4칸 전부 다시 보인 뒤 소거 시작(직전 라운드와 같은 색이 첫 소거여도 한 박자 보이도록) */
    const fullGridBeforeVanishMs = 420;

    const nextRound = () => {
      if (!g.running) return;
      clearRoundTimer();
      restoreAll();
      pushRoundTimer(
        setTimeout(() => {
          if (!g.running) return;
          const vanishSeq = shuffle([0, 1, 2, 3]).slice(0, g.diff);
          updateSeq(vanishSeq);
          vanishSeq.forEach((lane, idx) => {
            pushRoundTimer(
              setTimeout(() => {
                if (!g.running) return;
                quadRefs.current[lane]?.classList.add('gone');
                if (idx === vanishSeq.length - 1) {
                  pushRoundTimer(
                    setTimeout(() => {
                      const target = vanishSeq[vanishSeq.length - 1];
                      if (typeof target === 'number') onStim(target);
                    }, g.holdDur)
                  );
                }
              }, idx * g.stepDur)
            );
          });
        }, fullGridBeforeVanishMs)
      );
    };

    setHudTime();
    if (hudStimsRef.current) hudStimsRef.current.textContent = '0';
    if (hudMaxRef.current) hudMaxRef.current.textContent = '0';

    g.timer = setInterval(() => {
      g.timeLeft -= 1;
      setHudTime();
      if (g.timeLeft <= 0) endGame();
    }, 1000);

    pushRoundTimer(setTimeout(nextRound, 500));

    return () => {
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      clearRoundTimer();
    };
  }, [clearRoundTimer, durationSec, endGame, speedLevel, speedSec]);

  return (
    <div className="bot">
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Noto+Sans+KR:wght@500;700;900&display=swap');",
        }}
      />
      <style>{css}</style>
      <div className="bot-hud">
        <div className="bot-hc">
          <div className="bot-hk">Time</div>
          <div ref={hudTimeRef} className={`bot-hv${warn ? ' warn' : ''}`} />
        </div>
        <div className="bot-hc">
          <div className="bot-hk">Stims</div>
          <div ref={hudStimsRef} className="bot-hv" />
        </div>
        <div className="bot-hc grow">
          <div className="bot-hk">Max Streak</div>
          <div ref={hudMaxRef} className="bot-hv" />
        </div>
        <div className="bot-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="bot-stop" onClick={stopGame}>
            STOP
          </button>
        </div>
      </div>

      <div className="bot-play">
        <div className="bot-grid">
          {[0, 1, 2, 3].map((lane) => (
            <div
              key={uid + 'q' + lane}
              className="bot-quad"
              data-c={lane}
              ref={(el) => {
                quadRefs.current[lane] = el;
              }}
            >
              <div className="bot-label">{COLORS[lane].name}</div>
            </div>
          ))}
        </div>
        <div ref={stimRef} className="bot-stim" />
        <div ref={seqRef} className="bot-seq" />
        {[0, 1, 2, 3].map((lane) => (
          <div
            key={uid + 'l' + lane}
            className={`bot-pad-label l${lane}`}
            ref={(el) => {
              padLabelRefs.current[lane] = el;
            }}
          >
            {COLORS[lane].name}
          </div>
        ))}

        <div className="bot-combo" ref={comboRef}>
          <div className="bot-combo-n" ref={comboNRef}>
            0
          </div>
          <div className="bot-combo-w">COMBO</div>
        </div>
      </div>
    </div>
  );
}
