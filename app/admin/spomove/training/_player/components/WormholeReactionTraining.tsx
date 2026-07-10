'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { staticPerfTier } from '../lib/reactTrainPerf';

/** 원본 HTML 순서 그대로 유지: 0=RED(TL) 1=YELLOW(TR) 2=BLUE(BL) 3=GREEN(BR) */
const QUADRANT_COLORS = [
  { hex: 0xff4d4d, css: '#ff4d4d', name: 'RED' },
  { hex: 0xffd633, css: '#ffd633', name: 'YELLOW' },
  { hex: 0x3399ff, css: '#3399ff', name: 'BLUE' },
  { hex: 0x33cc33, css: '#33cc33', name: 'GREEN' },
] as const;

/** 구역별 운석 목표 X, Y 좌표(화면 모서리 쪽) */
const TARGET_OFFSETS: { x: number; y: number }[] = [
  { x: -390, y: 390 },
  { x: 390, y: 390 },
  { x: -390, y: -390 },
  { x: 390, y: -390 },
];

const LINE_COUNT_HIGH = 1800;
const LINE_COUNT_LOW = 900;

type AsteroidData = {
  age: number;
  travelFrames: number;
  startZ: number;
  passZ: number;
  removeZ: number;
  targetX: number;
  targetY: number;
  startScale: number;
  endScale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  quadrantIndex: number;
};

type Burst = {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  velocities: Float32Array;
  age: number;
  life: number;
};

/** lv1 약 9.5초, lv7 약 6.3초 (60fps) */
function asteroidTravelFrames(lv: number): number {
  return Math.max(300, Math.round((300 - lv * 16) * 2));
}

const WARN_MS = 1800;
const WAVE_GAP_MIN_MS = 4000;

function visibleWorldHeight(z: number, fovDeg: number): number {
  return 2 * z * Math.tan((fovDeg * Math.PI) / 180 / 2);
}

function createRockGeometry(isLow: boolean, seed: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, isLow ? 1 : 2);
  const pos = geometry.attributes.position;
  if (!pos) return geometry;

  let state = seed >>> 0 || 1;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967295;
  };

  const vertex = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    const nx = vertex.x;
    const ny = vertex.y;
    const nz = vertex.z;
    const wave =
      Math.sin(nx * 4.4 + seed * 0.17) * Math.cos(ny * 3.8) * 0.16 +
      Math.sin(ny * 7.3 + nz * 5.1) * 0.1 +
      Math.cos(nx * 11.7 + nz * 8.2) * 0.07;
    let radius = 0.58 + wave + rnd() * 0.24;
    if (rnd() < 0.12) radius *= 0.62 + rnd() * 0.2;
    vertex.normalize().multiplyScalar(radius);
    if (rnd() < 0.42) vertex.x *= 0.78 + rnd() * 0.3;
    if (rnd() < 0.42) vertex.y *= 0.78 + rnd() * 0.3;
    if (rnd() < 0.38) vertex.z *= 0.84 + rnd() * 0.24;
    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

type WhGame = {
  running: boolean;
  timeLeft: number;
  warpSpeed: number;
  /** 스피드라인 전용 고정 속도. warpSpeed의 가속·웨이브 변동과 분리된 신호(lv) 기준값 */
  lineSpeed: number;
  maxWarpSpeed: number;
  accelerationRate: number;
  obstacles: THREE.Object3D[];
  bursts: Burst[];
  waves: number;
  laneCount: [number, number, number, number];
  waveTimer: ReturnType<typeof setTimeout> | null;
  nextWaveTimer: ReturnType<typeof setTimeout> | null;
  timer: ReturnType<typeof setInterval> | null;
  raf: number | null;
  baseFov: number;
  shakeAmp: number;
  fovKick: number;
  warnActive: boolean;
};

