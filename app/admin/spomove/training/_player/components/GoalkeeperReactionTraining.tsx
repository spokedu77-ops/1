'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { bindViewportResize } from '../lib/bindViewportResize';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { staticPerfTier } from '../lib/reactTrainPerf';

const CORNERS = [
  { key: 'TL', lane: 0, hex: 0xff1744, css: '#ff1744', label: 'RED', callout: '좌상(손)!' },
  { key: 'TR', lane: 3, hex: 0xffd600, css: '#ffd600', label: 'YELLOW', callout: '우상(손)!' },
  { key: 'BL', lane: 2, hex: 0x00e676, css: '#00e676', label: 'GREEN', callout: '좌하(발)!' },
  { key: 'BR', lane: 1, hex: 0x2979ff, css: '#2979ff', label: 'BLUE', callout: '우하(발)!' },
] as const;

type CornerKey = (typeof CORNERS)[number]['key'];
type ShotEvent = {
  t: number;
  type?: 'shot';
  start?: CornerKey;
  target?: CornerKey;
  target2?: CornerKey;
  isDouble?: boolean;
  boss?: boolean;
  msg?: string;
  col?: string;
  speed?: number;
};

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
  wireMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  coreMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
};

type Trail = THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> & { userData: { life: number } };
type FxMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> & {
  userData: { life: number; scale: number; kind: 'shield' | 'ring' | 'particle'; vel?: THREE.Vector3; rotSpeed?: number };
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
  nextEvent: number;
  currentSpeed: number;
  timeline: ShotEvent[];
  projectiles: THREE.Group[];
  trails: Trail[];
  effects: FxMesh[];
  frameShake: number;
};

const HIT_Z = -3;
const SPAWN_Z = -120;
const BASE_DURATION_SEC = 120;

function cornerByKey(key: CornerKey) {
  return CORNERS.find((corner) => corner.key === key) ?? CORNERS[0];
}

