'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { bindViewportResize } from '../lib/bindViewportResize';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import { normalizeReactSpeedSec } from '../lib/reactTrainTiming';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { staticPerfTier } from '../lib/reactTrainPerf';

const CORNERS = [
  { key: 'TL', lane: 0, hex: 0xff1744, css: '#ff1744', label: 'RED', callout: '좌상(손)!' },
  { key: 'TR', lane: 3, hex: 0xffd600, css: '#ffd600', label: 'YELLOW', callout: '우상(손)!' },
  { key: 'BL', lane: 2, hex: 0x00e676, css: '#00e676', label: 'GREEN', callout: '좌하(발)!' },
  { key: 'BR', lane: 1, hex: 0x2979ff, css: '#2979ff', label: 'BLUE', callout: '우하(발)!' },
] as const;

type CornerKey = (typeof CORNERS)[number]['key'];
const CORNER_KEYS = CORNERS.map((c) => c.key);

type ProjectileData = {
  startKey: CornerKey;
  targetKey: CornerKey;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  isBoss: boolean;
  isCurve: boolean;
  coreMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
};

function drawRegularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  fill: string,
  stroke?: string,
  rotation = -Math.PI / 2,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** 회색조 축구공 UV — material.color로 코너 색을 틴트한다. */
function createSoccerBallTexture(resolution: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d')!;
  const W = resolution;
  const H = resolution;

  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, W, H);

  const seam = '#222222';
  const patch = '#141414';
  ctx.lineWidth = Math.max(2, resolution / 110);
  ctx.lineJoin = 'round';

  // 구 UV에 잘 붙는 패널 격자: 어두운 오각형 + 밝은 육각형 윤곽
  const rows = [
    { y: 0.12, cols: 5, r: 0.055, darkEvery: 1, offset: 0 },
    { y: 0.28, cols: 8, r: 0.07, darkEvery: 2, offset: 0.5 },
    { y: 0.46, cols: 10, r: 0.075, darkEvery: 3, offset: 0 },
    { y: 0.64, cols: 8, r: 0.07, darkEvery: 2, offset: 0.5 },
    { y: 0.82, cols: 5, r: 0.055, darkEvery: 1, offset: 0 },
  ] as const;

  for (const row of rows) {
    const cy = row.y * H;
    const radius = row.r * W;
    for (let i = 0; i < row.cols; i++) {
      const cx = ((i + row.offset) / row.cols) * W;
      const isDark = i % row.darkEvery === 0;
      if (isDark) {
        drawRegularPolygon(ctx, cx, cy, radius * 0.92, 5, patch, seam);
      } else {
        drawRegularPolygon(ctx, cx, cy, radius, 6, 'none', seam);
      }
      // 래핑 seam이 끊기지 않도록 좌우 가장자리 복제
      if (cx < radius * 1.2) {
        if (isDark) drawRegularPolygon(ctx, cx + W, cy, radius * 0.92, 5, patch, seam);
        else drawRegularPolygon(ctx, cx + W, cy, radius, 6, 'none', seam);
      } else if (cx > W - radius * 1.2) {
        if (isDark) drawRegularPolygon(ctx, cx - W, cy, radius * 0.92, 5, patch, seam);
        else drawRegularPolygon(ctx, cx - W, cy, radius, 6, 'none', seam);
      }
    }
  }

  // 패널 사이를 잇는 가벼운 곡선 seam
  ctx.strokeStyle = seam;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 8; i++) {
    const x = ((i + 0.5) / 8) * W;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.08);
    ctx.quadraticCurveTo(x + (i % 2 === 0 ? 18 : -18), H * 0.5, x, H * 0.92);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

type Trail = THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> & { userData: { life: number } };
type FxMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> & {
  userData: { life: number; scale: number; kind: 'shield' | 'ring' | 'particle'; vel?: THREE.Vector3; rotSpeed?: number };
};

type SpawnPhase = {
  id: number;
  /** 세션 진행률 상한 (0~1) */
  until: number;
  speedMult: number;
  curveChance: number;
  doubleChance: number;
  /** 다음 스폰까지 대기 = speedSec * [min, max] */
  intervalMul: [number, number];
  msg: string;
  col: string;
};

