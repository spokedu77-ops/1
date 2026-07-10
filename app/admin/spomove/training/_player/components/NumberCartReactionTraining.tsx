'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';

export const NUMBER_CART_ROUND_OPTIONS = [7, 10, 15, 25] as const;

export function normalizeNumberCartRounds(value: number): number {
  const n = Math.round(Number.isFinite(value) ? value : 5);
  if ((NUMBER_CART_ROUND_OPTIONS as readonly number[]).includes(n)) return n;
  return NUMBER_CART_ROUND_OPTIONS.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best));
}

/** 원본 HTML 순서 그대로 유지: 빨(좌끝)·노·초·파(우끝) — 화면 양끝까지 퍼지도록 X 간격 확대 */
const DOOR_COLORS = [
  { hex: 0xff3333, css: '#ff3333', name: 'RED', x: -33 },
  { hex: 0xffcc00, css: '#ffcc00', name: 'YELLOW', x: -12 },
  { hex: 0x33ff33, css: '#33ff33', name: 'GREEN', x: 12 },
  { hex: 0x3388ff, css: '#3388ff', name: 'BLUE', x: 33 },
] as const;

const DOOR_Z = -38;
const DOOR_SIZE_SCALE = 2.6;
/** 문이 커지고 더 바깥까지 벌어져도 터널 벽에 파묻히지 않도록 반지름 확대 */
const CAVE_RADIUS = 46;
/** 카메라(z=64, 아래로 기울어진 시야축) 기준 화면 하단 경계에 걸리는 지점 — "화면 맨 아래에서 출발" 연출 */
const CART_START = new THREE.Vector3(0, 0, 51);
/** 수레(z=58) 위에 레일이 붙고, 카메라(z=64) 쪽으로 조금 더 연장 */
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
.ncart{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#000;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.ncart,.ncart *{box-sizing:border-box}
.ncart-hud{height:72px;display:flex;align-items:stretch;background:rgba(0,0,0,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.ncart-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.ncart-hc.grow{flex:1;align-items:center;border-right:none}
.ncart-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.ncart-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.ncart-hv.warn{animation:ncartw .5s ease-in-out infinite}
@keyframes ncartw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.ncart-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.ncart-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.ncart-play{position:relative;flex:1;min-height:0}
.ncart-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ncart-vignette{position:absolute;inset:0;z-index:15;pointer-events:none;background:radial-gradient(ellipse 85% 70% at 50% 42%,rgba(0,0,0,0) 0%,rgba(0,0,0,.35) 55%,rgba(0,0,0,.78) 100%)}
.ncart-status{position:absolute;left:50%;top:clamp(10px,1.8vw,16px);transform:translateX(-50%);z-index:20;pointer-events:none;text-align:center;padding:5px 14px;border-radius:999px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);font-family:monospace;font-size:clamp(10px,1.35vw,13px);letter-spacing:.06em;color:#10b981;white-space:nowrap;max-width:min(92vw,560px);overflow:hidden;text-overflow:ellipsis}
.ncart-target{position:absolute;left:50%;bottom:clamp(24%,26vh,32%);top:auto;transform:translateX(-50%);z-index:18;pointer-events:none;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 22px 9px;border-radius:14px;background:rgba(6,10,18,.52);border:1px solid rgba(245,158,11,.2);backdrop-filter:blur(8px);box-shadow:0 6px 22px rgba(0,0,0,.32);transition:opacity .3s ease,transform .3s ease}
.ncart-target.hidden{opacity:0;transform:translateX(-50%) translateY(10px)}
.ncart-target-k{font-size:clamp(9px,1.15vw,11px);font-weight:800;letter-spacing:.2em;color:rgba(255,255,255,.36);text-transform:uppercase;line-height:1}
.ncart-target-v{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(40px,7.2vw,58px);line-height:.95;color:#ffe8b8;text-shadow:0 0 14px rgba(245,158,11,.5);-webkit-text-stroke:1px rgba(245,158,11,.22);white-space:nowrap}
.ncart-target-v.expr{font-family:"Courier New",Courier,monospace;font-size:clamp(32px,5.8vw,48px);font-weight:700;letter-spacing:.12em;-webkit-text-stroke:0;text-shadow:0 0 12px rgba(245,158,11,.45),0 0 2px rgba(255,232,184,.8);font-variant-ligatures:none;font-feature-settings:"liga" 0}
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
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.roundTimer) clearTimeout(g.roundTimer);
    onExitRef.current();
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
    const camera = new THREE.PerspectiveCamera(66, w0 / h0, 0.1, 220);
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

    // 조명: 원본은 MeshStandardMaterial 표면(동굴·바닥·선로·수레)에 빛이 거의 안 닿아
    // 전부 새까맣게 보였다 — 반구광으로 전 구간을 고르게 밝히고 나머지는 보조광으로 둔다.
    const hemiLight = new THREE.HemisphereLight(0x9fb3d9, 0x3a2c1d, 2.4);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0x50525f, 0.9);
    scene.add(ambientLight);

    const cartLight = new THREE.PointLight(0xffb347, 4.5, 34);
    cartLight.castShadow = true;
    cartLight.shadow.bias = -0.001;
    scene.add(cartLight);

    // 수레 대기 위치까지 닿도록 스포트 조준
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
    const groundGeo = new THREE.PlaneGeometry(100, TUNNEL_LENGTH + 20);
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

    // 4. 문 4개 — 원본보다 밝게(emissive·라이트 강화, 사인 배경 밝게)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.8 });
    disposeMats.push(frameMat);
    const doors: DoorObj[] = [];

    DOOR_COLORS.forEach((config, index) => {
      const frameGroup = new THREE.Group();
      frameGroup.position.set(config.x, 0, DOOR_Z);

      const pillarGeo = new THREE.BoxGeometry(1.5, 8, 2);
      const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
      leftPillar.position.set(-3.0, 2, 0);
      frameGroup.add(leftPillar);
      const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
      rightPillar.position.set(3.0, 2, 0);
      frameGroup.add(rightPillar);
      disposeGeos.push(pillarGeo);

      const topBeamGeo = new THREE.BoxGeometry(7.8, 1.5, 2);
      const topBeam = new THREE.Mesh(topBeamGeo, frameMat);
      topBeam.position.set(0, 6, 0);
      frameGroup.add(topBeam);
      disposeGeos.push(topBeamGeo);

      const doorMat = new THREE.MeshStandardMaterial({
        color: config.hex,
        metalness: 0.6,
        roughness: 0.4,
        emissive: config.hex,
        emissiveIntensity: 0.45,
      });
      disposeMats.push(doorMat);
      const doorGeo = new THREE.BoxGeometry(4.6, 7, 0.5);
      disposeGeos.push(doorGeo);
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.position.set(0, 1.5, -0.5);
      frameGroup.add(doorMesh);

      const lightGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16);
      disposeGeos.push(lightGeo);
      const lightMat = new THREE.MeshBasicMaterial({ color: config.hex });
      disposeMats.push(lightMat);
      const lightMesh = new THREE.Mesh(lightGeo, lightMat);
      lightMesh.rotation.x = Math.PI / 2;
      lightMesh.position.set(0, 8, 1);
      frameGroup.add(lightMesh);

      const doorLight = new THREE.PointLight(config.hex, 4, 18);
      doorLight.position.set(0, 7.5, 2.5);
      frameGroup.add(doorLight);

      const haloLight = new THREE.PointLight(config.hex, 0, 55);
      haloLight.position.set(0, 4, 4);
      frameGroup.add(haloLight);

      // 사인판: 검정 대신 짙은 남색 배경 + 밝은 글로우로 가독성 강화
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 256;
      const signCtx = signCanvas.getContext('2d')!;
      const signTex = new THREE.CanvasTexture(signCanvas);
      disposeTex.push(signTex);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
      disposeMats.push(signMat);
      const signGeo = new THREE.BoxGeometry(6.8, 3, 0.2);
      disposeGeos.push(signGeo);
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 5.5, 1.1);
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
      const hex = DOOR_COLORS[door.colorIdx].css;
      const compact = text.replace(/\s+/g, '');
      const fontSize = compact.length <= 2 ? 180 : compact.length <= 3 ? 150 : 120;
      ctx.fillStyle = '#0c1420';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = hex;
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 244);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${fontSize}px "Arial", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = hex;
      ctx.shadowBlur = 60;
      ctx.fillText(text, 256, 128);
      ctx.shadowBlur = 25;
      ctx.fillText(text, 256, 128);
      ctx.shadowBlur = 0;
      ctx.fillText(text, 256, 128);
      door.signTex.needsUpdate = true;
      door.label = text;
    };

    const resetDoorGlow = () => {
      doors.forEach((door, idx) => {
        const hex = DOOR_COLORS[idx]!.hex;
        door.doorMat.color.setHex(hex);
        door.doorMat.emissive.setHex(hex);
        door.doorMat.emissiveIntensity = 0.45;
        door.doorLight.intensity = 4;
        door.doorLight.distance = 18;
        door.haloLight.intensity = 0;
        door.group.scale.setScalar(DOOR_SIZE_SCALE);
      });
    };

    const applyDoorBurstGlow = (doorIdx: number, strength: number) => {
      const s = Math.max(0, Math.min(1, strength));
      doors.forEach((door, idx) => {
        const hex = DOOR_COLORS[idx]!.hex;
        if (idx === doorIdx) {
          door.doorMat.emissiveIntensity = 0.45 + s * 1.4;
          door.doorMat.color.setHex(hex);
          door.doorMat.emissive.setHex(hex);
          door.doorLight.intensity = 4 + s * 10;
        } else {
          door.doorMat.emissiveIntensity = 0.25;
          door.doorLight.intensity = 2;
        }
      });
    };

    // 5. 수레
    const cart = new THREE.Group();
    const cartMetalTex = generateMetalTexture();
    disposeTex.push(cartMetalTex);
    // 원본 색(0x5a5a5a/0x222222)이 검정 배경과 거의 구분 안 돼 밝은 톤으로 조정
    const cartMetal = new THREE.MeshStandardMaterial({ map: cartMetalTex, color: 0x9a9ca6, metalness: 0.7, roughness: 0.35 });
    const frameMetal = new THREE.MeshStandardMaterial({ color: 0x565a66, metalness: 0.85, roughness: 0.45 });
    disposeMats.push(cartMetal, frameMetal);

    const chassisGeo = new THREE.BoxGeometry(3, 0.3, 4.5);
    disposeGeos.push(chassisGeo);
    const chassis = new THREE.Mesh(chassisGeo, frameMetal);
    chassis.position.y = -0.6;
    chassis.castShadow = true;
    cart.add(chassis);

    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    disposeGeos.push(wheelGeo);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333640, metalness: 0.85, roughness: 0.5 });
    disposeMats.push(wheelMat);
    const axleGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.2, 8);
    axleGeo.rotateZ(Math.PI / 2);
    disposeGeos.push(axleGeo);

    [1.3, -1.3].forEach((z) => {
      const axle = new THREE.Mesh(axleGeo, frameMetal);
      axle.position.set(0, -0.6, z);
      cart.add(axle);
      [-1.6, 1.6].forEach((x) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(x, -0.6, z);
        wheel.castShadow = true;
        cart.add(wheel);
      });
    });

    const bucketGroup = new THREE.Group();
    bucketGroup.position.y = 0.2;

    const bottomGeo = new THREE.BoxGeometry(2.8, 0.2, 4.2);
    disposeGeos.push(bottomGeo);
    const bottom = new THREE.Mesh(bottomGeo, cartMetal);
    bottom.position.y = -0.5;
    bottom.castShadow = true;
    bucketGroup.add(bottom);

    const sideGeo = new THREE.BoxGeometry(0.15, 1.8, 4.2);
    disposeGeos.push(sideGeo);
    const leftSide = new THREE.Mesh(sideGeo, cartMetal);
    leftSide.position.set(-1.5, 0.3, 0);
    leftSide.rotation.z = -0.15;
    leftSide.castShadow = true;
    bucketGroup.add(leftSide);
    const rightSide = new THREE.Mesh(sideGeo, cartMetal);
    rightSide.position.set(1.5, 0.3, 0);
    rightSide.rotation.z = 0.15;
    rightSide.castShadow = true;
    bucketGroup.add(rightSide);

    const frontBackGeo = new THREE.BoxGeometry(2.8, 1.8, 0.15);
    disposeGeos.push(frontBackGeo);
    const frontSide = new THREE.Mesh(frontBackGeo, cartMetal);
    frontSide.position.set(0, 0.3, -2.1);
    frontSide.rotation.x = -0.15;
    frontSide.castShadow = true;
    bucketGroup.add(frontSide);
    const backSide = new THREE.Mesh(frontBackGeo, cartMetal);
    backSide.position.set(0, 0.3, 2.1);
    backSide.rotation.x = 0.15;
    backSide.castShadow = true;
    bucketGroup.add(backSide);

    const rimGeoX = new THREE.BoxGeometry(3.4, 0.15, 0.2);
    const rimGeoZ = new THREE.BoxGeometry(0.2, 0.15, 4.6);
    disposeGeos.push(rimGeoX, rimGeoZ);
    const topRimFront = new THREE.Mesh(rimGeoX, frameMetal);
    topRimFront.position.set(0, 1.2, -2.3);
    bucketGroup.add(topRimFront);
    const topRimBack = new THREE.Mesh(rimGeoX, frameMetal);
    topRimBack.position.set(0, 1.2, 2.3);
    bucketGroup.add(topRimBack);
    const topRimLeft = new THREE.Mesh(rimGeoZ, frameMetal);
    topRimLeft.position.set(-1.7, 1.2, 0);
    bucketGroup.add(topRimLeft);
    const topRimRight = new THREE.Mesh(rimGeoZ, frameMetal);
    topRimRight.position.set(1.7, 1.2, 0);
    bucketGroup.add(topRimRight);

    cart.add(bucketGroup);

    // 목표 숫자판: 카메라(뒤쪽)를 향한 뒷면에 부착 — 대기 상태에서도 즉시 보이도록
    const cartSignCanvas = document.createElement('canvas');
    cartSignCanvas.width = 256;
    cartSignCanvas.height = 128;
    const cartSignCtx = cartSignCanvas.getContext('2d')!;
    const cartSignTexture = new THREE.CanvasTexture(cartSignCanvas);
    disposeTex.push(cartSignTexture);
    const displayMat = new THREE.MeshBasicMaterial({ map: cartSignTexture, side: THREE.DoubleSide });
    disposeMats.push(displayMat);
    const displayGeo = new THREE.PlaneGeometry(3.1, 1.55);
    disposeGeos.push(displayGeo);
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(0, 2.35, 2.35);
    bucketGroup.add(display);

    cart.position.copy(CART_START);
    scene.add(cart);
    display.visible = true;

    const updateCartSign = (text: string) => {
      const ctx = cartSignCtx;
      const w = cartSignCanvas.width;
      const h = cartSignCanvas.height;
      const compact = text.replace(/\s+/g, '');
      const fontSize = compact.length <= 2 ? 78 : compact.length <= 4 ? 64 : 52;
      ctx.fillStyle = '#0a1224';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#fff4d6';
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 22;
      ctx.fillText(text, w / 2, h / 2);
      ctx.shadowBlur = 4;
      ctx.fillText(text, w / 2, h / 2);
      ctx.shadowBlur = 0;
      cartSignTexture.needsUpdate = true;
    };

    // 6. 먼지 파티클
    const particleCount = 1600;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) particlePos[i] = (Math.random() - 0.5) * 50;
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
        setStatus('이동 중 · 수레 뒤판 확인', '#10b981');
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

      // 수레 숫자판이 항상 카메라를 향하도록 — 이동 중에도 읽기 쉽게
      display.lookAt(camera.position);

      const phaseElapsed = performance.now() - g.phaseStartMs;
      if (g.phase === 'PREP') {
        doors.forEach((door) => {
          door.doorMat.emissiveIntensity = 0.45;
          door.doorLight.intensity = 4;
        });
      } else if (g.phase === 'ARRIVE') {
        const elapsed = phaseElapsed;
        let strength: number;
        if (elapsed < 140) {
          strength = elapsed / 140;
        } else {
          strength = Math.max(0, 1 - (elapsed - 140) / 520);
        }
        applyDoorBurstGlow(g.targetDoorIdx, strength);
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
          // 수레 앞면(frontSide)이 로컬 -Z를 향해 만들어져 있어 atan2(dir.x, dir.z)를 그대로 쓰면
          // 대기 중 rotation.y=0(뒤판=숫자판이 카메라 쪽)에서 출발과 동시에 180° 튐 → 부호 반전으로 보정
          if (dir.lengthSq() > 1e-6) cart.rotation.y = Math.atan2(-dir.x, -dir.z);
        }
        if (t >= 1) {
          g.phase = 'ARRIVE';
          g.phaseStartMs = performance.now();
          applyDoorBurstGlow(g.targetDoorIdx, 1);
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
    window.addEventListener('resize', onWinResize);
    onWinResize();
    renderer.render(scene, camera);
    g.raf = requestAnimationFrame(animate);
    startRound();

    return () => {
      window.removeEventListener('resize', onWinResize);
      g.running = false;
      if (g.roundTimer) clearTimeout(g.roundTimer);
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
          <div className="ncart-hk">Round</div>
          <div className="ncart-hv" ref={hudRoundRef} />
        </div>
        <div className="ncart-hc grow">
          <div className="ncart-hv" style={{ fontSize: 'clamp(12px,2vw,19px)' }}>
            NUMBER CART
          </div>
          <div className="ncart-tier" ref={hudTierRef} />
        </div>
        <div className="ncart-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="ncart-stop" onClick={stopGame}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>
      <div ref={playRef} className="ncart-play">
        <canvas className="ncart-canvas" ref={cvRef} />
        <div className="ncart-vignette" />
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