function buildTimeline(durationSec: number, speedLevel: number): ShotEvent[] {
  const scale = Math.max(0.45, Math.min(1.4, durationSec / BASE_DURATION_SEC));
  const levelBoost = Math.max(0, Math.min(6, speedLevel - 1));
  const keys = CORNERS.map((corner) => corner.key);
  const events: ShotEvent[] = [
    { t: 2, msg: '상단/하단 방어 훈련!', col: '#ffffff', speed: 54 + levelBoost * 5 },
    { t: 4, type: 'shot', start: 'TL' },
    { t: 6, type: 'shot', start: 'TR' },
    { t: 8, type: 'shot', start: 'BL' },
    { t: 10, type: 'shot', start: 'BR' },
    { t: 16, msg: '마구(커브볼) 주의!! 끝까지 봐라!', col: '#ffd600', speed: 64 + levelBoost * 6 },
    { t: 18, type: 'shot', start: 'TL', target: 'TR' },
    { t: 21, type: 'shot', start: 'BL', target: 'BR' },
    { t: 24, type: 'shot', start: 'TR', target: 'BL' },
    { t: 27, type: 'shot', start: 'BR', target: 'TL' },
    { t: 33, msg: '더블 블록!! 양손 방어!', col: '#00e5ff', speed: 70 + levelBoost * 6 },
    { t: 35, type: 'shot', start: 'TL', target2: 'TR', isDouble: true },
    { t: 39, type: 'shot', start: 'BL', target2: 'BR', isDouble: true },
    { t: 43, type: 'shot', start: 'TL', target2: 'BL', isDouble: true },
    { t: 47, type: 'shot', start: 'TR', target2: 'BR', isDouble: true },
    { t: 55, msg: '무차별 폭격!! 뚫리지 마라!!', col: '#ff1744', speed: 92 + levelBoost * 8 },
  ];
  for (let i = 0; i < 22; i++) {
    const start = keys[(i * 7 + 1) % keys.length]!;
    const target = i % 3 === 0 ? keys[(i * 5 + 2) % keys.length] : start;
    events.push({ t: 58 + i * 1.45, type: 'shot', start, target });
  }
  events.push({ t: 91, msg: '하이퍼 모드! 전신 방어!!', col: '#ff4dd8', speed: 128 + levelBoost * 9 });
  for (let i = 0; i < 24; i++) {
    events.push({ t: 94 + i * 0.48, type: 'shot', start: keys[i % keys.length] });
  }
  events.push(
    { t: 108, msg: '위험!! 거대 에너지 슛 접근!!', col: '#ffffff', speed: 42 + levelBoost * 4 },
    { t: 111, type: 'shot', start: 'TL', boss: true },
    { t: 116, msg: '철벽 방어 성공!!', col: '#00e676' },
  );
  return events
    .map((event) => ({ ...event, t: event.t * scale }))
    .filter((event) => event.t < durationSec - 1.5 || event.boss || event.msg);
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
  speedLevel: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

export function GoalkeeperReactionTraining({ durationSec, speedLevel, onExit, onComplete }: Props) {
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
    const lv = Math.max(1, Math.min(7, Math.round(Number.isFinite(speedLevel) ? speedLevel : 4)));
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
      nextEvent: 0,
      currentSpeed: 58 + lv * 5,
      timeline: buildTimeline(duration, lv),
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

    const spawnShot = (startKey: CornerKey, targetKey?: CornerKey, speed = g.currentSpeed, isBoss = false) => {
      const start = cornerByKey(startKey);
      const target = cornerByKey(targetKey ?? startKey);
      const size = isBoss ? 4.8 : 1.35;
      const group = new THREE.Group();
      const coreGeo = isBoss ? new THREE.IcosahedronGeometry(size, 1) : new THREE.SphereGeometry(size * 0.7, isLow ? 10 : 16, isLow ? 8 : 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: isBoss ? 0xffffff : start.hex });
      const core = new THREE.Mesh(coreGeo, coreMat);
      const wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 1),
        new THREE.MeshBasicMaterial({ color: isBoss ? 0xff1744 : start.hex, wireframe: true, transparent: true, opacity: 0.85 }),
      );
      group.add(core, wire);
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
        wireMesh: wire,
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
      scene.remove(projectile);
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

    const clock = new THREE.Clock();
    const animate = () => {
      if (!g.running) return;
      const delta = Math.min(0.05, clock.getDelta());
      const nowSec = (performance.now() - g.startedAt) / 1000;
      while (g.nextEvent < g.timeline.length && nowSec >= (g.timeline[g.nextEvent]?.t ?? Infinity)) {
        const ev = g.timeline[g.nextEvent]!;
        if (ev.msg) {
          if (ev.speed) g.currentSpeed = ev.speed;
          showCallout(ev.msg, ev.col ?? '#ffffff', 1700);
        } else if (ev.type === 'shot' && ev.start) {
          if (ev.isDouble && ev.target2) {
            spawnShot(ev.start, undefined, g.currentSpeed);
            spawnShot(ev.target2, undefined, g.currentSpeed);
            showCallout('두 곳 방어', '#00e5ff', 800);
          } else {
            spawnShot(ev.start, ev.target, g.currentSpeed, !!ev.boss);
            const target = cornerByKey(ev.boss ? 'TL' : ev.target ?? ev.start);
            showCallout(ev.boss ? '정면 방어' : target.callout, target.css, 780);
          }
        }
        g.nextEvent++;
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
        if (data.isCurve) {
          const color = new THREE.Color(cornerByKey(data.startKey).hex).lerp(new THREE.Color(cornerByKey(data.targetKey).hex), ease);
          data.wireMesh.material.color = color;
          if (!data.isBoss) data.coreMesh.material.color = color;
        }
        if (!isLow || Math.random() > 0.45) {
          const trail = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.55, 0.55),
            new THREE.MeshBasicMaterial({ color: data.wireMesh.material.color, transparent: true, opacity: 0.42 }),
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
      g.projectiles.forEach((p) => scene.remove(p));
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
      fieldGrid.geometry.dispose();
      (fieldGrid.material as THREE.Material).dispose();
      ceilingGrid.geometry.dispose();
      (ceilingGrid.material as THREE.Material).dispose();
      goalFrame.geometry.dispose();
      (goalFrame.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [durationSec, endGame, speedLevel]);

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