/** t(0~1) → Z 접근. 이전(늦게)과 직전(빠름)의 중간 타이밍 */
function asteroidApproachProgress(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.1) return (clamped / 0.1) * 0.05;
  const late = (clamped - 0.1) / 0.9;
  return 0.05 + (1 - Math.pow(1 - late, 2.85)) * 0.95;
}

/** t(0~1) → 구역 코너로 퍼짐. 크기가 다 커질 때까지 중앙에 머물다가 막판에 코너로 퍼져 '중앙에서 터져나가는' 느낌을 줌 */
function asteroidSpreadProgress(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.45) return (clamped / 0.45) * 0.02;
  const late = (clamped - 0.45) / 0.55;
  return 0.02 + (1 - Math.pow(1 - late, 2.6)) * 0.98;
}

/** t(0~1) → 크기. 후반에 급격히 커져 정면 돌진감 */
function asteroidScaleProgress(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.22) return (clamped / 0.22) * 0.06;
  const late = (clamped - 0.22) / 0.78;
  return 0.06 + (1 - Math.pow(1 - late, 2.15)) * 0.94;
}

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const css = `
.wh{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#000;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.wh,.wh *{box-sizing:border-box}
.wh-hud{height:72px;display:flex;align-items:stretch;background:rgba(0,0,0,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.wh-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.wh-hc.grow{flex:1;align-items:center;border-right:none}
.wh-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.wh-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.wh-hv.warn{animation:whw .5s ease-in-out infinite}
@keyframes whw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.wh-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.wh-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.wh-play{position:relative;flex:1;min-height:0;transition:transform .04s linear}
.wh-vignette{position:absolute;inset:0;z-index:19;pointer-events:none;opacity:0;box-shadow:inset 0 0 min(28vw,180px) rgba(255,45,45,.5);transition:opacity .15s}
.wh-vignette.active{opacity:1;animation:whpulse .42s ease-in-out infinite alternate}
@keyframes whpulse{from{opacity:.3}to{opacity:.9}}
.wh-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.wh-ui{position:absolute;inset:0;z-index:20;pointer-events:none}
.wh-corner{position:absolute;font-size:clamp(14px,2.2vw,26px);font-weight:900;letter-spacing:.2em;text-transform:uppercase;pointer-events:none}
.wh-tl{top:24px;left:24px}
.wh-tr{top:24px;right:24px}
.wh-bl{bottom:24px;left:24px}
.wh-br{bottom:24px;right:24px}
.wh-cross{position:absolute;background:rgba(255,255,255,.18)}
.wh-cross-v{top:0;left:50%;width:2px;height:100%;transform:translateX(-50%)}
.wh-cross-h{top:50%;left:0;width:100%;height:2px;transform:translateY(-50%)}
.wh-warn{position:absolute;inset:0;z-index:22;background:rgba(255,0,0,.2);box-shadow:inset 0 0 200px rgba(255,0,0,.6);opacity:0;transition:opacity .1s;display:flex;justify-content:center;align-items:center;pointer-events:none}
.wh-warn.blink{animation:whflash .3s infinite alternate}
@keyframes whflash{0%{opacity:0}100%{opacity:1}}
.wh-warn-text{font-size:clamp(20px,5vw,52px);font-weight:900;color:#fff;text-shadow:0 0 40px #ff0000,0 0 16px #ff0000;text-align:center;padding:0 24px;transform:scale(.5);opacity:0;transition:all .2s cubic-bezier(.175,.885,.32,1.275)}
.wh-warn-text.show{transform:scale(1);opacity:1}
${REACT_TRAIN_VIEWPORT_CSS}
`;

