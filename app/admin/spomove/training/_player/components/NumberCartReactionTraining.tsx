'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';

/** 원본 HTML 순서 그대로 유지: 빨(좌끝)·노·초·파(우끝) */
const DOOR_COLORS = [
  { hex: 0xff3333, css: '#ff3333', name: 'RED', x: -12 },
  { hex: 0xffcc00, css: '#ffcc00', name: 'YELLOW', x: -4 },
  { hex: 0x33ff33, css: '#33ff33', name: 'GREEN', x: 4 },
  { hex: 0x3388ff, css: '#3388ff', name: 'BLUE', x: 12 },
] as const;

const DOOR_Z = -15;
const CART_START = new THREE.Vector3(0, 0, 35);

type Phase = 'PREP' | 'TRANSIT' | 'ARRIVE';

type DoorObj = {
  colorIdx: number;
  x: number;
  z: number;
  group: THREE.Group;
  signCtx: CanvasRenderingContext2D;
  signTex: THREE.CanvasTexture;
  numbers: number[];
};

type CartGame = {
  running: boolean;
  timeLeft: number;
  phase: Phase;
  phaseStartMs: number;
  prepMs: number;
  travelMs: number;
  targetNumber: number;
  targetDoorIdx: number;
  rounds: number;
  laneCount: [number, number, number, number];
  roundTimer: ReturnType<typeof setTimeout> | null;
  intervalTimer: ReturnType<typeof setInterval> | null;
  raf: number | null;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
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
.ncart{position:fixed;inset:0;background:#000;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.ncart,.ncart *{box-sizing:border-box}
.ncart-hud{height:72px;display:flex;align-items:stretch;background:rgba(0,0,0,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(12px,2.5vw,30px);z-index:30;flex-shrink:0}
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
.ncart-vignette{position:absolute;inset:0;z-index:15;pointer-events:none;background:radial-gradient(circle,rgba(0,0,0,0) 55%,rgba(0,0,0,.75) 100%)}
.ncart-status{position:absolute;left:50%;bottom:clamp(16px,3vw,32px);transform:translateX(-50%);z-index:20;pointer-events:none;text-align:center;padding:8px 24px;border-radius:999px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.14);font-family:monospace;font-size:clamp(13px,1.8vw,18px);letter-spacing:.08em;color:#10b981;white-space:nowrap}
`;

export function NumberCartReactionTraining({ durationSec, speedLevel, speedSec, onExit, onComplete }: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudRoundsRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [warn, setWarn] = useState(false);
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
  const travelMs = Math.max(2600, 4600 - (lv - 1) * 250);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.roundTimer) clearTimeout(g.roundTimer);
    if (g.intervalTimer) clearInterval(g.intervalTimer);
    onExitRef.current();
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.roundTimer) clearTimeout(g.roundTimer);
    if (g.intervalTimer) clearInterval(g.intervalTimer);
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
      timeLeft: durationSec,
      phase: 'PREP',
      phaseStartMs: 0,
      prepMs,
      travelMs,
      targetNumber: 0,
      targetDoorIdx: 0,
      rounds: 0,
      laneCount: [0, 0, 0, 0],
      roundTimer: null,
      intervalTimer: null,
      raf: null,
    };
    gRef.current = g;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.014);

    const w0 = play.clientWidth || window.innerWidth;
    const h0 = play.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, w0 / h0, 0.1, 150);
    camera.position.set(0, 8, 45);
    camera.lookAt(0, 0, -10);

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

    // 수레 대기 위치(z=35)까지 닿도록 원본보다 아래·수레 쪽으로 당기고 폭을 넓힘
    const spotLight = new THREE.SpotLight(0xffffff, 3);
    spotLight.position.set(0, 22, 20);
    spotLight.target.position.set(0, 0, 20);
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
    const caveGeometry = new THREE.CylinderGeometry(25, 25, 150, 32);
    caveGeometry.rotateX(Math.PI / 2);
    disposeGeos.push(caveGeometry);
    const cave = new THREE.Mesh(caveGeometry, caveMaterial);
    cave.position.set(0, 5, -10);
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
    const groundGeo = new THREE.PlaneGeometry(80, 150);
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

    const mainZEnd = 5;
    for (let z = 40; z >= mainZEnd; z -= 1.5) {
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

    const branchEndZ = -15;
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
      leftPillar.position.set(-2.6, 2, 0);
      frameGroup.add(leftPillar);
      const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
      rightPillar.position.set(2.6, 2, 0);
      frameGroup.add(rightPillar);
      disposeGeos.push(pillarGeo);

      const topBeamGeo = new THREE.BoxGeometry(6.7, 1.5, 2);
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
      const doorGeo = new THREE.BoxGeometry(3.7, 7, 0.5);
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

      // 사인판: 검정 대신 짙은 남색 배경 + 밝은 글로우로 가독성 강화
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 256;
      const signCtx = signCanvas.getContext('2d')!;
      const signTex = new THREE.CanvasTexture(signCanvas);
      disposeTex.push(signTex);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
      disposeMats.push(signMat);
      const signGeo = new THREE.BoxGeometry(6, 3, 0.2);
      disposeGeos.push(signGeo);
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 5.5, 1.1);
      frameGroup.add(signMesh);

      scene.add(frameGroup);
      doors.push({ colorIdx: index, x: config.x, z: DOOR_Z, group: frameGroup, signCtx, signTex, numbers: [] });
    });

    const updateDoorSign = (door: DoorObj, num1: number, num2: number) => {
      const ctx = door.signCtx;
      const hex = DOOR_COLORS[door.colorIdx].css;
      ctx.fillStyle = '#0c1420';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = hex;
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 244);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 180px "Arial", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = hex;
      ctx.shadowBlur = 60;
      ctx.fillText(`${num1}   ${num2}`, 256, 128);
      ctx.shadowBlur = 25;
      ctx.fillText(`${num1}   ${num2}`, 256, 128);
      ctx.shadowBlur = 0;
      ctx.fillText(`${num1}   ${num2}`, 256, 128);
      door.signTex.needsUpdate = true;
      door.numbers = [num1, num2];
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
    cartSignCanvas.width = 128;
    cartSignCanvas.height = 128;
    const cartSignCtx = cartSignCanvas.getContext('2d')!;
    const cartSignTexture = new THREE.CanvasTexture(cartSignCanvas);
    disposeTex.push(cartSignTexture);
    const displayMat = new THREE.MeshBasicMaterial({ map: cartSignTexture, side: THREE.DoubleSide });
    disposeMats.push(displayMat);
    const displayGeo = new THREE.PlaneGeometry(1.9, 1.9);
    disposeGeos.push(displayGeo);
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(0, 2.05, 2.2);
    bucketGroup.add(display);

    cart.position.copy(CART_START);
    scene.add(cart);

    const updateCartSign = (text: string) => {
      const ctx = cartSignCtx;
      ctx.fillStyle = '#10182a';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.strokeRect(3, 3, 122, 122);
      ctx.fillStyle = '#ffe8b8';
      ctx.font = 'bold 80px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 22;
      ctx.fillText(text, 64, 64);
      ctx.shadowBlur = 4;
      ctx.fillText(text, 64, 64);
      ctx.shadowBlur = 0;
      cartSignTexture.needsUpdate = true;
    };
    updateCartSign('?');

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

    const updateHudTime = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(g.timeLeft <= 10);
    };
    updateHudTime();
    if (hudRoundsRef.current) hudRoundsRef.current.textContent = '0';

    const setStatus = (text: string, color: string) => {
      if (!statusRef.current) return;
      statusRef.current.textContent = text;
      statusRef.current.style.color = color;
    };

    let controlPoint = new THREE.Vector3(0, 0, 8);
    let endPos = new THREE.Vector3(0, 0, DOOR_Z + 4);

    const startRound = () => {
      cart.position.copy(CART_START);
      cart.rotation.y = 0;

      const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
      doors.forEach((door, idx) => updateDoorSign(door, numbers[idx * 2]!, numbers[idx * 2 + 1]!));

      g.targetNumber = numbers[Math.floor(Math.random() * 8)]!;
      const targetDoor = doors.find((d) => d.numbers.includes(g.targetNumber))!;
      g.targetDoorIdx = targetDoor.colorIdx;
      updateCartSign(String(g.targetNumber));

      g.rounds++;
      g.laneCount[g.targetDoorIdx]++;
      if (hudRoundsRef.current) hudRoundsRef.current.textContent = String(g.rounds);

      g.phase = 'PREP';
      g.phaseStartMs = performance.now();
      display.visible = true;
      setStatus(`목표 확인 · ${Math.ceil(g.prepMs / 1000)}초 후 출발`, '#f59e0b');

      let remaining = Math.ceil(g.prepMs / 1000);
      const tick = () => {
        if (!g.running || g.phase !== 'PREP') return;
        remaining -= 1;
        if (remaining > 0) {
          setStatus(`목표 확인 · ${remaining}초 후 출발`, '#f59e0b');
          g.roundTimer = setTimeout(tick, 1000);
        }
      };
      g.roundTimer = setTimeout(tick, 1000);

      window.setTimeout(() => {
        if (!gRef.current?.running) return;
        g.phase = 'TRANSIT';
        g.phaseStartMs = performance.now();
        display.visible = false;
        setStatus('이동 중', '#10b981');
        endPos = new THREE.Vector3(targetDoor.x, 0, targetDoor.z + 4);
        controlPoint = new THREE.Vector3(0, 0, 8);
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

      if (g.phase === 'TRANSIT') {
        const t = Math.min(1, (performance.now() - g.phaseStartMs) / g.travelMs);
        const easedT = easeInOutCubic(t);
        const startPos = CART_START;
        const oneMinusT = 1 - easedT;
        const x = oneMinusT * oneMinusT * startPos.x + 2 * oneMinusT * easedT * controlPoint.x + easedT * easedT * endPos.x;
        const z = oneMinusT * oneMinusT * startPos.z + 2 * oneMinusT * easedT * controlPoint.z + easedT * easedT * endPos.z;
        const prevX = cart.position.x;
        const prevZ = cart.position.z;
        cart.position.set(x, startPos.y, z);
        if (t > 0.01 && t < 0.99) {
          const dir = new THREE.Vector3(x - prevX, 0, z - prevZ).normalize();
          if (dir.lengthSq() > 0) cart.rotation.y = Math.atan2(dir.x, dir.z);
        }
        if (t >= 1) {
          g.phase = 'ARRIVE';
          g.phaseStartMs = performance.now();
          setStatus('도착', '#6b7280');
          g.roundTimer = setTimeout(() => {
            if (gRef.current?.running) startRound();
          }, 1400);
        }
      } else {
        const time = Date.now() * 0.001;
        camera.position.x = Math.sin(time * 0.5) * 0.2;
        camera.position.y = 8 + Math.cos(time * 0.3) * 0.1;
        camera.lookAt(0, 0, -10);
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

    renderer.render(scene, camera);

    const startId = window.setTimeout(() => {
      onWinResize();
      startRound();
      const endsAtMs = performance.now() + durationSec * 1000;
      g.intervalTimer = setInterval(() => {
        const newLeft = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
        if (g.timeLeft !== newLeft) {
          g.timeLeft = newLeft;
          updateHudTime();
        }
        if (g.timeLeft <= 0) {
          if (g.intervalTimer) clearInterval(g.intervalTimer);
          g.intervalTimer = null;
          endGame();
        }
      }, 250);
      g.raf = requestAnimationFrame(animate);
    }, 60);

    return () => {
      clearTimeout(startId);
      window.removeEventListener('resize', onWinResize);
      g.running = false;
      if (g.roundTimer) clearTimeout(g.roundTimer);
      if (g.intervalTimer) clearInterval(g.intervalTimer);
      if (g.raf != null) cancelAnimationFrame(g.raf);

      disposeGeos.forEach((geo) => geo.dispose());
      disposeMats.forEach((mat) => mat.dispose());
      disposeTex.forEach((tex) => tex.dispose());
      renderer.dispose();
    };
  }, [durationSec, endGame, prepMs, travelMs]);

  return (
    <div className="ncart">
      <style>{css}</style>
      <div className="ncart-hud">
        <div className="ncart-hc">
          <div className="ncart-hk">Time</div>
          <div className={`ncart-hv${warn ? ' warn' : ''}`} ref={hudTimeRef} />
        </div>
        <div className="ncart-hc">
          <div className="ncart-hk">Rounds</div>
          <div className="ncart-hv" ref={hudRoundsRef} />
        </div>
        <div className="ncart-hc grow">
          <div className="ncart-hv" style={{ fontSize: 'clamp(12px,2vw,19px)' }}>
            NUMBER CART
          </div>
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
        <div className="ncart-status" ref={statusRef} />
      </div>
    </div>
  );
}
