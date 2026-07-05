'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
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
  { x: -300, y: 300 },
  { x: 300, y: 300 },
  { x: -300, y: -300 },
  { x: 300, y: -300 },
];

const LINE_COUNT_HIGH = 1800;
const LINE_COUNT_LOW = 900;

type AsteroidData = {
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  scaleSpeed: number;
};

type WhGame = {
  running: boolean;
  timeLeft: number;
  warpSpeed: number;
  maxWarpSpeed: number;
  accelerationRate: number;
  obstacles: THREE.Mesh[];
  waves: number;
  laneCount: [number, number, number, number];
  waveTimer: ReturnType<typeof setTimeout> | null;
  timer: ReturnType<typeof setInterval> | null;
  raf: number | null;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const css = `
.wh{position:fixed;inset:0;background:#000;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.wh,.wh *{box-sizing:border-box}
.wh-hud{height:72px;display:flex;align-items:stretch;background:rgba(0,0,0,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(12px,2.5vw,30px);z-index:30;flex-shrink:0}
.wh-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.wh-hc.grow{flex:1;align-items:center;border-right:none}
.wh-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.wh-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.wh-hv.warn{animation:whw .5s ease-in-out infinite}
@keyframes whw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.wh-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.wh-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.wh-play{position:relative;flex:1;min-height:0}
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
`;

export function WormholeReactionTraining({ durationSec, speedLevel, onExit, onComplete }: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudWavesRef = useRef<HTMLDivElement>(null);
  const warnOverlayRef = useRef<HTMLDivElement>(null);
  const warnTextRef = useRef<HTMLDivElement>(null);
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
    onExitRef.current();
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (g.waveTimer) clearTimeout(g.waveTimer);
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
      maxWarpSpeed,
      accelerationRate,
      obstacles: [],
      waves: 0,
      laneCount: [0, 0, 0, 0],
      waveTimer: null,
      timer: null,
      raf: null,
    };
    gRef.current = g;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0012);

    const w0 = play.clientWidth || window.innerWidth;
    const h0 = play.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(110, w0 / h0, 0.1, 3000);
    camera.position.z = 0;

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !isLow });
    renderer.setSize(w0, h0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLow ? 1 : 2));

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

    const createAsteroid = (quadrantIndex: number): THREE.Mesh => {
      const geometry = new THREE.IcosahedronGeometry(1, 0);
      asteroidGeometries.push(geometry);
      const material = new THREE.MeshBasicMaterial({ color: 0x050505 });
      asteroidMaterials.push(material);
      const mesh = new THREE.Mesh(geometry, material);

      const edges = new THREE.EdgesGeometry(geometry);
      asteroidGeometries.push(edges);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: QUADRANT_COLORS[quadrantIndex].hex });
      asteroidMaterials.push(edgeMaterial);
      const wireframe = new THREE.LineSegments(edges, edgeMaterial);
      mesh.add(wireframe);

      const startZ = -2500;
      mesh.position.set(0, 0, startZ);
      mesh.scale.set(10, 10, 10);

      const endZ = 200;
      const targetX = TARGET_OFFSETS[quadrantIndex].x;
      const targetY = TARGET_OFFSETS[quadrantIndex].y;
      const zSpeed = 40 + g.warpSpeed * 1.2;
      const framesToReach = Math.abs(endZ - startZ) / zSpeed;

      const data: AsteroidData = {
        vx: targetX / framesToReach,
        vy: targetY / framesToReach,
        vz: zSpeed,
        rotX: (Math.random() - 0.5) * 0.1,
        rotY: (Math.random() - 0.5) * 0.1,
        scaleSpeed: 50 / framesToReach,
      };
      mesh.userData = data;
      return mesh;
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
      if (overlay) overlay.classList.add('blink');
      if (text) {
        text.textContent = '⚠️ 소행성 밀도 감지! ⚠️';
        text.classList.add('show');
      }

      const cachedSpeed = g.warpSpeed;
      g.warpSpeed = g.warpSpeed * 0.6;

      g.waveTimer = setTimeout(() => {
        if (!gRef.current?.running) return;

        if (overlay) {
          overlay.classList.remove('blink');
          overlay.style.opacity = '0';
        }
        if (text) text.textContent = '!! 회피 기동 !!';

        g.warpSpeed = Math.min(g.maxWarpSpeed, cachedSpeed * 1.1);

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

        setTimeout(() => {
          text?.classList.remove('show');
        }, 1500);
      }, 1500);

      const nextWaveTime = Math.random() * 2000 + (4000 - g.warpSpeed * 20);
      g.waveTimer = setTimeout(triggerObstacleWave, Math.max(2500, nextWaveTime));
    };

    const animate = () => {
      if (!gRef.current?.running) return;
      g.raf = requestAnimationFrame(animate);

      g.warpSpeed = Math.min(g.maxWarpSpeed, g.warpSpeed + g.accelerationRate);

      const posArr = linesGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < lineCount; i++) {
        posArr[i * 6 + 2] += g.warpSpeed;
        posArr[i * 6 + 5] += g.warpSpeed;
        if (posArr[i * 6 + 2] > 200) {
          posArr[i * 6 + 2] -= 3200;
          posArr[i * 6 + 5] -= 3200;
        }
      }
      linesGeometry.attributes.position.needsUpdate = true;

      for (let i = g.obstacles.length - 1; i >= 0; i--) {
        const obs = g.obstacles[i];
        const data = obs.userData as AsteroidData;
        obs.position.x += data.vx;
        obs.position.y += data.vy;
        obs.position.z += data.vz;
        obs.scale.addScalar(data.scaleSpeed);
        obs.rotation.x += data.rotX;
        obs.rotation.y += data.rotY;
        if (obs.position.z > 500) {
          scene.remove(obs);
          g.obstacles.splice(i, 1);
        }
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
      if (g.raf != null) cancelAnimationFrame(g.raf);

      g.obstacles.forEach((obs) => scene.remove(obs));
      scene.remove(linesMesh);
      linesGeometry.dispose();
      linesMaterial.dispose();
      asteroidGeometries.forEach((geo) => geo.dispose());
      asteroidMaterials.forEach((mat) => mat.dispose());
      renderer.dispose();
    };
  }, [accelerationRate, baseSpeed, durationSec, endGame, maxWarpSpeed]);

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
        <div className="wh-warn" ref={warnOverlayRef}>
          <div className="wh-warn-text" ref={warnTextRef} />
        </div>
      </div>
    </div>
  );
}
