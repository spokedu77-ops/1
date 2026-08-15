'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { bindViewportResize } from '../lib/bindViewportResize';
import { staticPerfTier, PerfMonitor } from '../lib/reactTrainPerf';
import {
  ReactTrainStartCountdownOverlay,
  REACT_TRAIN_START_COUNTDOWN_SEC,
  runReactTrainStartCountdown,
} from '../lib/reactTrainStartCountdown';

import { setupCanvas } from '../lib/canvasUtils';

/** 하단 패드/가시 영역은 DOM 분리 — 플레이 캔버스 높이에는 포함되지 않음. 히트 라인은 캔버스 하단에서만 약간 올린다. */
function playBottomHitY(cvHeight: number): number {
  return cvHeight - Math.max(cvHeight * 0.035, 16);
}

/** 인덱스 순서: 빨 → 파 → 초 → 노 (좌→우 하단 패드·레인과 동일) */
const RT_COLORS = [
  { main: '#FF1744', rgb: '255,23,68', name: 'RED' },
  { main: '#2979FF', rgb: '41,121,255', name: 'BLUE' },
  { main: '#00E676', rgb: '0,230,118', name: 'GREEN' },
  { main: '#FFD600', rgb: '255,214,0', name: 'YELLOW' },
] as const;

const SPD_NAMES = ['매우 느림', '느림', '약간 느림', '보통', '약간 빠름', '빠름', '매우 빠름'];

export type ReactTrainVariant = 'flow' | 'flash' | 'pattern' | 'balloonSimon';

export type ReactTrainCompleteStats = {
  stims: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
};

type GameState = {
  running: boolean;
  mode: ReactTrainVariant;
  timeLeft: number;
  spd: number;
  lw: number;
  hitY: number;
  W: number;
  H: number;
  objs: (FlowTile | FlashBubble | SimonBalloon)[];
  particles: Particle[];
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
  baseSpd: number;
  spawnInt: number;
  lastSpawn: number;
  /** balloonSimon: 신호 속도(ms) — 스폰·체류에 직결 */
  cueMs: number;
  /** 연속 자극(히트 라인 통과) 사이 최소 시간(ms) — 스폰 간격과 별개로 터짐 간격 확보 */
  minStimGapMs: number;
  /** 마지막으로 실제 자극이 발생한 시각(ms) */
  lastStimWallMs: number;
  /** 이번 프레임에서 이미 한 건 자극 처리했으면 true (동시 다발 방지) */
  stimConsumedThisFrame: boolean;
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
  isLow: boolean;
};

function fillRoundPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect === 'function') {
    (ctx as CanvasRenderingContext2D & { roundRect: (a: number, b: number, c: number, d: number, e: number) => void }).roundRect(
      x,
      y,
      w,
      h,
      rr
    );
  } else {
    const x0 = x;
    const y0 = y;
    const x1 = x + w;
    const y1 = y + h;
    ctx.moveTo(x0 + rr, y0);
    ctx.lineTo(x1 - rr, y0);
    ctx.quadraticCurveTo(x1, y0, x1, y0 + rr);
    ctx.lineTo(x1, y1 - rr);
    ctx.quadraticCurveTo(x1, y1, x1 - rr, y1);
    ctx.lineTo(x0 + rr, y1);
    ctx.quadraticCurveTo(x0, y1, x0, y1 - rr);
    ctx.lineTo(x0, y0 + rr);
    ctx.quadraticCurveTo(x0, y0, x0 + rr, y0);
  }
  ctx.closePath();
}

class FlowTile {
  lane: number;
  isPattern: boolean;
  color: (typeof RT_COLORS)[number];
  w: number;
  x: number;
  h: number;
  y: number;
  speed: number;
  fired: boolean;
  dead: boolean;

  constructor(g: GameState, _cv: HTMLCanvasElement, lane: number, isPattern = false) {
    this.lane = lane;
    this.isPattern = isPattern;
    this.color = RT_COLORS[lane];
    this.w = g.lw * 0.7;
    this.x = lane * g.lw + (g.lw - this.w) / 2;
    this.h = Math.max(g.H * 0.1, 50);
    this.y = -this.h - 4;
    this.speed = g.baseSpd;
    this.fired = false;
    this.dead = false;
  }

  update(g: GameState, _cv: HTMLCanvasElement, nowMs: number, deltaSec: number, onLaneStim: (lane: number) => void) {
    if (this.fired) return;
    this.y += this.speed * deltaSec;
    if (this.y + this.h < g.hitY) return;
    this.y = g.hitY - this.h;
    const ready =
      this.isPattern
        ? true
        : nowMs - g.lastStimWallMs >= g.minStimGapMs && !g.stimConsumedThisFrame;
    if (!ready) return;
    this.fired = true;
    this.dead = true;
    if (!this.isPattern) {
      g.lastStimWallMs = nowMs;
      g.stimConsumedThisFrame = true;
    }
    onLaneStim(this.lane);
  }

  draw(ctx: CanvasRenderingContext2D, g: GameState) {
    if (this.dead) return;
    const top = this.y;
    const bot = Math.min(this.y + this.h, g.hitY);
    const dh = bot - top;
    if (dh <= 0) return;

    ctx.save();
    ctx.shadowColor = this.color.main;
    ctx.shadowBlur = g.isLow ? 4 : 24;
    const grd = ctx.createLinearGradient(0, top, 0, top + dh);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.22, this.color.main);
    grd.addColorStop(1, this.color.main);
    ctx.fillStyle = grd;
    fillRoundPath(ctx, this.x, top, this.w, dh, 13);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    fillRoundPath(ctx, this.x + 7, top + 8, this.w * 0.28, Math.min(dh * 0.5, 30), 7);
    ctx.fill();
    ctx.restore();
  }
}

