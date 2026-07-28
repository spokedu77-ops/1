'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { bindViewportResize } from '../lib/bindViewportResize';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';

export const NUMBER_CART_ROUND_OPTIONS = [7, 10, 15, 25] as const;

export function normalizeNumberCartRounds(value: number): number {
  const n = Math.round(Number.isFinite(value) ? value : 5);
  if ((NUMBER_CART_ROUND_OPTIONS as readonly number[]).includes(n)) return n;
  return NUMBER_CART_ROUND_OPTIONS.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best));
}

/** 원본 HTML 순서: 빨(좌끝)·노·초·파(우끝) — 화면 좌우를 넓게 쓰도록 X·크기 확대 */
const DOOR_COLORS = [
  { hex: 0xff3333, css: '#ff3333', name: 'RED', x: -58 },
  { hex: 0xffcc00, css: '#ffcc00', name: 'YELLOW', x: -22 },
  { hex: 0x33ff33, css: '#33ff33', name: 'GREEN', x: 22 },
  { hex: 0x3388ff, css: '#3388ff', name: 'BLUE', x: 58 },
] as const;

const DOOR_Z = -34;
const DOOR_SIZE_SCALE = 3.55;
/** 문이 더 바깥·더 커져도 터널 벽에 파묻히지 않도록 반지름 확대 */
const CAVE_RADIUS = 82;
/**
 * 긴 기차 뒤판(로컬 +Z ≈ 5.15)이 카메라 시야 하단 가장자리에 오도록.
 * 카메라(0,10,64) → lookAt(0,0,-14) 기준 — 숫자판이 잘리지 않는 선에서 최대한 하단.
 */
const CART_START = new THREE.Vector3(0, 0, 48);
/** 기차 위에 레일이 붙고, 카메라(z=64) 쪽으로 조금 더 연장 */
const RAIL_NEAR_Z = 62;
const CAMERA_LOOK_Y = 0;
const CAMERA_LOOK_Z = -14;
const MAIN_JUNCTION_Z = 10;
const CART_END_Z = DOOR_Z + 4;
const TUNNEL_LENGTH = CART_START.z - DOOR_Z + 50;

type RailPath = {
  mainLen: number;
  branchLen: number;
  targetX: number;
};

function buildRailPath(targetX: number): RailPath {
  const mainLen = CART_START.z - MAIN_JUNCTION_Z;
  const branchLen = Math.hypot(targetX, MAIN_JUNCTION_Z - CART_END_Z);
  return { mainLen, branchLen, targetX };
}

function positionOnRail(path: RailPath, u: number): { x: number; z: number } {
  const clamped = Math.max(0, Math.min(1, u));
  const totalLen = path.mainLen + path.branchLen;
  const dist = clamped * totalLen;
  if (dist <= path.mainLen || path.branchLen <= 0) {
    const seg = path.mainLen <= 0 ? 0 : dist / path.mainLen;
    return { x: 0, z: CART_START.z - seg * path.mainLen };
  }
  const seg = (dist - path.mainLen) / path.branchLen;
  return {
    x: path.targetX * seg,
    z: MAIN_JUNCTION_Z + (CART_END_Z - MAIN_JUNCTION_Z) * seg,
  };
}

export type NumberCartTier = 1 | 2 | 3;

type Phase = 'PREP' | 'TRANSIT' | 'ARRIVE';

type DoorObj = {
  colorIdx: number;
  x: number;
  z: number;
  group: THREE.Group;
  signCtx: CanvasRenderingContext2D;
  signTex: THREE.CanvasTexture;
  doorMat: THREE.MeshStandardMaterial;
  doorLight: THREE.PointLight;
  haloLight: THREE.PointLight;
  label: string;
};

type RoundPayload = {
  cartLabel: string;
  targetDoorIdx: number;
  doorLabels: [string, string, string, string];
};

type CartGame = {
  running: boolean;
  targetRounds: number;
  phase: Phase;
  phaseStartMs: number;
  prepMs: number;
  travelMs: number;
  targetDoorIdx: number;
  rounds: number;
  laneCount: [number, number, number, number];
  roundTimer: ReturnType<typeof setTimeout> | null;
  raf: number | null;
};