export function WormholeReactionTraining({ durationSec, speedLevel, onExit, onComplete }: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudWavesRef = useRef<HTMLDivElement>(null);
  const warnOverlayRef = useRef<HTMLDivElement>(null);
  const warnTextRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const [warn, setWarn] = useState(false);
  const gRef = useRef<WhGame | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const lv = Math.max(1, Math.min(7, Math.round(Number.isFinite(speedLevel) ? speedLevel : 4)));
  /** 초기 워프 속도: 원본의 10(느림)~35(빠름) 버튼 범위를 난이도 단계로 매핑 */
  const baseSpeed = 8 + (lv - 1) * 5;
  /** 도달 가능한 최고 속도에 상한을 둬 '무한 가속'이 멀미·성능 문제로 번지지 않게 함 */
  const maxWarpSpeed = baseSpeed * 3;
  const accelerationRate = 0.008 + lv * 0.0015;

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (g.waveTimer) clearTimeout(g.waveTimer);
    if (g.nextWaveTimer) clearTimeout(g.nextWaveTimer);
    onExitRef.current();
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (g.waveTimer) clearTimeout(g.waveTimer);
    if (g.nextWaveTimer) clearTimeout(g.nextWaveTimer);
    onCompleteRef.current({
      stims: g.waves,
      maxCombo: g.waves,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;

    const isLow = staticPerfTier === 'low';
    const lineCount = isLow ? LINE_COUNT_LOW : LINE_COUNT_HIGH;

    const g: WhGame = {
      running: true,
      timeLeft: durationSec,
      warpSpeed: baseSpeed,
      lineSpeed: baseSpeed,
      maxWarpSpeed,
      accelerationRate,
      obstacles: [],
      bursts: [],
      waves: 0,
      laneCount: [0, 0, 0, 0],
      waveTimer: null,
      nextWaveTimer: null,
      timer: null,
      raf: null,
      baseFov: 110,
      shakeAmp: 0,
      fovKick: 0,
      warnActive: false,
    };
    gRef.current = g;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.00052);

    const w0 = play.clientWidth || window.innerWidth;
    const h0 = play.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(110, w0 / h0, 0.1, 5000);
    camera.position.z = 0;

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !isLow });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLow ? 1 : 2));

    scene.add(new THREE.AmbientLight(0x667788, 0.72));
    scene.add(new THREE.HemisphereLight(0x99aabb, 0x221811, 0.55));
    const keyLight = new THREE.DirectionalLight(0xfff4e8, 1.35);
    keyLight.position.set(220, 260, 420);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xaaccff, 0.55);
    rimLight.position.set(-260, -120, -180);
    scene.add(rimLight);

    const quadrantColorObjs = QUADRANT_COLORS.map((c) => new THREE.Color(c.hex));

    const linesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(lineCount * 6);
    const colorAttr = new Float32Array(lineCount * 6);
    for (let i = 0; i < lineCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 500;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (Math.random() - 0.5) * 3000;

      let color = quadrantColorObjs[3];
      if (x <= 0 && y >= 0) color = quadrantColorObjs[0];
      else if (x > 0 && y >= 0) color = quadrantColorObjs[1];
      else if (x <= 0 && y < 0) color = quadrantColorObjs[2];
      else if (x > 0 && y < 0) color = quadrantColorObjs[3];

      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + 80;

      colorAttr[i * 6] = color.r;
      colorAttr[i * 6 + 1] = color.g;
      colorAttr[i * 6 + 2] = color.b;
      colorAttr[i * 6 + 3] = color.r;
      colorAttr[i * 6 + 4] = color.g;
      colorAttr[i * 6 + 5] = color.b;
    }
    linesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    linesGeometry.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));

    const linesMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
    scene.add(linesMesh);

    const asteroidGeometries: THREE.BufferGeometry[] = [];
    const asteroidMaterials: THREE.Material[] = [];
    const travelFrames = asteroidTravelFrames(lv);
    const passZ = 130;
    const visibleH = visibleWorldHeight(passZ, 110);

    const createAsteroid = (quadrantIndex: number): THREE.Group => {
      const seed = Math.floor(Math.random() * 999983) + quadrantIndex * 131;
      const group = new THREE.Group();
      const qColor = new THREE.Color(QUADRANT_COLORS[quadrantIndex].hex);

      const mainGeo = createRockGeometry(isLow, seed);
      asteroidGeometries.push(mainGeo);
      const rockMat = new THREE.MeshStandardMaterial({
        color: qColor,
        roughness: 0.97,
        metalness: 0,
        flatShading: true,
      });
      asteroidMaterials.push(rockMat);
      group.add(new THREE.Mesh(mainGeo, rockMat));

      const startZ = -3600;
      // 카메라(z=0)를 넘어가면 화면 밖(-Z를 보는 카메라 기준 뒤쪽)이라 안 보임 → 그 직전에서 터뜨림
      const removeZ = -25;
      const targetX = TARGET_OFFSETS[quadrantIndex].x;
      const targetY = TARGET_OFFSETS[quadrantIndex].y;

      // t=0에서 스폰: x/y가 정확히 화면 중앙(0,0)에서 시작해 구역 코너로 퍼져나감
      const spawnAge = 0;
      const spawnRush = asteroidApproachProgress(0);
      const spawnSpread = asteroidSpreadProgress(0);
      const spawnScale = asteroidScaleProgress(0);
      const startScale = 3 + Math.random() * 2.5;
      const endScale = visibleH * (0.58 + Math.random() * 0.14);

      group.position.set(
        targetX * spawnSpread,
        targetY * spawnSpread,
        startZ + (passZ - startZ) * spawnRush,
      );
      group.scale.setScalar(startScale + (endScale - startScale) * spawnScale);

      group.userData = {
        age: spawnAge,
        travelFrames,
        startZ,
        passZ,
        removeZ,
        targetX,
        targetY,
        startScale,
        endScale,
        rotX: (Math.random() - 0.5) * 0.038,
        rotY: (Math.random() - 0.5) * 0.038,
        rotZ: (Math.random() - 0.5) * 0.03,
        quadrantIndex,
      } satisfies AsteroidData;
      return group;
    };

    const burstParticleCount = isLow ? 12 : 26;

    const spawnBurst = (position: THREE.Vector3, quadrantIndex: number): Burst => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(burstParticleCount * 3);
      const velocities = new Float32Array(burstParticleCount * 3);
      for (let i = 0; i < burstParticleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const speed = 7 + Math.random() * 12;
        velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        velocities[i * 3 + 2] = Math.cos(phi) * speed;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: quadrantColorObjs[quadrantIndex],
        size: 7,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      return { points, geometry, material, velocities, age: 0, life: 24 };
    };

    const updateHudTime = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(g.timeLeft <= 10);
    };
    updateHudTime();
    if (hudWavesRef.current) hudWavesRef.current.textContent = '0';

    const triggerObstacleWave = () => {
      if (!gRef.current?.running) return;

      const overlay = warnOverlayRef.current;
      const text = warnTextRef.current;
      if (overlay) {
        overlay.classList.add('blink');
        overlay.style.opacity = '';
      }
      if (text) {
        text.textContent = '⚠️ 소행성 밀도 감지! ⚠️';
        text.classList.add('show');
      }

      const cachedSpeed = g.warpSpeed;
      g.warpSpeed = g.warpSpeed * 0.6;

      g.shakeAmp = 1.35;
      g.fovKick = 10;
      g.warnActive = true;
      vignetteRef.current?.classList.add('active');

      const safeZoneIndex = Math.floor(Math.random() * 4);
      g.waves++;
      g.laneCount[safeZoneIndex]++;
      if (hudWavesRef.current) hudWavesRef.current.textContent = String(g.waves);

      for (let i = 0; i < 4; i++) {
        if (i !== safeZoneIndex) {
          const obs = createAsteroid(i);
          scene.add(obs);
          g.obstacles.push(obs);
        }
      }

      g.waveTimer = setTimeout(() => {
        if (!gRef.current?.running) return;

        if (overlay) {
          overlay.classList.remove('blink');
          overlay.style.opacity = '0';
        }
        if (text) text.textContent = '!! 회피 기동 !!';

        g.warpSpeed = Math.min(g.maxWarpSpeed, cachedSpeed * 1.05);
        g.shakeAmp = Math.max(g.shakeAmp, 0.85);

        setTimeout(() => {
          text?.classList.remove('show');
          g.warnActive = false;
          vignetteRef.current?.classList.remove('active');
        }, 1800);
      }, WARN_MS);

      const nextWaveTime = Math.max(WAVE_GAP_MIN_MS, Math.random() * 2500 + (9000 - g.warpSpeed * 35));
      g.nextWaveTimer = setTimeout(() => {
        if (gRef.current?.running) triggerObstacleWave();
      }, nextWaveTime);
    };

    const animate = () => {
      if (!gRef.current?.running) return;
      g.raf = requestAnimationFrame(animate);

      g.warpSpeed = Math.min(g.maxWarpSpeed, g.warpSpeed + g.accelerationRate);

      const posArr = linesGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < lineCount; i++) {
        posArr[i * 6 + 2] += g.lineSpeed;
        posArr[i * 6 + 5] += g.lineSpeed;
        if (posArr[i * 6 + 2] > 200) {
          posArr[i * 6 + 2] -= 3200;
          posArr[i * 6 + 5] -= 3200;
        }
      }
      linesGeometry.attributes.position.needsUpdate = true;

      let maxRush = 0;

      for (let i = g.obstacles.length - 1; i >= 0; i--) {
        const obs = g.obstacles[i];
        const data = obs.userData as AsteroidData;
        data.age += 1;
        const t = Math.min(1, data.age / data.travelFrames);
        const rush = asteroidApproachProgress(t);
        const spread = asteroidSpreadProgress(t);
        const scaleT = asteroidScaleProgress(t);
        if (rush > maxRush) maxRush = rush;

        obs.position.z = data.startZ + (data.passZ - data.startZ) * rush;
        obs.position.x = data.targetX * spread;
        obs.position.y = data.targetY * spread;
        obs.scale.setScalar(data.startScale + (data.endScale - data.startScale) * scaleT);
        obs.rotation.x += data.rotX;
        obs.rotation.y += data.rotY;
        obs.rotation.z += data.rotZ;

        // 카메라(z=0, -Z 방향을 봄) 근처, 아직 화면에 보이는 위치에서 터뜨림.
        // removeZ(=passZ 훌쩍 지난 화면 밖)까지 기다리면 이미 안 보이는 지점이라 폭발이 보이지 않았음.
        if (obs.position.z > data.removeZ) {
          g.bursts.push(spawnBurst(obs.position, data.quadrantIndex));
          scene.remove(obs);
          g.obstacles.splice(i, 1);
        }
      }

      for (let i = g.bursts.length - 1; i >= 0; i--) {
        const burst = g.bursts[i];
        burst.age += 1;
        const posArr2 = burst.geometry.attributes.position.array as Float32Array;
        for (let p = 0; p < posArr2.length; p += 3) {
          posArr2[p] += burst.velocities[p];
          posArr2[p + 1] += burst.velocities[p + 1];
          posArr2[p + 2] += burst.velocities[p + 2];
        }
        burst.geometry.attributes.position.needsUpdate = true;
        burst.material.opacity = Math.max(0, 1 - burst.age / burst.life);
        if (burst.age >= burst.life) {
          scene.remove(burst.points);
          burst.geometry.dispose();
          burst.material.dispose();
          g.bursts.splice(i, 1);
        }
      }

      const proximityShake = maxRush > 0.28 ? (maxRush - 0.28) * 22 : 0;
      if (g.shakeAmp > 0.02 || proximityShake > 0.5) {
        const amp = g.shakeAmp * 5 + proximityShake;
        camera.position.x = (Math.random() - 0.5) * amp;
        camera.position.y = (Math.random() - 0.5) * amp;
        g.shakeAmp *= 0.9;
        if (play) {
          play.style.transform = `translate(${(Math.random() - 0.5) * amp * 0.35}px, ${(Math.random() - 0.5) * amp * 0.35}px)`;
        }
      } else {
        camera.position.x *= 0.82;
        camera.position.y *= 0.82;
        if (play && Math.abs(camera.position.x) < 0.05) play.style.transform = '';
      }

      const targetFov = g.baseFov + g.fovKick + maxRush * 9;
      camera.fov += (targetFov - camera.fov) * 0.14;
      g.fovKick *= 0.93;
      camera.updateProjectionMatrix();

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

    renderer.render(scene, camera);

    const startId = window.setTimeout(() => {
      onWinResize();
      g.raf = requestAnimationFrame(animate);
      g.waveTimer = setTimeout(triggerObstacleWave, 3000);

      const endsAtMs = performance.now() + durationSec * 1000;
      g.timer = setInterval(() => {
        const newLeft = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
        if (g.timeLeft !== newLeft) {
          g.timeLeft = newLeft;
          updateHudTime();
        }
        if (g.timeLeft <= 0) {
          if (g.timer) clearInterval(g.timer);
          g.timer = null;
          endGame();
        }
      }, 250);
    }, 60);

    return () => {
      clearTimeout(startId);
      window.removeEventListener('resize', onWinResize);
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      if (g.waveTimer) clearTimeout(g.waveTimer);
      if (g.nextWaveTimer) clearTimeout(g.nextWaveTimer);
      if (g.raf != null) cancelAnimationFrame(g.raf);

      g.obstacles.forEach((obs) => scene.remove(obs));
      g.bursts.forEach((burst) => {
        scene.remove(burst.points);
        burst.geometry.dispose();
        burst.material.dispose();
      });
      scene.remove(linesMesh);
      linesGeometry.dispose();
      linesMaterial.dispose();
      asteroidGeometries.forEach((geo) => geo.dispose());
      asteroidMaterials.forEach((mat) => mat.dispose());
      renderer.dispose();
    };
  }, [accelerationRate, baseSpeed, durationSec, endGame, lv, maxWarpSpeed]);

  return (
    <div className="wh">
      <style>{css}</style>
      <div className="wh-hud">
        <div className="wh-hc">
          <div className="wh-hk">Time</div>
          <div className={`wh-hv${warn ? ' warn' : ''}`} ref={hudTimeRef} />
        </div>
        <div className="wh-hc">
          <div className="wh-hk">Waves</div>
          <div className="wh-hv" ref={hudWavesRef} />
        </div>
        <div className="wh-hc grow">
          <div className="wh-hv" style={{ fontSize: 'clamp(12px,2vw,19px)' }}>
            WORMHOLE
          </div>
        </div>
        <div className="wh-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="wh-stop" onClick={stopGame}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>
      <div ref={playRef} className="wh-play">
        <canvas className="wh-canvas" ref={cvRef} />
        <div className="wh-ui">
          <div className="wh-corner wh-tl" style={{ color: QUADRANT_COLORS[0].css, textShadow: `0 0 20px ${QUADRANT_COLORS[0].css}` }}>
            RED
          </div>
          <div className="wh-corner wh-tr" style={{ color: QUADRANT_COLORS[1].css, textShadow: `0 0 20px ${QUADRANT_COLORS[1].css}` }}>
            YELLOW
          </div>
          <div className="wh-corner wh-bl" style={{ color: QUADRANT_COLORS[2].css, textShadow: `0 0 20px ${QUADRANT_COLORS[2].css}` }}>
            BLUE
          </div>
          <div className="wh-corner wh-br" style={{ color: QUADRANT_COLORS[3].css, textShadow: `0 0 20px ${QUADRANT_COLORS[3].css}` }}>
            GREEN
          </div>
          <div className="wh-cross wh-cross-v" />
          <div className="wh-cross wh-cross-h" />
        </div>
        <div className="wh-vignette" ref={vignetteRef} aria-hidden />
        <div className="wh-warn" ref={warnOverlayRef}>
          <div className="wh-warn-text" ref={warnTextRef} />
        </div>
      </div>
    </div>
  );
}