/** 풍선 터뜨리기(FLASH): 위에서 낙하 → 하단 가시에 닿으면 터짐 */
class FlashBubble {
  lane: number;
  color: (typeof RT_COLORS)[number];
  r: number;
  x: number;
  y: number;
  speed: number;
  fired: boolean;
  dead: boolean;
  wobble: number;
  t: number;

  constructor(g: GameState) {
    this.lane = Math.floor(Math.random() * 4);
    this.color = RT_COLORS[this.lane];
    const r0 = Math.max(g.W * 0.07, 30);
    this.r = r0 + Math.random() * r0 * 0.5;
    this.x = this.r + Math.random() * Math.max(1, g.W - this.r * 2);
    this.y = -this.r * 2;
    this.speed = g.baseSpd * (0.75 + Math.random() * 0.5);
    this.fired = false;
    this.dead = false;
    this.wobble = (Math.random() - 0.5) * 0.4;
    this.t = 0;
  }

  update(
    g: GameState,
    _cv: HTMLCanvasElement,
    nowMs: number,
    deltaSec: number,
    onBubbleStim: (lane: number, x: number, y: number) => void
  ) {
    this.t++;
    if (!this.fired) {
      this.y += this.speed * deltaSec;
      this.x += Math.sin(this.t * 0.04 + this.wobble) * 0.8;
      if (this.y + this.r >= g.hitY) {
        this.y = g.hitY - this.r;
        const ready = nowMs - g.lastStimWallMs >= g.minStimGapMs && !g.stimConsumedThisFrame;
        if (ready) {
          this.fired = true;
          this.dead = true;
          g.lastStimWallMs = nowMs;
          g.stimConsumedThisFrame = true;
          onBubbleStim(this.lane, this.x, this.y);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, g: GameState) {
    if (this.dead) return;
    if (this.y - this.r > g.H) return;
    drawBubbleBody(ctx, g, this.x, this.y, this.r, this.color.main);
  }
}

/** 풍선 사이먼: 사이먼 극단 위치에 나타나 신호 속도에 맞춰 동시 터짐(바늘 없음) */
class SimonBalloon {
  lane: number;
  edge: number;
  color: (typeof RT_COLORS)[number];
  /** 스폰 반경 */
  baseR: number;
  r: number;
  x: number;
  y: number;
  fired: boolean;
  dead: boolean;
  wobble: number;
  t: number;
  triggerMs: number;

  constructor(g: GameState, index = 0, total = 1) {
    this.lane = Math.floor(Math.random() * 4);
    this.color = RT_COLORS[this.lane];
    const r0 = Math.max(Math.min(g.W, g.H) * 0.055, 34);
    this.baseR = r0 * (total > 1 ? 1.05 : 1.25);
    this.r = this.baseR;
    const maxR = this.baseR * 1.5;
    const edge = total > 1
      ? (index === 0 ? Math.floor(Math.random() * 4) : -1)
      : Math.floor(Math.random() * 4);
    const primaryEdge = edge >= 0 ? edge : 0;
    const opposite = [1, 0, 3, 2] as const;
    const resolvedEdge = total > 1 && index === 1 ? opposite[(g.objs.find((o) => o instanceof SimonBalloon && !o.dead) as SimonBalloon | undefined)?.edge ?? 0] : primaryEdge;
    this.edge = resolvedEdge;
    const midX = g.W / 2;
    const midY = Math.max(maxR, Math.min(g.hitY - maxR, g.hitY * 0.48));
    const leftX = maxR + g.W * 0.05;
    const rightX = g.W - maxR - g.W * 0.05;
    const topY = maxR + g.H * 0.08;
    const bottomY = Math.max(maxR, Math.min(g.hitY - maxR - 12, g.hitY - maxR - g.H * 0.05));
    if (resolvedEdge === 0) {
      this.x = leftX;
      this.y = midY;
    } else if (resolvedEdge === 1) {
      this.x = rightX;
      this.y = midY;
    } else if (resolvedEdge === 2) {
      this.x = midX;
      this.y = topY;
    } else {
      this.x = midX;
      this.y = bottomY;
    }
    this.fired = false;
    this.dead = false;
    this.wobble = (Math.random() - 0.5) * 0.4;
    this.t = 0;
    // 신호 속도(cueMs)에 맞춰 성장 후 터짐 — 다음 풍선 스폰과 같은 주기
    const cue = Math.max(800, g.cueMs);
    this.triggerMs = cue;
  }

  update(
    g: GameState,
    _cv: HTMLCanvasElement,
    nowMs: number,
    deltaSec: number,
    onBubbleStim: (lane: number, x: number, y: number) => void
  ) {
    this.t += deltaSec * 1000;
    if (!this.fired) {
      const growT = Math.min(1, this.t / Math.max(1, this.triggerMs));
      const eased = 1 - (1 - growT) * (1 - growT);
      this.r = this.baseR * (1 + 0.5 * eased);
      this.x += Math.sin(this.t * 0.01 + this.wobble) * 0.5;
      if (this.t >= this.triggerMs) {
        const ready = g.mode === 'balloonSimon'
          ? true
          : nowMs - g.lastStimWallMs >= g.minStimGapMs && !g.stimConsumedThisFrame;
        if (ready) {
          this.fired = true;
          this.dead = true;
          if (g.mode !== 'balloonSimon') {
            g.lastStimWallMs = nowMs;
            g.stimConsumedThisFrame = true;
          }
          onBubbleStim(this.lane, this.x, this.y);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, g: GameState) {
    if (this.dead) return;
    if (this.y - this.r > g.H) return;
    drawBubbleBody(ctx, g, this.x, this.y, this.r, this.color.main);
  }
}

function drawBubbleBody(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  x: number,
  y: number,
  r: number,
  colorMain: string
) {
  ctx.save();
  ctx.shadowColor = colorMain;
  ctx.shadowBlur = g.isLow ? 6 : 30;
  ctx.strokeStyle = colorMain;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = g.isLow ? 0 : 20;
  const grd = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.05, x, y, r);
  grd.addColorStop(0, 'rgba(255,255,255,.9)');
  grd.addColorStop(0.2, `${colorMain}cc`);
  grd.addColorStop(1, `${colorMain}55`);
  ctx.fillStyle = grd;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

class Particle {
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  dec: number;
  r: number;
  grav: number;
  soft: boolean;
  shape: 'dot' | 'clap';
  rot: number;
  spin: number;
  constructor(x: number, y: number, color: string, burstScale = 1, soft = false, shape: 'dot' | 'clap' = 'dot') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.soft = soft;
    this.shape = shape;
    const a = Math.random() * Math.PI * 2;
    this.rot = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.18;
    if (shape === 'clap') {
      const side = Math.random() < 0.5 ? -1 : 1;
      const s = (Math.random() * 10 + 13) * burstScale;
      this.vx = side * s;
      this.vy = -(Math.random() * 7 + 7) * burstScale;
      this.life = 1;
      this.dec = 0.014 + Math.random() * 0.01;
      this.r = (Math.random() * 24 + 28) * Math.sqrt(burstScale);
      this.grav = 0.22 * Math.sqrt(burstScale);
      this.rot = side > 0 ? -0.7 : 0.7;
      this.spin = side * (0.05 + Math.random() * 0.05);
    } else if (soft) {
      const s = (Math.random() * 9 + 8) * burstScale;
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s - 1.2;
      this.life = 1;
      this.dec = 0.012 + Math.random() * 0.012;
      this.r = (Math.random() * 22 + 16) * Math.sqrt(burstScale);
      this.grav = 0.08;
    } else {
      const s = (Math.random() * 10 + 3) * burstScale;
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s - 2 * burstScale;
      this.life = 1;
      this.dec = (Math.random() * 0.03 + 0.02) / Math.sqrt(Math.max(1, burstScale));
      this.r = (Math.random() * 5 + 2) * Math.sqrt(burstScale);
      this.grav = 0.2 * Math.sqrt(burstScale);
    }
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.grav;
    if (this.soft) {
      this.vx *= 0.96;
      this.vy *= 0.96;
      this.r *= 1.012;
    }
    this.rot += this.spin;
    this.life -= this.dec;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life) * (this.soft ? 0.86 : 1);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.shape === 'clap' ? 36 : this.soft ? 34 : 12;
    ctx.fillStyle = this.color;
    if (this.shape === 'clap') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      const w = this.r * 0.72;
      const h = this.r * 1.18;
      fillRoundPath(ctx, -w / 2, -h / 2, w, h, w * 0.42);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha *= 0.35;
      fillRoundPath(ctx, -w * 0.12, -h * 0.34, w * 0.24, h * 0.45, w * 0.16);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function randomPair(): [number, number] {
  const lanes = [0, 1, 2, 3];
  const i = Math.floor(Math.random() * 4);
  const j = (i + 1 + Math.floor(Math.random() * 3)) % 4;
  return [lanes[i] ?? 0, lanes[j] ?? 1] as [number, number];
}

function randomTriple(): [number, number, number] {
  const a = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return [a[0]!, a[1]!, a[2]!];
}

const css = `
.vrt{--red:#FF1744;--yellow:#FFD600;--green:#00E676;--blue:#2979FF;--bg:#07070F;--hud-h:72px;--pad-h:76px}
.vrt, .vrt *{box-sizing:border-box}
.vrt{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:var(--bg);color:#fff;font-family:Barlow Condensed,Noto Sans KR,sans-serif;z-index:300;display:flex;flex-direction:column;overflow:hidden}
#vrt #vrt-cv{flex:1;min-height:0;width:100%;display:block;position:relative;z-index:20}
#vrt #vrt-lane{position:absolute;inset:0;z-index:30;pointer-events:none;display:flex}
#vrt .vrt-laneExpl{flex:1;opacity:0}
#vrt .vrt-laneExpl[data-l="0"]{background:linear-gradient(to top,rgba(255,23,68,1) 0%,rgba(255,23,68,.7) 15%,rgba(255,23,68,.2) 50%,transparent 100%)}
#vrt .vrt-laneExpl[data-l="1"]{background:linear-gradient(to top,rgba(41,121,255,1) 0%,rgba(41,121,255,.7) 15%,rgba(41,121,255,.2) 50%,transparent 100%)}
#vrt .vrt-laneExpl[data-l="2"]{background:linear-gradient(to top,rgba(0,230,118,1) 0%,rgba(0,230,118,.7) 15%,rgba(0,230,118,.2) 50%,transparent 100%)}
#vrt .vrt-laneExpl[data-l="3"]{background:linear-gradient(to top,rgba(255,214,0,1) 0%,rgba(255,214,0,.7) 15%,rgba(255,214,0,.2) 50%,transparent 100%)}
#vrt #vrt-pads{height:var(--pad-h);flex-shrink:0;z-index:40;display:flex;pointer-events:none;border-top:1px solid rgba(255,255,255,.04);padding-bottom:max(0px,env(safe-area-inset-bottom))}
#vrt .vrt-pad{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-right:1px solid rgba(255,255,255,.04);transition:background .06s}
#vrt .vrt-pad:last-child{border-right:none}
#vrt .vrt-pad-dot{width:clamp(7px,1.4vw,13px);height:clamp(7px,1.4vw,13px);border-radius:50%;opacity:.15;transition:all .08s}
#vrt .vrt-pad-lbl{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(12px,2.1vw,19px);letter-spacing:.12em;opacity:.2;transition:opacity .08s}
#vrt .vrt-pad[data-l="0"] .vrt-pad-dot,#vrt .vrt-pad[data-l="0"] .vrt-pad-lbl{color:var(--red);background:var(--red)}
#vrt .vrt-pad[data-l="1"] .vrt-pad-dot,#vrt .vrt-pad[data-l="1"] .vrt-pad-lbl{color:var(--blue);background:var(--blue)}
#vrt .vrt-pad[data-l="2"] .vrt-pad-dot,#vrt .vrt-pad[data-l="2"] .vrt-pad-lbl{color:var(--green);background:var(--green)}
#vrt .vrt-pad[data-l="3"] .vrt-pad-dot,#vrt .vrt-pad[data-l="3"] .vrt-pad-lbl{color:var(--yellow);background:var(--yellow)}
#vrt .vrt-pad[data-l="0"].lit{background:linear-gradient(to top,rgba(255,23,68,.18),transparent)}
#vrt .vrt-pad[data-l="1"].lit{background:linear-gradient(to top,rgba(41,121,255,.18),transparent)}
#vrt .vrt-pad[data-l="2"].lit{background:linear-gradient(to top,rgba(0,230,118,.18),transparent)}
#vrt .vrt-pad[data-l="3"].lit{background:linear-gradient(to top,rgba(255,214,0,.18),transparent)}
#vrt .vrt-pad.lit .vrt-pad-dot{opacity:1;box-shadow:0 0 18px 4px currentColor;transform:scale(1.5)}
#vrt .vrt-pad.lit .vrt-pad-lbl{opacity:1}
/* 풍선 터뜨리기: 하단 날카로운 무채색 바늘 — 틀·선·띠 없음(플레이 영역 오버레이) */
#vrt .vrt-spikes-overlay{position:absolute;left:0;right:0;bottom:0;height:clamp(110px,22vh,190px);z-index:35;pointer-events:none;overflow:visible}
#vrt .vrt-spike-needle{position:absolute;bottom:0;transform-origin:50% 100%;pointer-events:none;overflow:visible}
#vrt .vrt-spike-needle svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 -3px 4px rgba(0,0,0,.5))}
#vrt #vrt-hud{height:var(--hud-h);flex-shrink:0;z-index:50;display:flex;align-items:stretch;background:rgba(7,7,15,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0}
#vrt .vrt-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
#vrt .vrt-hc.vrt-cen{flex:1;align-items:center;border-right:none}
#vrt .vrt-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
#vrt .vrt-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
#vrt #vrt-mtime.warn{animation:vrtw .5s ease-in-out infinite}
@keyframes vrtw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
#vrt #vrt-badge{font-size:clamp(12px,2vw,16px);letter-spacing:.18em;color:rgba(255,255,255,.35);font-family:Bebas Neue,sans-serif}
#vrt .vrt-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;display:flex;align-items:center;gap:6px}
#vrt .vrt-stop:hover{background:rgba(255,255,255,.07);color:#fff}
#vrt #vrt-combo{position:absolute;left:50%;top:43%;transform:translateX(-50%) translateY(-50%) scale(.7);z-index:60;text-align:center;pointer-events:none;opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1)}
#vrt #vrt-combo.show{opacity:1;transform:translateX(-50%) translateY(-50%) scale(1)}
#vrt .vrt-cn{font-family:Bebas Neue,sans-serif;font-size:clamp(70px,14vw,128px);letter-spacing:.02em;color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5);line-height:1}
#vrt .vrt-cw{font-size:clamp(10px,1.8vw,15px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.45)}
@keyframes vrtms{0%{opacity:0;transform:translateX(-50%) scale(.5)}20%{opacity:1;transform:translateX(-50%) scale(1.12)}70%{opacity:1;transform:translateX(-50%) scale(1) translateY(-8px)}100%{opacity:0;transform:translateX(-50%) scale(.9) translateY(-48px)}}
#vrt .vrt-ms{position:absolute;left:50%;z-index:65;pointer-events:none;font-family:Bebas Neue,sans-serif;font-size:clamp(26px,5.5vw,52px);letter-spacing:.1em;white-space:nowrap;text-shadow:0 0 24px currentColor;animation:vrtms .85s ease-out forwards}
@media (max-height:600px){
  .vrt{--hud-h:56px;--pad-h:58px}
}
@media (max-width:380px){
  #vrt .vrt-hc{padding:0 6px}
  #vrt .vrt-hc.vrt-cen{display:none}
  #vrt .vrt-stop{padding:6px 10px;font-size:11px}
}
`;

function buildFlashSpikeLayout(count = 26): {
  id: number;
  leftPct: number;
  heightPx: number;
  widthPx: number;
  rotateDeg: number;
  opacity: number;
}[] {
  const n = Math.max(16, count);
  const slots = Array.from({ length: n }, (_, i) => (i + 0.2 + Math.random() * 0.55) / n);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  return slots.map((t, id) => {
    const tall = Math.random() > 0.45;
    return {
      id,
      leftPct: 1.5 + t * 97 + (Math.random() - 0.5) * 0.8,
      heightPx: tall ? 128 + Math.random() * 90 : 82 + Math.random() * 62,
      widthPx: tall ? 21 + Math.random() * 16 : 27 + Math.random() * 21,
      rotateDeg: -14 + Math.random() * 28,
      opacity: 0.55 + Math.random() * 0.4,
    };
  });
}

type Props = {
  variant: ReactTrainVariant;
  durationSec: number;
  /** 시지각 전용: 블록/버블이 히트 라인까지 도달하는 목표 시간(초) */
  speedSec: number;
  /** flow/balloonSimon 전용: 동시 신호 수. 기본값 1 */
  concurrent?: 1 | 2 | 3;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

export function VisualReactionTraining({ variant, durationSec, speedSec, concurrent = 1, onExit, onComplete }: Props) {
  const playAreaRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<GameState | null>(null);
  const onCompleteRef = useRef(onComplete);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboNRef = useRef<HTMLDivElement>(null);
  const laneExplRefs = useRef<(HTMLDivElement | null)[]>([]);
  const padRefs = useRef<(HTMLDivElement | null)[]>([]);
  const milestoneRootRef = useRef<HTMLDivElement>(null);
  const [hudTimeWarn, setHudTimeWarn] = useState(false);
  const [countdown, setCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);
  const [flashSpikes] = useState(() =>
    variant === 'flash' ? buildFlashSpikeLayout(22 + Math.floor(Math.random() * 10)) : []
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const fallTimeSec = Math.max(1, Math.min(6, Number.isFinite(speedSec) ? speedSec : 4));
  const lv = Math.max(1, Math.min(7, Math.round(7 - ((fallTimeSec - 1) * 6) / 5)));
  const spName =
    variant === 'balloonSimon' ? `${Math.round(fallTimeSec)}초` : (SPD_NAMES[lv - 1] ?? '보통');

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) {
      clearInterval(g.timer);
      g.timer = null;
    }
    if (g.raf != null) {
      cancelAnimationFrame(g.raf);
      g.raf = null;
    }
    laneExplRefs.current.forEach((el) => {
      if (el) el.style.opacity = '0';
    });
    padRefs.current.forEach((p) => p?.classList.remove('lit'));
    const stats: ReactTrainCompleteStats = {
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    };
    onCompleteRef.current(stats);
  }, []);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.timer) {
      clearInterval(g.timer);
      g.timer = null;
    }
    if (g.raf != null) {
      cancelAnimationFrame(g.raf);
      g.raf = null;
    }
    laneExplRefs.current.forEach((el) => {
      if (el) el.style.opacity = '0';
    });
    padRefs.current.forEach((p) => p?.classList.remove('lit'));
    if (g.stims > 0) {
      onCompleteRef.current({
        stims: g.stims,
        maxCombo: g.maxCombo,
        laneCount: [...g.laneCount] as [number, number, number, number],
      });
      return;
    }
    onExit();
  }, [onExit]);

  const triggerStim = useCallback(
    (lane: number, x: number, y: number) => {
      const g = gRef.current;
      const cv = cvRef.current;
      if (!g || !cv) return;
      g.stims++;
      g.combo++;
      if (g.combo > g.maxCombo) g.maxCombo = g.combo;
      g.laneCount[lane]++;
      if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);

      const el = laneExplRefs.current[lane];
      if (el && g.mode !== 'flash' && g.mode !== 'balloonSimon') {
        el.style.transition = 'none';
        el.style.opacity = '1';
        clearTimeout((el as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t);
        (el as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
          el.style.transition = 'opacity .3s ease-out';
          el.style.opacity = '0';
        }, 110);
      }
      const pad = padRefs.current[lane];
      if (pad && g.mode !== 'flash' && g.mode !== 'balloonSimon') {
        pad.classList.add('lit');
        clearTimeout((pad as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t);
        (pad as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => pad.classList.remove('lit'), 260);
      }
      const c = RT_COLORS[lane].main;
      if (g.mode === 'flash') {
        // 풍선 터뜨리기: 무조건 크게 터지는 박수형 팝. 화면을 덮을 정도로 과장한다.
        const claps = g.isLow ? 64 : 120;
        const pops = g.isLow ? 120 : 220;
        const whites = g.isLow ? 42 : 76;
        for (let i = 0; i < claps; i++) g.particles.push(new Particle(x, y, c, 3.8, false, 'clap'));
        for (let i = 0; i < pops; i++) g.particles.push(new Particle(x, y, c, 3.2, true));
        for (let i = 0; i < whites; i++) g.particles.push(new Particle(x, y, '#ffffff', 2.8, true));
      } else {
        // 파도 피하기·풍선 사이먼: 파편처럼 부서짐 (사이먼은 더 크게)
        const scale = g.mode === 'balloonSimon' ? 2.6 : 1;
        const shards = g.mode === 'balloonSimon' ? (g.isLow ? 48 : 72) : 38;
        const sparks = g.mode === 'balloonSimon' ? (g.isLow ? 16 : 24) : 8;
        for (let i = 0; i < shards; i++) g.particles.push(new Particle(x, y, c, scale));
        for (let i = 0; i < sparks; i++) g.particles.push(new Particle(x, y, '#ffffff', scale * 0.9));
      }
      if (g.combo >= 5 && g.combo % 5 === 0) {
        const pop = comboRef.current;
        const nEl = comboNRef.current;
        if (pop && nEl) {
          nEl.textContent = String(g.combo);
          pop.classList.remove('show');
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              pop.classList.add('show');
              const po = pop as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
              clearTimeout(po._t);
              po._t = setTimeout(() => pop.classList.remove('show'), 650);
            })
          );
        }
      }
      const MAP: Record<number, string> = {
        10: '10 COMBO!',
        25: '25 COMBO!',
        50: '50 COMBO!',
        100: '100 COMBO!',
        200: '200 COMBO!',
      };
      const msg =
        MAP[g.combo] ?? (g.combo > 200 && g.combo % 100 === 0 ? `${g.combo} STREAK!` : null);
      if (!msg) return;
      const col = RT_COLORS[g.combo % 4].main;
      const root = milestoneRootRef.current;
      if (!root) return;
      const m = document.createElement('div');
      m.className = 'vrt-ms';
      m.style.top = '34%';
      m.style.color = col;
      m.textContent = msg;
      root.appendChild(m);
      setTimeout(() => m.remove(), 900);
    },
    []
  );

  const onStim = useCallback(
    (lane: number) => {
      const g = gRef.current;
      const cv = cvRef.current;
      if (!g || !cv) return;
      const cx = lane * g.lw + g.lw / 2;
      triggerStim(lane, cx, g.hitY);
    },
    [triggerStim]
  );

  const onStimBubble = useCallback(
    (lane: number, x: number, y: number) => {
      triggerStim(lane, x, y);
    },
    [triggerStim]
  );

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;

    const g: GameState = {
      running: true,
      mode: variant,
      timeLeft: durationSec,
      spd: lv,
      lw: 0,
      hitY: 0,
      W: 0,
      H: 0,
      objs: [],
      particles: [],
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
      baseSpd: 0,
      spawnInt: 600,
      lastSpawn: 0,
      cueMs: Math.round(fallTimeSec * 1000),
      minStimGapMs: 700,
      lastStimWallMs: -1e15,
      stimConsumedThisFrame: false,
      raf: null,
      timer: null,
      isLow: staticPerfTier === 'low',
    };
    gRef.current = g;

    let dpr = 1;
    const resizeCv = (play: HTMLDivElement) => {
      if (!cv) return;
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      const result = setupCanvas(cv, w, h);
      dpr = result.dpr;
      g.W = result.cssW;
      g.H = result.cssH;
    };

    const calcLayout = () => {
      if (!cv) return;
      g.lw = g.W > 0 ? g.W / 4 : cv.width / 4;
      g.hitY = playBottomHitY(g.H > 0 ? g.H : cv.height);
    };

    const updateHud = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setHudTimeWarn(g.timeLeft <= 10);
    };
    updateHud();
    if (hudStimsRef.current) hudStimsRef.current.textContent = '0';

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
      if (g.mode === 'flash' || g.mode === 'balloonSimon') return;
      ctx.save();
      ctx.setLineDash([16, 16]);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * g.lw, 0);
        ctx.lineTo(i * g.lw, g.H);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    };

    const drawHitLine = (ctx: CanvasRenderingContext2D) => {
      const y = g.hitY;
      if (g.mode === 'flash') {
        // 가시는 DOM 오버레이 — 캔버스 히트 라인/틀 선 없음
        return;
      }
      if (g.mode === 'balloonSimon') return;
      ctx.save();
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(0, y - 1, g.W, 2);
      ctx.shadowBlur = 0;
      const grd = ctx.createLinearGradient(0, y, 0, y + 48);
      grd.addColorStop(0, 'rgba(255,255,255,.07)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, y, g.W, 48);
      RT_COLORS.forEach((c, i) => {
        const cx = i * g.lw + g.lw / 2;
        ctx.save();
        ctx.shadowColor = c.main;
        ctx.shadowBlur = 22;
        ctx.fillStyle = c.main;
        ctx.beginPath();
        ctx.moveTo(cx, y - 11);
        ctx.lineTo(cx + 9, y);
        ctx.lineTo(cx, y + 11);
        ctx.lineTo(cx - 9, y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    };

    const drawTopFade = (ctx: CanvasRenderingContext2D) => {
      const grd = ctx.createLinearGradient(0, 0, 0, 72);
      grd.addColorStop(0, '#07070F');
      grd.addColorStop(0.65, 'rgba(7,7,15,.55)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, g.W, 80);
    };

    let lastConcurrentKey: string | null = null;

    const spawnObjs = (now: number) => {
      if (now - g.lastSpawn < g.spawnInt) return;
      if (g.mode === 'flow') {
        if (concurrent <= 1) {
          const activeFlow = g.objs.filter((o) => o instanceof FlowTile && !(o as FlowTile).fired && !(o as FlowTile).dead).length;
          const maxFlowOnScreen = 3 + Math.ceil(lv / 2);
          if (activeFlow >= maxFlowOnScreen) return;
          const activeLanes = g.objs.filter((o) => o instanceof FlowTile && !(o as FlowTile).fired).map((o) => (o as FlowTile).lane);
          const lastLane = activeLanes.length ? activeLanes[activeLanes.length - 1] : -1;
          let lane: number;
          do {
            lane = Math.floor(Math.random() * 4);
          } while (lane === lastLane && Math.random() > 0.3);
          g.objs.push(new FlowTile(g, cv, lane));
        } else if (concurrent === 2) {
          let pair = randomPair();
          let key = [...pair].sort().join(',');
          for (let retry = 0; retry < 8 && key === lastConcurrentKey; retry++) {
            pair = randomPair();
            key = [...pair].sort().join(',');
          }
          lastConcurrentKey = key;
          g.objs.push(new FlowTile(g, cv, pair[0], true));
          g.objs.push(new FlowTile(g, cv, pair[1], true));
        } else {
          let triple = randomTriple();
          let key = [...triple].sort().join(',');
          for (let retry = 0; retry < 8 && key === lastConcurrentKey; retry++) {
            triple = randomTriple();
            key = [...triple].sort().join(',');
          }
          lastConcurrentKey = key;
          g.objs.push(new FlowTile(g, cv, triple[0], true));
          g.objs.push(new FlowTile(g, cv, triple[1], true));
          g.objs.push(new FlowTile(g, cv, triple[2], true));
        }
      } else if (g.mode === 'flash') {
        // FLASH: 버블이 서로 겹치지 않게 동시 낙하를 1개로 제한.
        const activeFlash = g.objs.filter((o) => o instanceof FlashBubble && !o.dead).length;
        if (activeFlash < 1) {
          g.objs.push(new FlashBubble(g));
        }
      } else if (g.mode === 'balloonSimon') {
        const active = g.objs.filter((o) => o instanceof SimonBalloon && !o.dead).length;
        for (let i = active; i < concurrent; i++) {
          g.objs.push(new SimonBalloon(g, i, concurrent));
        }
      } else {
        const pair = randomPair();
        g.objs.push(new FlowTile(g, cv, pair[0], true));
        g.objs.push(new FlowTile(g, cv, pair[1], true));
      }
      g.lastSpawn = now;
    };

    const updateObjs = (ctx: CanvasRenderingContext2D, nowMs: number, deltaSec: number) => {
      for (let i = g.objs.length - 1; i >= 0; i--) {
        const o = g.objs[i];
        if (o instanceof FlowTile) {
          o.update(g, cv, nowMs, deltaSec, onStim);
          o.draw(ctx, g);
        } else if (o instanceof FlashBubble) {
          o.update(g, cv, nowMs, deltaSec, onStimBubble);
          o.draw(ctx, g);
        } else if (o instanceof SimonBalloon) {
          o.update(g, cv, nowMs, deltaSec, onStimBubble);
          o.draw(ctx, g);
        }
        if (o.dead || o.y > g.H + 100) g.objs.splice(i, 1);
      }
    };

    const updateParticles = (ctx: CanvasRenderingContext2D) => {
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) g.particles.splice(i, 1);
      }
    };

    const perf = new PerfMonitor();
    let lastFrameMs = 0;
    const loop = (now: number) => {
      if (!gRef.current?.running) return;
      const deltaSec = lastFrameMs > 0 ? Math.min((now - lastFrameMs) / 1000, 0.05) : 1 / 60;
      lastFrameMs = now;
      perf.tick(now);
      if (perf.isLow) g.isLow = true;
      const ctx2 = cv.getContext('2d');
      if (!ctx2) return;
      const gg = gRef.current;
      gg.stimConsumedThisFrame = false;
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, g.W, g.H);
      drawGrid(ctx2);
      spawnObjs(now);
      updateObjs(ctx2, now, deltaSec);
      drawHitLine(ctx2);
      updateParticles(ctx2);
      drawTopFade(ctx2);
      gg.raf = requestAnimationFrame(loop);
    };

    const computeSpawnInt = () => {
      /* 풍선 사이먼: 신호 속도(초) = A→B 스폰 간격 */
      if (variant === 'balloonSimon') return Math.round(fallTimeSec * 1000);
      /* 초등 친화: 최소 간격 상향 + 단계별 간격 완화(동시 스폰 체감 완화) */
      const base = Math.max(560, 1780 - (lv - 1) * 130);
      /* FLOW: concurrent 수에 따라 스폰 간격 조정 */
      if (variant === 'flow') {
        if (concurrent <= 1) return Math.round(base * 2.2);
        if (concurrent === 2) return Math.round(base * 2.3);
        return Math.round(base * 2.8); // 3개 동시: 여유 있게
      }
      /* FLASH: 동시 1개, 앞 버블이 터질 즈음 다음이 보이도록 */
      if (variant === 'flash') return Math.round(base * 1.45);
      /* PATTERN: 페어 출현 간격을 FLOW·FLASH 대비 2배 */
      if (variant === 'pattern') return Math.round(base * 2.3);
      return base;
    };

    /** 실제 히트 간격: 스폰보다 우선 체감되는 연속 자극 간 최소 시간 */
    const computeMinStimGapMs = () => {
      if (variant === 'balloonSimon') return Math.round(fallTimeSec * 1000);
      if (variant === 'flow') return Math.max(560, 1020 - (lv - 1) * 64);
      if (variant === 'flash') return Math.max(460, 860 - (lv - 1) * 56);
      return Math.max(520, 980 - (lv - 1) * 62);
    };

    const onWinResize = () => {
      const play = playAreaRef.current;
      if (!play) return;
      resizeCv(play);
      calcLayout();
      const travelPx = Math.max(60, g.hitY + 4);
      const pps = travelPx / fallTimeSec;
      g.baseSpd = pps;
      g.cueMs = Math.round(fallTimeSec * 1000);
      g.spawnInt = computeSpawnInt();
      g.minStimGapMs = computeMinStimGapMs();
    };

    const beginGame = () => {
      if (!gRef.current?.running) return;
      const play = playAreaRef.current;
      if (play) {
        resizeCv(play);
        calcLayout();
        const travelPx = Math.max(60, g.hitY + 4);
        const pps = travelPx / fallTimeSec;
        g.baseSpd = pps;
        g.cueMs = Math.round(fallTimeSec * 1000);
        g.spawnInt = computeSpawnInt();
        g.minStimGapMs = computeMinStimGapMs();
      }
      // 시작 직후 첫 자극이 바로 나오도록 스폰 타이머를 한 주기 당겨둔다.
      g.lastSpawn = performance.now() - g.spawnInt;
      const endsAtMs = performance.now() + durationSec * 1000;
      g.timer = setInterval(() => {
        const newLeft = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
        if (g.timeLeft !== newLeft) { g.timeLeft = newLeft; updateHud(); }
        if (g.timeLeft <= 0) {
          if (g.timer) clearInterval(g.timer);
          g.timer = null;
          endGame();
        }
      }, 250);
      g.raf = requestAnimationFrame(loop);
    };

    const stopCountdown = runReactTrainStartCountdown({
      onTick: setCountdown,
      onDone: beginGame,
    });

    const unbindResize = bindViewportResize(playAreaRef.current, onWinResize);

    return () => {
      stopCountdown();
      unbindResize();
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      if (g.raf != null) cancelAnimationFrame(g.raf);
    };
  }, [concurrent, durationSec, endGame, fallTimeSec, lv, onStim, onStimBubble, variant]);

  const uid = useId();
  const spikeUid = uid.replace(/:/g, '');
  return (
    <div className="vrt" id="vrt">
      <style
        dangerouslySetInnerHTML={{
          __html: `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Noto+Sans+KR:wght@500;700;900&display=swap');`,
        }}
      />
      <style>{css}</style>
      <div id="vrt-hud">
        <div className="vrt-hc">
          <div className="vrt-hk">Time</div>
          <div
            className={`vrt-hv${hudTimeWarn ? ' warn' : ''}`}
            ref={hudTimeRef}
            id="vrt-mtime"
          />
        </div>
        <div className="vrt-hc">
          <div className="vrt-hk">Stims</div>
          <div className="vrt-hv" ref={hudStimsRef} id="vrt-sst" />
        </div>
        <div className="vrt-hc vrt-cen">
          <div id="vrt-badge" className="vrt-hv" style={{ fontSize: 'clamp(12px,2vw,19px)' }}>
            {variant === 'flow' && concurrent > 1
              ? `FLOW ×${concurrent}`
              : variant === 'balloonSimon'
                ? 'BALLOON SIMON'
                : variant.toUpperCase()}{' '}
            · {spName}
          </div>
        </div>
        <div className="vrt-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="vrt-stop" onClick={stopGame}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>
      <div ref={playAreaRef} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
        <canvas id="vrt-cv" ref={cvRef} style={{ position: 'absolute', inset: 0 }} />
        <div id="vrt-lane" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {variant === 'balloonSimon'
            ? null
            : [0, 1, 2, 3].map((i) => (
                <div
                  key={uid + 'l' + i}
                  className="vrt-laneExpl"
                  data-l={i}
                  ref={(el) => {
                    laneExplRefs.current[i] = el;
                  }}
                />
              ))}
        </div>
        <div ref={milestoneRootRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <ReactTrainStartCountdownOverlay countdown={countdown} />
        <div
          id="vrt-combo"
          ref={comboRef}
          style={{ position: 'absolute', left: '50%', top: '43%', transform: 'translateX(-50%) translateY(-50%)' }}
        >
          <div className="vrt-cn" ref={comboNRef}>
            0
          </div>
          <div className="vrt-cw">COMBO</div>
        </div>
        {variant === 'flash' ? (
          <div className="vrt-spikes-overlay" aria-hidden>
            {flashSpikes.map((spike) => (
              <div
                key={uid + 'sp' + spike.id}
                className="vrt-spike-needle"
                style={{
                  left: `${spike.leftPct}%`,
                  width: `${spike.widthPx}px`,
                  height: `${spike.heightPx}px`,
                  opacity: spike.opacity,
                  transform: `translateX(-50%) rotate(${spike.rotateDeg}deg)`,
                }}
              >
                <svg viewBox="0 0 10 120" preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id={`${spikeUid}-ng${spike.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f1f5f9" />
                      <stop offset="35%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="5,0 3.2,108 0,120 10,120 6.8,108"
                    fill={`url(#${spikeUid}-ng${spike.id})`}
                  />
                </svg>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {variant === 'flash' || variant === 'balloonSimon' ? null : (
        <div id="vrt-pads">
          {['RED', 'BLU', 'GRN', 'YEL'].map((label, i) => (
            <div
              key={uid + 'p' + i}
              className="vrt-pad"
              data-l={i}
              ref={(el) => {
                padRefs.current[i] = el;
              }}
            >
              <div className="vrt-pad-dot" />
              <div className="vrt-pad-lbl">{label}</div>
            </div>
          ))}
        </div>
      )}
      <style>{`#vrt #vrt-mtime.warn{animation:vrtw .5s ease-in-out infinite}`}</style>
    </div>
  );
}