type Props = {
  targetRounds: number;
  speedLevel: number;
  speedSec: number;
  /** L1=1~4 단일, L2=1~8 쌍, L3=사칙연산 */
  tier?: NumberCartTier;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function tierHudTitle(tier: NumberCartTier): string {
  if (tier === 3) return '계산';
  return '숫자';
}

function tierBadge(tier: NumberCartTier): string {
  if (tier === 1) return 'L1 · 1~4';
  if (tier === 2) return 'L2 · 1~8';
  return 'L3 · 사칙연산';
}

function pickUniqueDistractors(correct: number, count: number, forbidden = new Set<number>()): number[] {
  const out = new Set<number>();
  const blocked = new Set(forbidden);
  blocked.add(correct);
  const deltas = [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10, 7, -7];
  let guard = 0;
  while (out.size < count && guard < 80) {
    guard += 1;
    let cand = correct + deltas[Math.floor(Math.random() * deltas.length)]!;
    if (cand <= 0) cand = correct + 2 + Math.floor(Math.random() * 6);
    if (!blocked.has(cand)) out.add(cand);
  }
  while (out.size < count) {
    const cand = 2 + Math.floor(Math.random() * 98);
    if (!blocked.has(cand)) out.add(cand);
  }
  return [...out].slice(0, count);
}

function generateMathRound(): { cartLabel: string; answer: number; forbidden: number[] } {
  const ops = ['+', '-', '×', '÷'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)]!;
  if (op === '+') {
    const a = 2 + Math.floor(Math.random() * 11);
    const b = 2 + Math.floor(Math.random() * 11);
    return { cartLabel: `${a} + ${b}`, answer: a + b, forbidden: [a, b] };
  }
  if (op === '-') {
    const a = 6 + Math.floor(Math.random() * 15);
    const b = 1 + Math.floor(Math.random() * (a - 1));
    return { cartLabel: `${a} - ${b}`, answer: a - b, forbidden: [a, b] };
  }
  if (op === '×') {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    return { cartLabel: `${a} × ${b}`, answer: a * b, forbidden: [a, b] };
  }
  const b = 2 + Math.floor(Math.random() * 8);
  const answer = 2 + Math.floor(Math.random() * 8);
  const a = b * answer;
  return { cartLabel: `${a} ÷ ${b}`, answer, forbidden: [a, b] };
}

function buildRound(tier: NumberCartTier): RoundPayload {
  if (tier === 1) {
    const nums = shuffle([1, 2, 3, 4]);
    const targetDoorIdx = Math.floor(Math.random() * 4);
    return {
      cartLabel: String(nums[targetDoorIdx]),
      targetDoorIdx,
      doorLabels: nums.map(String) as [string, string, string, string],
    };
  }
  if (tier === 2) {
    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    const doorLabels = [
      `${numbers[0]}   ${numbers[1]}`,
      `${numbers[2]}   ${numbers[3]}`,
      `${numbers[4]}   ${numbers[5]}`,
      `${numbers[6]}   ${numbers[7]}`,
    ] as [string, string, string, string];
    const targetNumber = numbers[Math.floor(Math.random() * 8)]!;
    let targetDoorIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (numbers[i * 2] === targetNumber || numbers[i * 2 + 1] === targetNumber) {
        targetDoorIdx = i;
        break;
      }
    }
    return { cartLabel: String(targetNumber), targetDoorIdx, doorLabels };
  }
  const { cartLabel, answer, forbidden } = generateMathRound();
  const wrong = pickUniqueDistractors(answer, 3, new Set(forbidden));
  const options = shuffle([answer, ...wrong]);
  const targetDoorIdx = options.indexOf(answer);
  return {
    cartLabel,
    targetDoorIdx,
    doorLabels: options.map(String) as [string, string, string, string],
  };
}

/** 노이즈 텍스처(암벽·바닥) — 외부 이미지 없이 캔버스로 절차적 생성 */
function generateNoiseTexture(size: number, baseR: number, baseG: number, baseB: number, variance: number, detail: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    let noise = (Math.random() - 0.5) * variance;
    const x = (i / 4) % size;
    const y = Math.floor(i / 4 / size);
    if (detail) noise += Math.sin(x * 0.1) * Math.cos(y * 0.1) * (variance / 2);
    data[i] = Math.max(0, Math.min(255, baseR + noise));
    data[i + 1] = Math.max(0, Math.min(255, baseG + noise));
    data[i + 2] = Math.max(0, Math.min(255, baseB + noise));
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function generateMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, 0, Math.random() * 2 + 1, 256);
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 30 + 10;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(139, 69, 19, ${Math.random() * 0.4})`);
    grad.addColorStop(1, 'rgba(139, 69, 19, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Noto+Sans+KR:wght@500;700;900&display=swap');
.ncart{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#000;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.ncart,.ncart *{box-sizing:border-box}
.ncart-hud{height:72px;display:flex;align-items:stretch;background:rgba(0,0,0,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.ncart-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.ncart-hc.grow{flex:1;align-items:center;border-right:none}
.ncart-hk{font-size:9px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.28)}
.ncart-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.ncart-hv.warn{animation:ncartw .5s ease-in-out infinite}
@keyframes ncartw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.ncart-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.ncart-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.ncart-play{position:relative;flex:1;min-height:0}
.ncart-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ncart-vignette{position:absolute;inset:0;z-index:15;pointer-events:none;background:radial-gradient(ellipse 85% 70% at 50% 42%,rgba(0,0,0,0) 0%,rgba(0,0,0,.35) 55%,rgba(0,0,0,.78) 100%)}
.ncart-flash{position:absolute;inset:0;z-index:22;pointer-events:none;opacity:0;background:#fff;transition:opacity .06s linear;mix-blend-mode:screen}
.ncart-status{position:absolute;left:50%;top:clamp(10px,1.8vw,16px);transform:translateX(-50%);z-index:20;pointer-events:none;text-align:center;padding:5px 14px;border-radius:999px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);font-family:monospace;font-size:clamp(10px,1.35vw,13px);letter-spacing:.06em;color:#10b981;white-space:nowrap;max-width:min(92vw,560px);overflow:hidden;text-overflow:ellipsis}
.ncart-target{position:absolute;left:50%;bottom:clamp(24%,26vh,32%);top:auto;transform:translateX(-50%);z-index:18;pointer-events:none;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 22px 9px;border-radius:14px;background:rgba(6,10,18,.52);border:1px solid rgba(245,158,11,.2);backdrop-filter:blur(8px);box-shadow:0 6px 22px rgba(0,0,0,.32);transition:opacity .3s ease,transform .3s ease}
.ncart-target.hidden{opacity:0;transform:translateX(-50%) translateY(10px)}
.ncart-target-k{font-size:clamp(9px,1.15vw,11px);font-weight:800;letter-spacing:.2em;color:rgba(255,255,255,.36);text-transform:uppercase;line-height:1}
.ncart-target-v{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(40px,7.2vw,58px);line-height:.95;color:#ffe8b8;text-shadow:0 0 14px rgba(245,158,11,.5);-webkit-text-stroke:1px rgba(245,158,11,.22);white-space:nowrap}
.ncart-target-v.expr{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(34px,6vw,52px);font-weight:400;letter-spacing:.08em;-webkit-text-stroke:0;text-shadow:0 0 12px rgba(245,158,11,.45),0 0 2px rgba(255,232,184,.8)}
.ncart-tier{font-size:clamp(10px,1.3vw,12px);font-weight:800;letter-spacing:.16em;color:#f59e0b;margin-top:2px}
${REACT_TRAIN_VIEWPORT_CSS}
`;