type GoalkeeperGame = {
  running: boolean;
  timeLeft: number;
  score: number;
  combo: number;
  maxCombo: number;
  stims: number;
  laneCount: [number, number, number, number];
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
  startedAt: number;
  nextSpawnAt: number;
  currentSpeed: number;
  phaseId: number;
  lastStart: CornerKey | null;
  bossSpawned: boolean;
  projectiles: THREE.Group[];
  trails: Trail[];
  effects: FxMesh[];
  frameShake: number;
};

const HIT_Z = -3;
const SPAWN_Z = -120;
/** 스폰→히트 거리. speedSec초 동안 이 거리를 비행하도록 속도를 계산한다. */
const FLIGHT_DIST = Math.abs(HIT_Z - SPAWN_Z);

function cornerByKey(key: CornerKey) {
  return CORNERS.find((corner) => corner.key === key) ?? CORNERS[0];
}

/** 신호 속도(초) → 월드 유닛/초. mult>1이면 더 빠르게. */
function flightSpeedFromSec(speedSec: number, mult = 1): number {
  return (FLIGHT_DIST / normalizeReactSpeedSec(speedSec)) * mult;
}

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickCorner(exclude?: CornerKey | null): CornerKey {
  const pool = exclude ? CORNER_KEYS.filter((k) => k !== exclude) : CORNER_KEYS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function buildPhases(allowDouble: boolean): SpawnPhase[] {
  return [
    {
      id: 0,
      until: 0.14,
      speedMult: 1,
      curveChance: 0,
      doubleChance: 0,
      intervalMul: [0.95, 1.25],
      msg: '상단/하단 방어 훈련!',
      col: '#ffffff',
    },
    {
      id: 1,
      until: 0.34,
      speedMult: 1.15,
      curveChance: 0.5,
      doubleChance: 0,
      intervalMul: [0.85, 1.15],
      msg: '마구(커브볼) 주의!! 끝까지 봐라!',
      col: '#ffd600',
    },
    {
      id: 2,
      until: 0.52,
      speedMult: 1.25,
      curveChance: 0.4,
      doubleChance: allowDouble ? 0.4 : 0,
      intervalMul: [0.75, 1.05],
      msg: allowDouble ? '더블 블록!! 양손 방어!' : '연속 방어!! 코너를 지켜라!',
      col: '#00e5ff',
    },
    {
      id: 3,
      until: 0.74,
      speedMult: 1.65,
      curveChance: 0.45,
      doubleChance: allowDouble ? 0.28 : 0,
      intervalMul: [0.55, 0.9],
      msg: '무차별 폭격!! 뚫리지 마라!!',
      col: '#ff1744',
    },
    {
      id: 4,
      until: 0.88,
      speedMult: 2.2,
      curveChance: 0.35,
      doubleChance: allowDouble ? 0.22 : 0,
      intervalMul: [0.38, 0.65],
      msg: '하이퍼 모드! 전신 방어!!',
      col: '#ff4dd8',
    },
    {
      id: 5,
      until: 1,
      speedMult: 0.78,
      curveChance: 0.2,
      doubleChance: 0,
      intervalMul: [1.1, 1.4],
      msg: '위험!! 거대 에너지 슛 접근!!',
      col: '#ffffff',
    },
  ];
}

function phaseForProgress(phases: SpawnPhase[], progress: number): SpawnPhase {
  return phases.find((p) => progress < p.until) ?? phases[phases.length - 1]!;
}

const css = `
.gk{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#02030a;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.gk,.gk *{box-sizing:border-box}
.gk-hud{height:72px;display:flex;align-items:stretch;background:rgba(2,3,10,.9);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.06);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.gk-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.gk-hc.grow{flex:1;align-items:center;border-right:none;text-align:center}
.gk-hk{font-size:9px;font-weight:800;letter-spacing:.2em;color:rgba(255,255,255,.34);text-transform:uppercase}
.gk-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.gk-hv.warn{animation:gkw .5s ease-in-out infinite}
@keyframes gkw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.gk-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.46);font-size:13px;font-weight:800;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.gk-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.gk-play{position:relative;flex:1;min-height:0;overflow:hidden;background:radial-gradient(circle at 50% 50%,#071326 0%,#02030a 58%,#000 100%);transition:transform .06s linear}
.gk-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:5}
.gk-ui{position:absolute;inset:0;z-index:12;pointer-events:none}
.gk-cue{position:absolute;width:45vw;height:45vh;opacity:0;transition:opacity .16s;mix-blend-mode:screen;filter:blur(34px)}
.gk-cue.tl{top:-10%;left:-10%;background:radial-gradient(circle,rgba(255,23,68,.85),transparent 70%)}
.gk-cue.tr{top:-10%;right:-10%;background:radial-gradient(circle,rgba(255,214,0,.82),transparent 70%)}
.gk-cue.bl{bottom:-10%;left:-10%;background:radial-gradient(circle,rgba(0,230,118,.82),transparent 70%)}
.gk-cue.br{bottom:-10%;right:-10%;background:radial-gradient(circle,rgba(41,121,255,.82),transparent 70%)}
.gk-callout{position:absolute;left:50%;top:42%;width:100%;transform:translate(-50%,-50%) scale(.76);text-align:center;font-size:clamp(34px,7vw,92px);font-weight:950;line-height:1.05;text-shadow:0 0 36px currentColor;opacity:0;transition:opacity .12s,transform .18s cubic-bezier(.34,1.56,.64,1)}
.gk-callout.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.gk-action{position:absolute;font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(34px,6vw,76px);font-weight:900;letter-spacing:.04em;line-height:1;text-shadow:0 0 24px currentColor;animation:gka .62s cubic-bezier(.18,.89,.32,1.28) forwards;white-space:nowrap}
@keyframes gka{0%{opacity:0;transform:translate(-50%,-50%) scale(.5) rotate(-8deg)}38%{opacity:1;transform:translate(-50%,-50%) scale(1.16) rotate(4deg)}100%{opacity:0;transform:translate(-50%,-78%) scale(1) rotate(0)}}
.gk-corner{position:absolute;font-size:clamp(13px,2vw,24px);font-weight:900;letter-spacing:.18em;text-transform:uppercase;text-shadow:0 0 20px currentColor}
.gk-corner.tl{top:24px;left:24px}.gk-corner.tr{top:24px;right:24px}.gk-corner.bl{bottom:24px;left:24px}.gk-corner.br{bottom:24px;right:24px}
.gk-net-v,.gk-net-h{position:absolute;background:rgba(255,255,255,.12)}
.gk-net-v{left:50%;top:7%;bottom:7%;width:2px}.gk-net-h{left:7%;right:7%;top:50%;height:2px}
.gk-flash{position:absolute;inset:0;background:#fff;opacity:0;mix-blend-mode:overlay;transition:opacity .9s;z-index:20}
${REACT_TRAIN_VIEWPORT_CSS}
`;

type Props = {
  durationSec: number;
  /** 스폰→히트 기준 비행 시간(초). 기존 신호 속도와 동일 의미. */
  speedSec: number;
  /** 1: 항상 1개 · 2: 1~2개(더블 블록 포함) */
  goalkeeperTier?: 1 | 2;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

export function GoalkeeperReactionTraining({
  durationSec,
  speedSec,
  goalkeeperTier = 2,
  onExit,
  onComplete,
}: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<GoalkeeperGame | null>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudScoreRef = useRef<HTMLDivElement>(null);
  const hudComboRef = useRef<HTMLDivElement>(null);
  const cueRefs = useRef<Record<CornerKey, HTMLDivElement | null>>({ TL: null, TR: null, BL: null, BR: null });
  const calloutRef = useRef<HTMLDivElement>(null);
  const actionRootRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    onCompleteRef.current({
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    onCompleteRef.current({
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;

    const isLow = staticPerfTier === 'low';
    const duration = Math.max(12, Math.min(180, durationSec || 60));
    const tier: 1 | 2 = goalkeeperTier === 1 ? 1 : 2;
    const travelSec = normalizeReactSpeedSec(speedSec);
    const baseSpeed = flightSpeedFromSec(travelSec, 1);
    const phases = buildPhases(tier >= 2);
    const g: GoalkeeperGame = {
      running: true,
      timeLeft: duration,
      score: 0,
      combo: 0,
      maxCombo: 0,
      stims: 0,
      laneCount: [0, 0, 0, 0],
      raf: null,
      timer: null,
      startedAt: performance.now(),
      nextSpawnAt: 1.2,
      currentSpeed: baseSpeed,
      phaseId: -1,
      lastStart: null,
      bossSpawned: false,
      projectiles: [],
      trails: [],
      effects: [],
      frameShake: 0,
    };
    gRef.current = g;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02030a, 0.015);
    const w0 = play.clientWidth || window.innerWidth;
    const h0 = play.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(80, w0 / Math.max(h0, 1), 0.1, 220);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !isLow, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLow ? 1 : 2));

    const fieldGrid = new THREE.GridHelper(200, 80, 0x00e5ff, 0x07324f);
    fieldGrid.position.y = -6;
    scene.add(fieldGrid);
    const ceilingGrid = new THREE.GridHelper(200, 80, 0xff4dd8, 0x351238);
    ceilingGrid.position.y = 8;
    scene.add(ceilingGrid);
    const goalFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(16, 11)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.24 }),
    );
    goalFrame.position.set(0, 0.5, HIT_Z);
    scene.add(goalFrame);
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const pointLight = new THREE.PointLight(0xffffff, 0.9, 60);
    pointLight.position.set(0, 0, HIT_Z);
    scene.add(pointLight);

    const soccerMap = createSoccerBallTexture(isLow ? 128 : 256);
    const disposeProjectile = (projectile: THREE.Group) => {
      scene.remove(projectile);
      projectile.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mat = mesh.material as THREE.MeshBasicMaterial;
        // map은 세션 공유 텍스처 — material만 dispose
        mat.map = null;
        mat.dispose();
      });
    };

    const spawnShot = (startKey: CornerKey, targetKey?: CornerKey, speed = g.currentSpeed, isBoss = false) => {
      const start = cornerByKey(startKey);
      const target = cornerByKey(targetKey ?? startKey);
      const radius = isBoss ? 3.4 : 0.95;
      const segs = isLow ? 12 : 20;
      const group = new THREE.Group();
      const coreGeo = new THREE.SphereGeometry(radius, segs, isLow ? 10 : 16);
      const coreMat = new THREE.MeshBasicMaterial({
        map: soccerMap,
        color: isBoss ? 0xffffff : start.hex,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);
      group.position.set(start.key.endsWith('L') ? -6 : 6, start.key.startsWith('T') ? 4 : -3, SPAWN_Z);
      group.userData = {
        startKey,
        targetKey: target.key,
        startX: start.key.endsWith('L') ? -6 : 6,
        startY: start.key.startsWith('T') ? 4 : -3,
        targetX: target.key.endsWith('L') ? -6 : 6,
        targetY: target.key.startsWith('T') ? 4 : -3,
        speed,
        isBoss,
        isCurve: start.key !== target.key,
        coreMesh: core,
      } satisfies ProjectileData;
      scene.add(group);
      g.projectiles.push(group);
    };

    const showCallout = (text: string, color: string, ms = 850) => {
      const el = calloutRef.current;
      if (!el) return;
      el.textContent = text;
      el.style.color = color;
      el.classList.add('show');
      window.setTimeout(() => el.classList.remove('show'), ms);
    };

    const createAction = (corner: (typeof CORNERS)[number], msg: string) => {
      const root = actionRootRef.current;
      if (!root) return;
      const txt = document.createElement('div');
      txt.className = 'gk-action';
      txt.textContent = msg;
      txt.style.color = corner.css;
      txt.style.left = corner.key.endsWith('L') ? '25%' : '75%';
      txt.style.top = corner.key.startsWith('T') ? '30%' : '70%';
      root.appendChild(txt);
      window.setTimeout(() => txt.remove(), 700);
    };

    const createShield = (x: number, y: number, colorHex: number) => {
      const shieldMat = new THREE.MeshBasicMaterial({ color: colorHex, wireframe: true, transparent: true, opacity: 1 });
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.3, 6), shieldMat) as unknown as FxMesh;
      shield.geometry.rotateX(Math.PI / 2);
      shield.position.set(x, y, HIT_Z);
      shield.userData = { life: 1, scale: 1, kind: 'shield' };
      scene.add(shield);
      g.effects.push(shield);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3, 3.5, isLow ? 20 : 32),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
      ) as unknown as FxMesh;
      ring.position.set(x, y, HIT_Z);
      ring.userData = { life: 1, scale: 1, kind: 'ring' };
      scene.add(ring);
      g.effects.push(ring);

      const count = isLow ? 12 : 24;
      for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.45, 0.45),
          new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 }),
        ) as unknown as FxMesh;
        p.position.set(x, y, HIT_Z);
        p.userData = {
          life: 1,
          scale: 1,
          kind: 'particle',
          vel: new THREE.Vector3((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 35, Math.random() * 25),
          rotSpeed: Math.random() * 15,
        };
        scene.add(p);
        g.effects.push(p);
      }
    };

    const triggerHit = (projectile: THREE.Group, index: number) => {
      const data = projectile.userData as ProjectileData;
      const corner = cornerByKey(data.targetKey);
      disposeProjectile(projectile);
      g.projectiles.splice(index, 1);
      if (data.isBoss) {
        flashRef.current?.style.setProperty('opacity', '1');
        window.setTimeout(() => flashRef.current?.style.setProperty('opacity', '0'), 90);
        createShield(0, 0, 0xffffff);
      } else {
        createShield(corner.key.endsWith('L') ? -6 : 6, corner.key.startsWith('T') ? 4 : -3, corner.hex);
        const cue = cueRefs.current[corner.key];
        if (cue) {
          cue.style.opacity = '1';
          window.setTimeout(() => {
            cue.style.opacity = '0';
          }, 260);
        }
        createAction(corner, ['막았어요', '좋아요', '방어 성공', '나이스'][Math.floor(Math.random() * 4)]!);
      }
      g.stims += data.isBoss ? 1 : 1;
      g.combo++;
      g.maxCombo = Math.max(g.maxCombo, g.combo);
      g.score += data.isBoss ? 500 : 100 + g.combo * 20;
      g.laneCount[corner.lane]++;
      g.frameShake = data.isBoss || g.combo > 10 ? 14 : 7;
      if (hudScoreRef.current) hudScoreRef.current.textContent = String(g.score);
      if (hudComboRef.current) hudComboRef.current.textContent = `${g.combo} COMBO`;
    };

    const scheduleNext = (nowSec: number, phase: SpawnPhase) => {
      const gap = travelSec * randBetween(phase.intervalMul[0], phase.intervalMul[1]);
      g.nextSpawnAt = nowSec + Math.max(0.35, gap);
    };

    const spawnRandomWave = (phase: SpawnPhase) => {
      g.currentSpeed = flightSpeedFromSec(travelSec, phase.speedMult);
      const isDouble = phase.doubleChance > 0 && Math.random() < phase.doubleChance;
      if (isDouble) {
        const a = pickCorner(g.lastStart);
        const b = pickCorner(a);
        spawnShot(a, undefined, g.currentSpeed);
        spawnShot(b, undefined, g.currentSpeed);
        g.lastStart = b;
        showCallout('두 곳 방어', '#00e5ff', 800);
        return;
      }
      const start = pickCorner(g.lastStart);
      const curved = Math.random() < phase.curveChance;
      const target = curved ? pickCorner(start) : start;
      spawnShot(start, target, g.currentSpeed);
      g.lastStart = start;
      const hitCorner = cornerByKey(target);
      showCallout(hitCorner.callout, hitCorner.css, 780);
    };

    const clock = new THREE.Clock();
    const animate = () => {
      if (!g.running) return;
      const delta = Math.min(0.05, clock.getDelta());
      const nowSec = (performance.now() - g.startedAt) / 1000;
      const progress = Math.max(0, Math.min(1, nowSec / duration));
      const phase = phaseForProgress(phases, progress);

      if (phase.id !== g.phaseId) {
        g.phaseId = phase.id;
        g.currentSpeed = flightSpeedFromSec(travelSec, phase.speedMult);
        showCallout(phase.msg, phase.col, 1700);
      }

      // 후반: 보스 1회 (랜덤 코너)
      if (!g.bossSpawned && progress >= 0.88 && nowSec < duration - 1.2) {
        g.bossSpawned = true;
        g.currentSpeed = flightSpeedFromSec(travelSec, 0.78);
        const bossStart = pickCorner(g.lastStart);
        spawnShot(bossStart, bossStart, g.currentSpeed, true);
        g.lastStart = bossStart;
        showCallout('정면 방어', '#ffffff', 900);
        scheduleNext(nowSec, phase);
      } else if (nowSec >= g.nextSpawnAt && nowSec < duration - 1.5 && phase.id < 5) {
        spawnRandomWave(phase);
        scheduleNext(nowSec, phase);
      } else if (nowSec >= g.nextSpawnAt && nowSec < duration - 1.5 && phase.id >= 5 && g.bossSpawned) {
        // 보스 이후 가끔 일반 슛
        if (Math.random() < 0.55) spawnRandomWave({ ...phase, doubleChance: 0, speedMult: 1.1 });
        scheduleNext(nowSec, phase);
      }

      fieldGrid.position.z += g.currentSpeed * 0.5 * delta;
      if (fieldGrid.position.z > 10) fieldGrid.position.z = 0;
      ceilingGrid.position.z = fieldGrid.position.z;

      for (let i = g.projectiles.length - 1; i >= 0; i--) {
        const p = g.projectiles[i]!;
        const data = p.userData as ProjectileData;
        p.position.z += data.speed * delta;
        p.rotation.x += 12 * delta;
        p.rotation.y += 12 * delta;
        const progress = Math.max(0, Math.min(1, (p.position.z - SPAWN_Z) / (HIT_Z - SPAWN_Z)));
        const ease = progress * progress * (3 - 2 * progress);
        const swing = Math.sin(progress * Math.PI) * 6;
        const swingDir = data.targetX > data.startX ? -1 : 1;
        p.position.x = THREE.MathUtils.lerp(data.startX, data.targetX, ease) + (data.isCurve ? swing * swingDir : 0);
        p.position.y = THREE.MathUtils.lerp(data.startY, data.targetY, ease);
        if (data.isCurve && !data.isBoss) {
          const color = new THREE.Color(cornerByKey(data.startKey).hex).lerp(new THREE.Color(cornerByKey(data.targetKey).hex), ease);
          data.coreMesh.material.color = color;
        }
        if (!isLow || Math.random() > 0.45) {
          const trail = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.55, 0.55),
            new THREE.MeshBasicMaterial({ color: data.coreMesh.material.color, transparent: true, opacity: 0.42 }),
          ) as Trail;
          trail.position.copy(p.position);
          trail.userData = { life: 1 };
          scene.add(trail);
          g.trails.push(trail);
        }
        if (p.position.z >= HIT_Z) triggerHit(p, i);
      }

      for (let i = g.trails.length - 1; i >= 0; i--) {
        const trail = g.trails[i]!;
        trail.userData.life -= delta * 3.4;
        trail.scale.setScalar(Math.max(0, trail.userData.life));
        trail.material.opacity = Math.max(0, trail.userData.life * 0.42);
        if (trail.userData.life <= 0) {
          scene.remove(trail);
          trail.geometry.dispose();
          trail.material.dispose();
          g.trails.splice(i, 1);
        }
      }

      for (let i = g.effects.length - 1; i >= 0; i--) {
        const fx = g.effects[i]!;
        const data = fx.userData;
        data.life -= delta * (data.kind === 'particle' ? 2 : 3);
        if (data.kind === 'particle') {
          if (data.vel) fx.position.addScaledVector(data.vel, delta);
          fx.rotation.x += (data.rotSpeed ?? 0) * delta;
          fx.rotation.y += (data.rotSpeed ?? 0) * delta;
          fx.scale.setScalar(Math.max(0, data.life));
        } else {
          data.scale += delta * (data.kind === 'ring' ? 8 : 12);
          if (data.kind === 'shield') fx.scale.set(data.scale, 1, data.scale);
          else fx.scale.setScalar(data.scale);
        }
        fx.material.opacity = Math.max(0, data.life);
        if (data.life <= 0) {
          scene.remove(fx);
          fx.geometry.dispose();
          fx.material.dispose();
          g.effects.splice(i, 1);
        }
      }

      if (g.frameShake > 0 && playRef.current) {
        g.frameShake *= 0.82;
        const sx = (Math.random() - 0.5) * g.frameShake;
        const sy = (Math.random() - 0.5) * g.frameShake;
        playRef.current.style.transform = `translate(${sx}px,${sy}px)`;
      } else if (playRef.current) {
        playRef.current.style.transform = 'translate(0,0)';
      }

      renderer.render(scene, camera);
      g.raf = requestAnimationFrame(animate);
    };

    const updateTime = () => {
      if (hudTimeRef.current) hudTimeRef.current.textContent = String(g.timeLeft);
    };
    updateTime();
    if (hudScoreRef.current) hudScoreRef.current.textContent = '0';
    if (hudComboRef.current) hudComboRef.current.textContent = 'READY';

    const endsAtMs = performance.now() + duration * 1000;
    g.timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
      if (next !== g.timeLeft) {
        g.timeLeft = next;
        updateTime();
        setWarn(next <= 10);
      }
      if (next <= 0) endGame();
    }, 250);

    const onResize = () => {
      const w = play.clientWidth || window.innerWidth;
      const h = play.clientHeight || window.innerHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const unbindResize = bindViewportResize(play, onResize);
    onResize();
    renderer.render(scene, camera);
    g.raf = requestAnimationFrame(animate);

    return () => {
      unbindResize();
      g.running = false;
      if (g.raf != null) cancelAnimationFrame(g.raf);
      if (g.timer) clearInterval(g.timer);
      g.projectiles.forEach((p) => disposeProjectile(p));
      g.trails.forEach((t) => {
        scene.remove(t);
        t.geometry.dispose();
        t.material.dispose();
      });
      g.effects.forEach((fx) => {
        scene.remove(fx);
        fx.geometry.dispose();
        fx.material.dispose();
      });
      soccerMap.dispose();
      fieldGrid.geometry.dispose();
      (fieldGrid.material as THREE.Material).dispose();
      ceilingGrid.geometry.dispose();
      (ceilingGrid.material as THREE.Material).dispose();
      goalFrame.geometry.dispose();
      (goalFrame.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [durationSec, endGame, goalkeeperTier, speedSec]);

  return (
    <div className="gk">
      <style>{css}</style>
      <div className="gk-hud">
        <div className="gk-hc">
          <div className="gk-hk">Time</div>
          <div className={`gk-hv${warn ? ' warn' : ''}`} ref={hudTimeRef} />
        </div>
        <div className="gk-hc">
          <div className="gk-hk">Defense</div>
          <div className="gk-hv" ref={hudScoreRef} />
        </div>
        <div className="gk-hc grow">
          <div className="gk-hk">시지각 반응</div>
          <div className="gk-hv" ref={hudComboRef} style={{ fontSize: 'clamp(12px,2vw,19px)' }} />
        </div>
        <div className="gk-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="gk-stop" onClick={stopGame}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>
      <div ref={playRef} className="gk-play">
        <canvas ref={cvRef} className="gk-canvas" />
        <div className="gk-ui">
          <div className="gk-cue tl" ref={(el) => { cueRefs.current.TL = el; }} />
          <div className="gk-cue tr" ref={(el) => { cueRefs.current.TR = el; }} />
          <div className="gk-cue bl" ref={(el) => { cueRefs.current.BL = el; }} />
          <div className="gk-cue br" ref={(el) => { cueRefs.current.BR = el; }} />
          <div ref={calloutRef} className="gk-callout" />
          <div ref={actionRootRef} />
          <div ref={flashRef} className="gk-flash" />
          <div className="gk-net-v" />
          <div className="gk-net-h" />
          <div className="gk-corner tl" style={{ color: CORNERS[0].css }}>{CORNERS[0].label}</div>
          <div className="gk-corner tr" style={{ color: CORNERS[1].css }}>{CORNERS[1].label}</div>
          <div className="gk-corner bl" style={{ color: CORNERS[2].css }}>{CORNERS[2].label}</div>
          <div className="gk-corner br" style={{ color: CORNERS[3].css }}>{CORNERS[3].label}</div>
        </div>
      </div>
    </div>
  );
}