export function NumberCartReactionTraining({ targetRounds, speedLevel, speedSec, tier = 2, onExit, onComplete }: Props) {
  const cartTier: NumberCartTier = tier === 1 || tier === 3 ? tier : 2;
  const totalRounds = normalizeNumberCartRounds(targetRounds);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const hudRoundRef = useRef<HTMLDivElement>(null);
  const hudTierRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const targetHudRef = useRef<HTMLDivElement>(null);
  const targetNumRef = useRef<HTMLDivElement>(null);
  const targetKeyRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<CartGame | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  /** 출발 전 대기(숫자·문 확인) 시간: speedSec(1~6초)을 그대로 사용 */
  const fallTimeSec = Math.max(1, Math.min(6, Number.isFinite(speedSec) ? speedSec : 4));
  const prepMs = fallTimeSec * 1000;
  const lv = Math.max(1, Math.min(7, Math.round(Number.isFinite(speedLevel) ? speedLevel : 4)));
  /** 이동(주행) 시간: 난이도가 높을수록 살짝 빨라짐 */
  const travelMs = Math.max(3500, 5600 - (lv - 1) * 270);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.roundTimer) clearTimeout(g.roundTimer);
    onCompleteRef.current({
      stims: g.rounds,
      maxCombo: g.rounds,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.roundTimer) clearTimeout(g.roundTimer);
    onCompleteRef.current({
      stims: g.rounds,
      maxCombo: g.rounds,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;

    const g: CartGame = {
      running: true,
      targetRounds: totalRounds,
      phase: 'PREP',
      phaseStartMs: 0,
      prepMs,
      travelMs,
      targetDoorIdx: 0,
      rounds: 0,
      laneCount: [0, 0, 0, 0],
      roundTimer: null,
      raf: null,
    };
    gRef.current = g;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.009);

    const w0 = play.clientWidth || window.innerWidth;
    const h0 = play.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(72, w0 / h0, 0.1, 260);
    camera.position.set(0, 10, 64);
    camera.lookAt(0, CAMERA_LOOK_Y, CAMERA_LOOK_Z);

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const disposeGeos: THREE.BufferGeometry[] = [];
    const disposeMats: THREE.Material[] = [];
    const disposeTex: THREE.Texture[] = [];

    // 조명: 어두운 터널 톤 유지 + 문·기차만 읽히게
    const hemiLight = new THREE.HemisphereLight(0x9fb3d9, 0x3a2c1d, 2.4);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x50525f, 0.9);
    scene.add(ambientLight);

    const cartLight = new THREE.PointLight(0xffb347, 4.5, 34);
    cartLight.castShadow = true;
    cartLight.shadow.bias = -0.001;
    scene.add(cartLight);

    // 기차 대기 위치까지 닿도록 스포트 조준
    const spotLight = new THREE.SpotLight(0xffffff, 3);
    spotLight.position.set(0, 22, CART_START.z + 8);
    spotLight.target.position.set(0, 0, CART_START.z);
    spotLight.angle = Math.PI / 2.4;
    spotLight.penumbra = 0.6;
    spotLight.decay = 1;
    spotLight.distance = 110;
    spotLight.castShadow = true;
    scene.add(spotLight);
    scene.add(spotLight.target);

    // 1. 동굴
    const rockColorMap = generateNoiseTexture(512, 78, 76, 82, 26, true);
    const rockBumpMap = generateNoiseTexture(512, 128, 128, 128, 100, true);
    disposeTex.push(rockColorMap, rockBumpMap);
    const caveMaterial = new THREE.MeshStandardMaterial({
      map: rockColorMap,
      bumpMap: rockBumpMap,
      bumpScale: 2.0,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.BackSide,
    });
    disposeMats.push(caveMaterial);
    const caveGeometry = new THREE.CylinderGeometry(CAVE_RADIUS, CAVE_RADIUS, TUNNEL_LENGTH, 32);
    caveGeometry.rotateX(Math.PI / 2);
    disposeGeos.push(caveGeometry);
    const cave = new THREE.Mesh(caveGeometry, caveMaterial);
    cave.position.set(0, 5, (CART_START.z + DOOR_Z) / 2);
    cave.receiveShadow = true;
    scene.add(cave);

    // 2. 바닥
    const groundTex = generateNoiseTexture(512, 58, 50, 42, 18, false);
    disposeTex.push(groundTex);
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: groundTex,
      bumpMap: rockBumpMap,
      bumpScale: 0.5,
      roughness: 1.0,
    });
    disposeMats.push(groundMaterial);
    const groundGeo = new THREE.PlaneGeometry(180, TUNNEL_LENGTH + 20);
    disposeGeos.push(groundGeo);
    const ground = new THREE.Mesh(groundGeo, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 3. 선로
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4 });
    const tieMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2013, roughness: 1.0 });
    disposeMats.push(railMaterial, tieMaterial);
    const railGeo = new THREE.BoxGeometry(0.2, 0.2, 1);
    const tieGeo = new THREE.BoxGeometry(3, 0.2, 0.5);
    disposeGeos.push(railGeo, tieGeo);

    const mainZEnd = MAIN_JUNCTION_Z;
    for (let z = RAIL_NEAR_Z; z >= mainZEnd; z -= 1.5) {
      const tie = new THREE.Mesh(tieGeo, tieMaterial);
      tie.position.set(0, -1.9, z);
      tie.receiveShadow = true;
      scene.add(tie);
      const leftRail = new THREE.Mesh(railGeo, railMaterial);
      leftRail.scale.set(1, 1, 1.5);
      leftRail.position.set(-1, -1.7, z);
      scene.add(leftRail);
      const rightRail = new THREE.Mesh(railGeo, railMaterial);
      rightRail.scale.set(1, 1, 1.5);
      rightRail.position.set(1, -1.7, z);
      scene.add(rightRail);
    }

    const branchEndZ = DOOR_Z;
    DOOR_COLORS.forEach((d) => {
      const startX = 0;
      const startZ = mainZEnd;
      const endX = d.x;
      const endZ = branchEndZ;
      const distance = Math.sqrt((endX - startX) ** 2 + (endZ - startZ) ** 2);
      const steps = Math.floor(distance / 1.5);
      for (let j = 1; j <= steps; j++) {
        const t = j / steps;
        const x = startX + (endX - startX) * t;
        const z = startZ + (endZ - startZ) * t;
        const angle = Math.atan2(endX - startX, endZ - startZ);
        const tie = new THREE.Mesh(tieGeo, tieMaterial);
        tie.position.set(x, -1.9, z);
        tie.rotation.y = angle;
        tie.receiveShadow = true;
        scene.add(tie);
        const leftRail = new THREE.Mesh(railGeo, railMaterial);
        leftRail.scale.set(1, 1, 1.5);
        leftRail.position.set(x - Math.cos(angle) * 1, -1.7, z + Math.sin(angle) * 1);
        leftRail.rotation.y = angle;
        scene.add(leftRail);
        const rightRail = new THREE.Mesh(railGeo, railMaterial);
        rightRail.scale.set(1, 1, 1.5);
        rightRail.position.set(x + Math.cos(angle) * 1, -1.7, z - Math.sin(angle) * 1);
        rightRail.rotation.y = angle;
        scene.add(rightRail);
      }
    });

    // 4. 문 4개 — 전면 색 + 아주 얇은 문 형태(같은 색 테두리)
    const doors: DoorObj[] = [];

    DOOR_COLORS.forEach((config, index) => {
      const frameGroup = new THREE.Group();
      frameGroup.position.set(config.x, 0, DOOR_Z);

      const doorMat = new THREE.MeshStandardMaterial({
        color: config.hex,
        metalness: 0.35,
        roughness: 0.35,
        emissive: config.hex,
        emissiveIntensity: 0.65,
      });
      disposeMats.push(doorMat);
      const doorGeo = new THREE.BoxGeometry(6.6, 9.6, 0.55);
      disposeGeos.push(doorGeo);
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.position.set(0, 2.5, 0);
      frameGroup.add(doorMesh);

      // 아주 얇은 문틀 — 검정 없이 같은 색·약간 더 밝게
      const rimMat = new THREE.MeshBasicMaterial({ color: config.hex });
      disposeMats.push(rimMat);
      const slimPillarGeo = new THREE.BoxGeometry(0.35, 9.8, 0.7);
      disposeGeos.push(slimPillarGeo);
      const leftRim = new THREE.Mesh(slimPillarGeo, rimMat);
      leftRim.position.set(-3.45, 2.5, 0.15);
      frameGroup.add(leftRim);
      const rightRim = new THREE.Mesh(slimPillarGeo, rimMat);
      rightRim.position.set(3.45, 2.5, 0.15);
      frameGroup.add(rightRim);
      const slimTopGeo = new THREE.BoxGeometry(7.25, 0.35, 0.7);
      disposeGeos.push(slimTopGeo);
      const topRim = new THREE.Mesh(slimTopGeo, rimMat);
      topRim.position.set(0, 7.5, 0.15);
      frameGroup.add(topRim);
      const slimBotGeo = new THREE.BoxGeometry(7.25, 0.28, 0.7);
      disposeGeos.push(slimBotGeo);
      const botRim = new THREE.Mesh(slimBotGeo, rimMat);
      botRim.position.set(0, -2.35, 0.15);
      frameGroup.add(botRim);

      const doorLight = new THREE.PointLight(config.hex, 5, 22);
      doorLight.position.set(0, 5, 3);
      frameGroup.add(doorLight);

      const haloLight = new THREE.PointLight(config.hex, 0, 55);
      haloLight.position.set(0, 4, 4);
      frameGroup.add(haloLight);

      // 사인판: 투명 배경 + 아주 밝은 숫자 (비조명 Basic)
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 256;
      const signCtx = signCanvas.getContext('2d')!;
      const signTex = new THREE.CanvasTexture(signCanvas);
      disposeTex.push(signTex);
      const signMat = new THREE.MeshBasicMaterial({
        map: signTex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      disposeMats.push(signMat);
      const signGeo = new THREE.BoxGeometry(5.6, 3.0, 0.12);
      disposeGeos.push(signGeo);
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 3.7, 0.45);
      frameGroup.add(signMesh);

      frameGroup.scale.setScalar(DOOR_SIZE_SCALE);

      scene.add(frameGroup);
      doors.push({
        colorIdx: index,
        x: config.x,
        z: DOOR_Z,
        group: frameGroup,
        signCtx,
        signTex,
        doorMat,
        doorLight,
        haloLight,
        label: '',
      });
    });

    const updateDoorSignText = (door: DoorObj, text: string) => {
      const ctx = door.signCtx;
      const compact = text.replace(/\s+/g, '');
      const fontSize = compact.length <= 2 ? 210 : compact.length <= 3 ? 176 : 140;
      ctx.clearRect(0, 0, 512, 256);
      // 어두운 박스 없이 — 순백 숫자만 (아주 밝게)
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${fontSize}px "Arial", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText(text, 256, 128);
      door.signTex.needsUpdate = true;
      door.label = text;
    };

    const resetDoorGlow = () => {
      doors.forEach((door, idx) => {
        const hex = DOOR_COLORS[idx]!.hex;
        door.group.visible = true;
        door.doorMat.color.setHex(hex);
        door.doorMat.emissive.setHex(hex);
        door.doorMat.emissiveIntensity = 0.65;
        door.doorLight.intensity = 5;
        door.doorLight.distance = 22;
        door.haloLight.intensity = 0;
        door.group.scale.setScalar(DOOR_SIZE_SCALE);
      });
    };

    /** 통과 순간: 정답 색 전면 번쩍(0.2초) — 문은 모두 유지(정답·오답 비교) */
    let flashHideTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerColorFlash = (doorIdx: number) => {
      const el = flashRef.current;
      if (!el) return;
      if (flashHideTimer) clearTimeout(flashHideTimer);
      el.style.background = DOOR_COLORS[doorIdx]!.css;
      el.style.opacity = '0.85';
      flashHideTimer = setTimeout(() => {
        if (flashRef.current) flashRef.current.style.opacity = '0';
        flashHideTimer = null;
      }, 200);
    };

    // 5. 기차 (기관차 + 객차 2량)
    const cart = new THREE.Group();
    const cartMetalTex = generateMetalTexture();
    disposeTex.push(cartMetalTex);
    const cartMetal = new THREE.MeshStandardMaterial({ map: cartMetalTex, color: 0x9a9ca6, metalness: 0.7, roughness: 0.35 });
    const frameMetal = new THREE.MeshStandardMaterial({ color: 0x565a66, metalness: 0.85, roughness: 0.45 });
    const locoRed = new THREE.MeshStandardMaterial({ color: 0x9b2c2c, metalness: 0.55, roughness: 0.42 });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1a2840,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x223355,
      emissiveIntensity: 0.18,
    });
    disposeMats.push(cartMetal, frameMetal, locoRed, windowMat);

    const chassisGeo = new THREE.BoxGeometry(3.2, 0.38, 11.2);
    disposeGeos.push(chassisGeo);
    const chassis = new THREE.Mesh(chassisGeo, frameMetal);
    chassis.position.y = -0.62;
    chassis.castShadow = true;
    cart.add(chassis);

    const bolsterGeo = new THREE.BoxGeometry(3.0, 0.22, 0.45);
    disposeGeos.push(bolsterGeo);
    [4.2, 1.6, -1.0, -3.6].forEach((z) => {
      const bolster = new THREE.Mesh(bolsterGeo, frameMetal);
      bolster.position.set(0, -0.42, z);
      cart.add(bolster);
    });

    const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.36, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    disposeGeos.push(wheelGeo);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2a2d36, metalness: 0.85, roughness: 0.5 });
    disposeMats.push(wheelMat);
    const axleGeo = new THREE.CylinderGeometry(0.16, 0.16, 3.35, 8);
    axleGeo.rotateZ(Math.PI / 2);
    disposeGeos.push(axleGeo);

    [4.55, 2.55, 0.55, -1.45, -3.45, -5.25].forEach((z) => {
      const axle = new THREE.Mesh(axleGeo, frameMetal);
      axle.position.set(0, -0.62, z);
      cart.add(axle);
      [-1.7, 1.7].forEach((x) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(x, -0.62, z);
        wheel.castShadow = true;
        cart.add(wheel);
      });
    });

    const trainBody = new THREE.Group();
    trainBody.position.y = 0.2;

    const coachGeo = new THREE.BoxGeometry(2.85, 2.05, 3.7);
    const roofGeo = new THREE.BoxGeometry(2.95, 0.28, 3.8);
    const winGeo = new THREE.PlaneGeometry(0.52, 0.72);
    const couplerGeo = new THREE.BoxGeometry(0.55, 0.28, 0.55);
    disposeGeos.push(coachGeo, roofGeo, winGeo, couplerGeo);

    const addCoach = (zCenter: number) => {
      const coach = new THREE.Mesh(coachGeo, cartMetal);
      coach.position.set(0, 0.18, zCenter);
      coach.castShadow = true;
      trainBody.add(coach);

      const roof = new THREE.Mesh(roofGeo, frameMetal);
      roof.position.set(0, 1.28, zCenter);
      trainBody.add(roof);

      for (const sx of [-1.44, 1.44]) {
        for (const wz of [-1.1, -0.35, 0.35, 1.1]) {
          const win = new THREE.Mesh(winGeo, windowMat);
          win.position.set(sx, 0.38, zCenter + wz);
          win.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
          trainBody.add(win);
        }
      }
    };

    // 객차 2량 + 연결부 (앞=−Z, 뒤=+Z)
    addCoach(-0.95);
    const coupler = new THREE.Mesh(couplerGeo, frameMetal);
    coupler.position.set(0, 0.05, 1.15);
    trainBody.add(coupler);
    addCoach(3.25);

    const locoGroup = new THREE.Group();
    locoGroup.position.set(0, 0, -4.55);

    const boilerGeo = new THREE.CylinderGeometry(0.92, 1.02, 2.55, 18);
    boilerGeo.rotateX(Math.PI / 2);
    disposeGeos.push(boilerGeo);
    const boiler = new THREE.Mesh(boilerGeo, locoRed);
    boiler.position.y = 0.58;
    boiler.castShadow = true;
    locoGroup.add(boiler);

    const cabGeo = new THREE.BoxGeometry(1.55, 1.45, 1.05);
    disposeGeos.push(cabGeo);
    const cab = new THREE.Mesh(cabGeo, locoRed);
    cab.position.set(0, 0.98, 0.95);
    cab.castShadow = true;
    locoGroup.add(cab);

    const cowGeo = new THREE.ConeGeometry(1.05, 0.85, 4);
    cowGeo.rotateX(-Math.PI / 2);
    disposeGeos.push(cowGeo);
    const cow = new THREE.Mesh(cowGeo, frameMetal);
    cow.position.set(0, 0.12, -1.48);
    locoGroup.add(cow);

    const chimneyGeo = new THREE.CylinderGeometry(0.17, 0.21, 0.75, 10);
    disposeGeos.push(chimneyGeo);
    const chimney = new THREE.Mesh(chimneyGeo, frameMetal);
    chimney.position.set(0, 1.38, -0.15);
    locoGroup.add(chimney);

    const headGeo = new THREE.CircleGeometry(0.24, 14);
    disposeGeos.push(headGeo);
    const headlight = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));
    disposeMats.push(headlight.material as THREE.Material);
    headlight.position.set(0, 0.58, -1.38);
    headlight.rotation.y = Math.PI;
    locoGroup.add(headlight);

    trainBody.add(locoGroup);

    const bufferGeo = new THREE.BoxGeometry(2.6, 0.35, 0.35);
    disposeGeos.push(bufferGeo);
    const buffer = new THREE.Mesh(bufferGeo, frameMetal);
    buffer.position.set(0, 0.05, 5.15);
    trainBody.add(buffer);

    cart.add(trainBody);

    // 목표 숫자판: 맨 뒤 객차 — 대기 시 화면 하단 가장에 걸리도록
    const cartSignCanvas = document.createElement('canvas');
    cartSignCanvas.width = 512;
    cartSignCanvas.height = 256;
    const cartSignCtx = cartSignCanvas.getContext('2d')!;
    const cartSignTexture = new THREE.CanvasTexture(cartSignCanvas);
    cartSignTexture.anisotropy = 4;
    disposeTex.push(cartSignTexture);
    const displayMat = new THREE.MeshBasicMaterial({
      map: cartSignTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    disposeMats.push(displayMat);
    const displayGeo = new THREE.PlaneGeometry(4.2, 2.15);
    disposeGeos.push(displayGeo);
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(0, 2.55, 5.15);
    trainBody.add(display);

    // 숫자판 전용 조명 — 어두운 터널에서도 첫 화면부터 읽히게
    const signLight = new THREE.PointLight(0xffffff, 4.5, 18, 1.6);
    signLight.position.set(0, 3.2, 7.2);
    trainBody.add(signLight);

    cart.position.copy(CART_START);
    scene.add(cart);
    display.visible = true;

    const SIGN_FONT = '"Bebas Neue", "Barlow Condensed", "Noto Sans KR", sans-serif';
    let lastCartSign = '';
    const updateCartSign = (text: string) => {
      lastCartSign = text;
      const ctx = cartSignCtx;
      const w = cartSignCanvas.width;
      const h = cartSignCanvas.height;
      const padX = 52;
      const maxW = w - padX * 2;
      const compact = text.replace(/\s+/g, '');

      ctx.clearRect(0, 0, w, h);
      // 크림 판 + 안쪽 여백 있는 테두리
      ctx.fillStyle = '#f7f2e8';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 10;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.strokeStyle = 'rgba(201,162,39,.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 24, w - 48, h - 48);

      let fontSize = compact.length <= 2 ? 128 : compact.length <= 4 ? 102 : 84;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1c1914';
      // 판 안에 여유 두고 글자 크기 맞추기
      do {
        ctx.font = `400 ${fontSize}px ${SIGN_FONT}`;
        if (ctx.measureText(text).width <= maxW) break;
        fontSize -= 2;
      } while (fontSize > 48);

      // 자간을 살짝 벌려 세련되게
      const gap = Math.max(2, Math.round(fontSize * 0.04));
      const chars = [...text];
      let total = 0;
      const widths = chars.map((ch) => {
        const cw = ctx.measureText(ch).width;
        total += cw;
        return cw;
      });
      total += gap * Math.max(0, chars.length - 1);
      let x = (w - total) / 2;
      const y = h / 2 + 2;
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i]!;
        const cw = widths[i]!;
        ctx.fillText(ch, x + cw / 2, y);
        x += cw + gap;
      }
      cartSignTexture.needsUpdate = true;
    };
    void document.fonts.load('400 96px "Bebas Neue"').then(() => {
      if (lastCartSign) updateCartSign(lastCartSign);
    });

    // 6. 먼지 파티클
    const particleCount = 1600;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) particlePos[i] = (Math.random() - 0.5) * 90;
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    disposeGeos.push(particleGeo);
    const particleMat = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.1,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposeMats.push(particleMat);
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    const updateHudRound = () => {
      if (hudRoundRef.current) hudRoundRef.current.textContent = `${g.rounds} / ${g.targetRounds}`;
    };
    updateHudRound();
    if (hudTierRef.current) hudTierRef.current.textContent = tierBadge(cartTier);
    if (targetKeyRef.current) targetKeyRef.current.textContent = tierHudTitle(cartTier);

    const setStatus = (text: string, color: string) => {
      if (!statusRef.current) return;
      statusRef.current.textContent = text;
      statusRef.current.style.color = color;
    };

    let activeRailPath: RailPath = buildRailPath(0);

    const startRound = () => {
      cart.position.copy(CART_START);
      cart.rotation.y = 0;
      resetDoorGlow();

      const round = buildRound(cartTier);
      doors.forEach((door, idx) => updateDoorSignText(door, round.doorLabels[idx]!));

      const targetDoor = doors[round.targetDoorIdx]!;
      g.targetDoorIdx = round.targetDoorIdx;
      updateCartSign(round.cartLabel);

      g.rounds++;
      g.laneCount[g.targetDoorIdx]++;
      updateHudRound();

      g.phase = 'PREP';
      g.phaseStartMs = performance.now();
      display.visible = true;
      const prepHint = cartTier === 3 ? '식을 계산하고 맞는 문을 찾으세요' : '목표 숫자가 있는 문을 찾으세요';
      setStatus(`${prepHint} · ${Math.ceil(g.prepMs / 1000)}초 후 출발`, '#f59e0b');

      let remaining = Math.ceil(g.prepMs / 1000);
      const tick = () => {
        if (!g.running || g.phase !== 'PREP') return;
        remaining -= 1;
        if (remaining > 0) {
          setStatus(`${prepHint} · ${remaining}초 후 출발`, '#f59e0b');
          g.roundTimer = setTimeout(tick, 1000);
        }
      };
      g.roundTimer = setTimeout(tick, 1000);

      window.setTimeout(() => {
        if (!gRef.current?.running) return;
        g.phase = 'TRANSIT';
        g.phaseStartMs = performance.now();
        setStatus('이동 중 · 기차 목표 확인', '#10b981');
        activeRailPath = buildRailPath(targetDoor.x);
      }, g.prepMs);
    };

    const clock = new THREE.Clock();
    const animate = () => {
      if (!gRef.current?.running) return;
      g.raf = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      particles.rotation.y += 0.02 * delta;
      particles.position.y = Math.sin(Date.now() * 0.001) * 0.2;

      cartLight.position.copy(cart.position);
      cartLight.position.y += 1.5;
      cartLight.intensity = 2 + Math.random() * 0.2;

      // 기차 숫자판이 항상 카메라를 향하도록 — 이동 중에도 읽기 쉽게
      display.lookAt(camera.position);

      if (g.phase === 'PREP') {
        doors.forEach((door) => {
          door.doorMat.emissiveIntensity = 0.65;
          door.doorLight.intensity = 5;
        });
      }

      if (g.phase === 'TRANSIT') {
        const t = Math.min(1, (performance.now() - g.phaseStartMs) / g.travelMs);
        const easedT = easeInOutCubic(t);
        const prevX = cart.position.x;
        const prevZ = cart.position.z;
        const { x, z } = positionOnRail(activeRailPath, easedT);
        cart.position.set(x, CART_START.y, z);
        if (t > 0.005 && t < 0.995) {
          const dir = new THREE.Vector3(x - prevX, 0, z - prevZ);
          // 객차 뒤판(display)이 로컬 +Z — 이동 방향에 맞춰 회전
          // 대기 중 rotation.y=0(뒤판=숫자판이 카메라 쪽)에서 출발과 동시에 180° 튐 → 부호 반전으로 보정
          if (dir.lengthSq() > 1e-6) cart.rotation.y = Math.atan2(-dir.x, -dir.z);
        }
        if (t >= 1) {
          g.phase = 'ARRIVE';
          g.phaseStartMs = performance.now();
          triggerColorFlash(g.targetDoorIdx);
          setStatus(cartTier === 3 ? '정답 문 도착' : '도착', '#6b7280');
          g.roundTimer = setTimeout(() => {
            if (!gRef.current?.running) return;
            if (g.rounds >= g.targetRounds) {
              endGame();
              return;
            }
            startRound();
          }, 1400);
        }
      } else {
        const time = Date.now() * 0.001;
        camera.position.x = Math.sin(time * 0.5) * 0.2;
        camera.position.y = 10 + Math.cos(time * 0.3) * 0.1;
        camera.lookAt(0, CAMERA_LOOK_Y, CAMERA_LOOK_Z);
      }

      renderer.render(scene, camera);
    };

    const onWinResize = () => {
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const unbindResize = bindViewportResize(play, onWinResize);
    onWinResize();
    renderer.render(scene, camera);
    g.raf = requestAnimationFrame(animate);
    startRound();

    return () => {
      unbindResize();
      g.running = false;
      if (g.roundTimer) clearTimeout(g.roundTimer);
      if (flashHideTimer) clearTimeout(flashHideTimer);
      if (flashRef.current) flashRef.current.style.opacity = '0';
      if (g.raf != null) cancelAnimationFrame(g.raf);

      disposeGeos.forEach((geo) => geo.dispose());
      disposeMats.forEach((mat) => mat.dispose());
      disposeTex.forEach((tex) => tex.dispose());
      renderer.dispose();
    };
  }, [endGame, prepMs, totalRounds, travelMs, cartTier]);

  return (
    <div className="ncart">
      <style>{css}</style>
      <div className="ncart-hud">
        <div className="ncart-hc">
          <div className="ncart-hk">라운드</div>
          <div className="ncart-hv" ref={hudRoundRef} />
        </div>
        <div className="ncart-hc grow">
          <div className="ncart-hv" style={{ fontSize: 'clamp(12px,2vw,19px)' }}>
            숫자 연산 기차
          </div>
          <div className="ncart-tier" ref={hudTierRef} />
        </div>
        <div className="ncart-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="ncart-stop" onClick={stopGame}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            중지
          </button>
        </div>
      </div>
      <div ref={playRef} className="ncart-play">
        <canvas className="ncart-canvas" ref={cvRef} />
        <div className="ncart-vignette" />
        <div className="ncart-flash" ref={flashRef} aria-hidden />
        <div className="ncart-target hidden" ref={targetHudRef}>
          <div className="ncart-target-k" ref={targetKeyRef}>
            목표
          </div>
          <div className="ncart-target-v" ref={targetNumRef}>
            ?
          </div>
        </div>
        <div className="ncart-status" ref={statusRef} />
      </div>
    </div>
  );
}
