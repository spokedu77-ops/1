/**
 * Flow Phase - FlowEngine
 * 메인 게임 엔진 (legacy_space_flow.html 로직 이식)
 * 구조: Audio/UI 모듈 분리, Constants 연동
 */
import * as THREE from 'three';
import { ObstacleManager } from './entities/ObstacleManager';
import { FlowAudio } from './FlowAudio';
import { getRefEl, setLevelTag, showInstruction } from './FlowUI';
import {
  BRIDGE_LENGTH,
  BRIDGE_GAP,
  BRIDGE_PRUNE_Z_BY_LEVEL,
  LANE_WIDTH,
  PLAYER_Z,
  GROUND_Y,
  PAD_TRIGGER_RATIO,
  BASE_SPEED,
  SPEED_MULTIPLIERS,
  LV1_START_ACCEL_DURATION_SEC,
  JUMP_DURATION,
  JUMP_HEIGHT,
  CAMERA_BASE_HEIGHT,
  CAMERA_BASE_Z,
  CAMERA_FAR_BY_LEVEL,
  FOG_FAR_BY_LEVEL,
  FOG_NEAR,
  CAMERA_LAG_SPEED,
  FOV_MIN,
  FOV_MAX,
  FOV_SPEED_MIN,
  FOV_SPEED_MAX,
  HIGH_SPEED_SHAKE_THRESHOLD,
  HIGH_SPEED_SHAKE_X_AMP,
  HIGH_SPEED_SHAKE_Y_AMP,
  HIGH_SPEED_SHAKE_FREQ_X,
  HIGH_SPEED_SHAKE_FREQ_Y,
  LANDING_IMPACT_Y,
  LANDING_IMPACT_Z,
  MICROJOLT_AMOUNT,
  JOLT_DECAY,
  STAR_COUNT,
  STAR_SIZE,
  STAR_OPACITY,
  SPEEDLINE_COUNT,
  SPEEDLINE_BASE_SPEED,
  SPEEDLINE_LEVEL_MULT,
  WELCOME_DURATION,
  LV1_GUIDE_DURATION,
  DURATIONS,
  DISPLAY_LEVELS,
  TOTAL_PLAY_SEC,
  FLOOR_COLOR,
  LANE_LINE_COLOR,
  DUCK_DIP_TARGET,
  DUCK_PITCH_TARGET,
  DUCK_RECOVER_RATE_POS,
  DUCK_RECOVER_RATE_ROT,
  DUCK_BOUNCE_AFTER_PASS,
  DUCK_BOUNCE_DECAY_RATE,
  LV1_RUN_SHAKE_FREQ,
  LV1_RUN_SHAKE_AMP,
  RUNBOB_SCALE_JUMP_PAD,
  RUNBOB_SCALE_DUCK,
  RUNBOB_ALPHA,
  PHRASES,
  PAD_DEPTH,
} from './core/coordContract';

import type { FlowDomRefs } from './FlowTypes';
export type { FlowDomRefs };

export class FlowEngine {
  private canvas: HTMLCanvasElement;
  private domRefs: FlowDomRefs;
  private rafId: number = 0;
  private clock: THREE.Clock | null = null;
  private obstacleManager!: ObstacleManager;
  private audio = new FlowAudio();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private stars: THREE.Points | null = null;
  private speedLines!: THREE.Group;
  private speedLinesNear: THREE.Group | null = null;

  private bridges: Array<{
    mesh: THREE.Group;
    lane: number;
    bridgeId: number;
    x: number;
    padDepth: number;
    hasBox: boolean;
  }> = [];
  private spaceObjects: Array<{
    mesh: THREE.Mesh | THREE.Group;
    speed: number;
    rotationSpeed: number;
  }> = [];

  private gameState = 'waiting';
  private isResting = false;
  private movementActive = false;
  private gameTime = 0;
  private levelTime = 0;
  private currentLevelIndex = 0;

  private readonly durations = DURATIONS;
  private readonly displayLevels = DISPLAY_LEVELS;

  private readonly baseSpeed = BASE_SPEED;
  private readonly bridgeLength = BRIDGE_LENGTH;
  private readonly bridgeGap = BRIDGE_GAP;
  private readonly laneWidth = LANE_WIDTH;

  private visualX = 0;
  private targetX = 0;
  private playerJumpY = 0;
  private groundY = GROUND_Y;
  private isJumping = false;
  private isOnBridge = false;
  private isOnPad = false;

  private landingStabilityTimer = 0;
  private cameraTiltZ = 0;
  private landingShake = 0;
  private landingImpactY = 0;
  private landingImpactZ = 0;
  private impactYTimer = 0;
  private impactZTimer = 0;

  private readonly playerZ = PLAYER_Z;
  private activeBridge: (typeof this.bridges)[0] | null = null;
  private lastJumpBridgeId = -1;
  private bridgeIdCounter = 0;
  private isChangingLane = false;

  private currentFov = 60;
  private targetFov = 60;
  private readonly PAD_TRIGGER_RATIO = PAD_TRIGGER_RATIO;
  private readonly WELCOME_DURATION = WELCOME_DURATION;
  private readonly LV1_GUIDE_DURATION = LV1_GUIDE_DURATION;

  private jumpProgress = 0;
  private jumpStartTime = 0;

  private microJolt = 0;
  private cameraLagX = 0;
  private landingImpactYVel = 0;
  private landingImpactZVel = 0;

  private readonly beatStepSec = (60 / 150) / 2;
  private nextBeatTime = 0;
  private beatPulseValue = 0;
  private flashPulseValue = 0;

  private duckDipOffset = 0;
  private duckPitchX = 0;
  private duckBounceOffset = 0;
  private camYBase = 0;
  private camYBob = 0;
  private panoStoragePath: string | null = null;
  private panoMesh: THREE.Mesh | null = null;
  private currentSpeedValue = 0;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private restCountdownTimer: ReturnType<typeof setInterval> | null = null;
  private restStartMs = 0;
  private pendingTimeouts: Array<ReturnType<typeof setTimeout>> = [];

  constructor(canvas: HTMLCanvasElement, domRefs: FlowDomRefs) {
    this.canvas = canvas;
    this.domRefs = domRefs;
  }

  private registerTimeout(callback: () => void, delay: number): void {
    const handle = setTimeout(() => {
      this.pendingTimeouts = this.pendingTimeouts.filter((h) => h !== handle);
      callback();
    }, delay);
    this.pendingTimeouts.push(handle);
  }

  private clearScheduledTimeouts(): void {
    if (this.restCountdownTimer !== null) {
      clearInterval(this.restCountdownTimer);
      this.restCountdownTimer = null;
    }
    for (const handle of this.pendingTimeouts) clearTimeout(handle);
    this.pendingTimeouts = [];
  }

  private clearCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    const cdOverlay = getRefEl(this.domRefs.countdownOverlay);
    if (cdOverlay) {
      cdOverlay.classList.add('hidden');
      cdOverlay.innerText = '';
    }
  }

  /** 파노 로딩 상태를 좌상단 HUD에 표시 (진단용) */
  private setPanoStatus(text: string): void {
    const el = getRefEl(this.domRefs.panoDebugHud);
    if (el) el.textContent = text;
  }

  /**
   * Admin: 특정 레벨로 즉시 시작
   * Phase A-1: 원자적 리셋 + 브리지 재스폰
   */
  setStartLevel(level: 1 | 2 | 3 | 4): void {
    if (!this.scene || !this.camera || this.gameState !== 'playing') return;

    this.clearScheduledTimeouts();
    this.clearCountdown();

    // 1) 타이밍/상태 리셋
    this.gameTime = 0;
    this.levelTime = 0;
    this.movementActive = true;
    this.isResting = false;
    this.currentSpeedValue = 0;

    // 레벨 인덱스 매핑 (displayLevels = [1, 2, 0, 3, 4, -1])
    const levelToIndex: Record<1 | 2 | 3 | 4, number> = {
      1: 0, // LV1
      2: 1, // LV2
      3: 3, // LV3
      4: 5, // LV4 (인덱스 2,4는 REST)
    };
    this.currentLevelIndex = levelToIndex[level];

    // 2) 브리지/점프 판정 리셋
    this.activeBridge = null;
    this.lastJumpBridgeId = -1;
    this.isJumping = false;
    this.jumpProgress = 0;
    this.playerJumpY = 0;
    this.isOnBridge = false;
    this.isOnPad = false;

    // 기존 브리지 제거
    for (const b of this.bridges) {
      this.scene.remove(b.mesh);
    }
    this.bridges.length = 0;

    // 브리지 3개 스폰
    for (let i = 0; i < 3; i++) {
      this.spawnBridge(i === 0, level, 0);
    }

    // 3) 카메라/이펙트 리셋
    this.landingImpactY = 0;
    this.landingImpactZ = 0;
    this.landingImpactYVel = 0;
    this.landingImpactZVel = 0;
    this.impactYTimer = 0;
    this.impactZTimer = 0;
    this.microJolt = 0;
    this.landingShake = 0;
    this.landingStabilityTimer = 0;
    this.cameraTiltZ = 0;
    this.duckDipOffset = 0;
    this.duckPitchX = 0;
    this.duckBounceOffset = 0;
    this.camYBase = CAMERA_BASE_HEIGHT + GROUND_Y;
    this.camYBob = 0;
    this.visualX = 0;
    this.targetX = 0;
    this.cameraLagX = 0;
    this.isChangingLane = false;

    // 4) HUD 리셋
    const levelNumEl = getRefEl(this.domRefs.levelNum);
    if (levelNumEl) levelNumEl.innerText = String(level);
    setLevelTag(this.domRefs, level);

    const introScreen = getRefEl(this.domRefs.introScreen);
    if (introScreen) introScreen.classList.add('fade-out', 'hidden');
    const introTitle = getRefEl(this.domRefs.introTitle);
    if (introTitle) introTitle.innerHTML = '';
    const startBtn = getRefEl(this.domRefs.startBtn);
    if (startBtn) startBtn.style.display = 'none';

    // 골드 버짓 리셋
    if (level === 3) {
      this.obstacleManager.setGoldBudget(4);
    }

    // Beat 리셋
    this.nextBeatTime = this.gameTime;
    this.beatPulseValue = 0;
    this.flashPulseValue = 0;

    // 시작 인스트럭션
    if (level === 1) showInstruction(this.domRefs, 'JUMP!', 'text-yellow-400', 700);
    else if (level === 2) showInstruction(this.domRefs, 'FASTER!', 'text-cyan-300', 900);
    else if (level === 3) showInstruction(this.domRefs, 'PUNCH! 🥊', 'text-red-400', 900);
    else if (level === 4) showInstruction(this.domRefs, 'FOCUS!', 'text-orange-300', 900);
  }

  private getCurrentLevelNum(): number {
    return this.displayLevels[this.currentLevelIndex];
  }

  private init3D(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, FOG_NEAR, FOG_FAR_BY_LEVEL[1]);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      30000
    );
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    if ('outputColorSpace' in this.renderer) {
      (this.renderer as THREE.WebGLRenderer & { outputColorSpace: string }).outputColorSpace =
        THREE.SRGBColorSpace;
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const devicePixelRatio = window.devicePixelRatio ?? 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(amb);

    const spot = new THREE.PointLight(0x3b82f6, 15, 10000);
    spot.position.set(0, 2000, 1000);
    this.scene.add(spot);

    this.createSpaceBackground();
    this.createSpeedLines();
    this.createTrackLanes();
    this.createSpacePlanets();

    this.obstacleManager = new ObstacleManager(
      this.scene,
      this.bridgeLength,
      {
        onFlash: () => {
          this.flashPulseValue = Math.min(1.0, this.flashPulseValue + 0.75);
        },
        onCameraTilt: (amount) => {
          this.microJolt += 1.2;
          this.cameraTiltZ += amount;
        },
        onPunch: () => this.audio.sfxPunch(),
        onCoin: () => this.audio.sfxCoin(),
        onShowInstruction: (text, colorClass, ms) =>
          showInstruction(this.domRefs, text, colorClass, ms),
        onUfoSpawned: () => {},
        onUfoDuckStart: () => {
          showInstruction(this.domRefs, 'DUCK!', 'text-cyan-300', 600);
          this.duckDipOffset = DUCK_DIP_TARGET;
          this.duckPitchX = DUCK_PITCH_TARGET;
        },
        onUfoPassed: () => {
          this.audio.sfxWhoosh();
          this.duckBounceOffset = DUCK_BOUNCE_AFTER_PASS;
        },
      }
    );
  }

  private createSpaceBackground(): void {
    if (!this.scene) return;

    const clearBackground = () => {
      if (this.panoMesh) {
        this.panoMesh.parent?.remove(this.panoMesh);
        const mat = this.panoMesh.material as THREE.MeshBasicMaterial;
        const map = mat?.map;
        if (map) map.dispose();
        mat?.dispose();
        this.panoMesh.geometry?.dispose();
        this.panoMesh = null;
      }

      if (this.stars) {
        this.scene!.remove(this.stars);
        const mat = this.stars.material as THREE.Material;
        this.stars.geometry?.dispose();
        mat?.dispose();
        this.stars = null;
      }
    };

    const ensureStars = () => {
      if (this.stars) return;

      const starGeo = new THREE.BufferGeometry();
      const starCount = STAR_COUNT;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 25000;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 25000;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 25000;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

      this.stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          color: 0xffffff,
          size: STAR_SIZE,
          transparent: true,
          opacity: STAR_OPACITY,
        })
      );

      this.scene!.add(this.stars);
    };

    ensureStars();

    const path = this.panoStoragePath;
    if (!path || typeof window === 'undefined') {
      this.setPanoStatus('PANO: none');
      return;
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    if (!base) {
      this.setPanoStatus('PANO: env-missing');
      console.warn('[FLOW PANO] env-missing: NEXT_PUBLIC_SUPABASE_URL');
      return;
    }

    const encodedPath = path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
    const url = `${base}/storage/v1/object/public/iiwarmup-files/${encodedPath}`;

    this.setPanoStatus('PANO: loading');
    console.log('[FLOW PANO] url=', url, ', head check...');

    fetch(url, { method: 'HEAD' })
      .then((res) => {
        const status = res.status;
        if (status !== 200) {
          this.setPanoStatus(`PANO: failed(${status})`);
          console.warn('[FLOW PANO] head=', status, ', skip load');
          return;
        }
        console.log('[FLOW PANO] head=200, loading');
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
          url,
          (tex) => {
            if (!this.scene) {
              tex.dispose();
              return;
            }

            if (this.panoMesh) {
              this.panoMesh.parent?.remove(this.panoMesh);
              const oldMat = this.panoMesh.material as THREE.MeshBasicMaterial;
              oldMat?.map?.dispose();
              oldMat?.dispose();
              this.panoMesh.geometry?.dispose();
              this.panoMesh = null;
            }

            if ('colorSpace' in tex) {
              tex.colorSpace = THREE.SRGBColorSpace;
            } else if ('encoding' in tex) {
              (tex as THREE.Texture & { encoding: number }).encoding = 3001;
            }
            tex.needsUpdate = true;

            const geo = new THREE.SphereGeometry(4500, 32, 32);
            geo.scale(-1, 1, 1);

            const mat = new THREE.MeshBasicMaterial({
              map: tex,
              side: THREE.FrontSide,
              depthWrite: false,
              depthTest: false,
              fog: false,
            });

            this.panoMesh = new THREE.Mesh(geo, mat);
            this.panoMesh.renderOrder = -10;
            this.panoMesh.frustumCulled = false;
            this.panoMesh.position.set(0, 0, 0);
            this.camera.add(this.panoMesh);

            const inScene = this.panoMesh.parent != null;
            const hasMap = !!(mat?.map);
            const srgb = this.renderer && 'outputColorSpace' in this.renderer ? 1 : 0;
            this.setPanoStatus(`PANO: ok (mesh:${inScene ? 1 : 0} map:${hasMap ? 1 : 0} srgb:${srgb})`);
            console.log('[FLOW PANO] ok', tex.image?.width, tex.image?.height);
          },
          undefined,
          (err) => {
            this.setPanoStatus('PANO: failed(load)');
            console.warn('[FLOW PANO] load failed:', url, err);
          }
        );
      })
      .catch(() => {
        this.setPanoStatus('PANO: failed(network)');
        console.warn('[FLOW PANO] failed(network)', url);
      });
  }

  private createSpacePlanets(): void {
    const earthGeo = new THREE.SphereGeometry(1200, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x2233ff,
      emissive: 0x112244,
      shininess: 25,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(3500, 1500, -12000);
    this.scene.add(earth);
    this.spaceObjects.push({ mesh: earth, speed: 0.15, rotationSpeed: 0.001 });

    const bhGroup = new THREE.Group();
    const bhCore = new THREE.Mesh(
      new THREE.SphereGeometry(300, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    const diskGeo = new THREE.TorusGeometry(550, 150, 2, 128);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.rotation.x = Math.PI / 2;
    bhGroup.add(bhCore);
    bhGroup.add(disk);
    bhGroup.position.set(1500, 3000, -25000);
    this.scene.add(bhGroup);
    this.spaceObjects.push({ mesh: bhGroup, speed: 0.08, rotationSpeed: 0.008 });
  }

  private createSpeedLines(): void {
    if (this.speedLinesNear) {
      this.speedLinesNear.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as THREE.Material).dispose();
      });
      this.speedLinesNear = null;
    }

    this.speedLines = new THREE.Group();
    for (let i = 0; i < SPEEDLINE_COUNT; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 800),
        new THREE.MeshBasicMaterial({
          color: 0x60a5fa,
          transparent: true,
          opacity: 0,
        })
      );
      line.position.set(
        (Math.random() - 0.5) * 12000,
        (Math.random() - 0.5) * 12000,
        (Math.random() - 1) * 15000
      );
      this.speedLines.add(line);
    }
    this.scene.add(this.speedLines);

    this.speedLinesNear = new THREE.Group();
    const nearCount = 220;
    for (let i = 0; i < nearCount; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.4, 1400),
        new THREE.MeshBasicMaterial({
          color: 0x93c5fd,
          transparent: true,
          opacity: 0,
        })
      );
      line.position.set(
        (Math.random() - 0.5) * 3200,
        (Math.random() - 0.5) * 2200,
        -(900 + Math.random() * 5200)
      );
      this.speedLinesNear.add(line);
    }
    this.scene.add(this.speedLinesNear);
  }

  private createTrackLanes(): void {
    for (let i = -1; i <= 1; i++) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(this.laneWidth, 60000),
        new THREE.MeshPhongMaterial({
          color: FLOOR_COLOR,
          transparent: true,
          opacity: 0.9,
        })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(i * this.laneWidth, -30, -20000);
      this.scene.add(strip);
    }
    const lineMat = new THREE.MeshBasicMaterial({
      color: LANE_LINE_COLOR,
      transparent: true,
      opacity: 0.4,
    });
    [
      -this.laneWidth * 1.5,
      -this.laneWidth * 0.5,
      this.laneWidth * 0.5,
      this.laneWidth * 1.5,
    ].forEach((x) => {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 60000),
        lineMat
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, -29, -20000);
      this.scene.add(line);
    });
  }

  private spawnBridge(
    isFirst: boolean,
    levelNumForSpawn: number,
    playerX: number
  ): void {
    let spawnZ = -8000;
    const padDepth = PAD_DEPTH;

    if (isFirst) spawnZ = this.playerZ;
    else if (this.bridges.length > 0) {
      const lastBridge = this.bridges[this.bridges.length - 1];
      const level = levelNumForSpawn;
      const gap =
        level === 1 ? 900 :
        level === 2 ? 650 :
        level === 3 ? 520 :
        450;
      spawnZ =
        lastBridge.mesh.position.z -
        (this.bridgeLength + padDepth) -
        gap;
    }

    const group = new THREE.Group();
    const laneColors = [0xe53935, 0x43a047, 0xfdd835];
    const randLane = isFirst ? 1 : Math.floor(Math.random() * 3);
    const bridgeColor = laneColors[randLane];

    const topGeo = new THREE.BoxGeometry(
      this.laneWidth - 5,
      8,
      this.bridgeLength
    );
    const topMat = new THREE.MeshBasicMaterial({
      color: bridgeColor,
      fog: true,
    });
    const topPlate = new THREE.Mesh(topGeo, topMat);
    topPlate.position.y = 40;
    group.add(topPlate);

    const padGeo = new THREE.BoxGeometry(this.laneWidth - 10, 6, padDepth);
    const padMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
    const exitPad = new THREE.Mesh(padGeo, padMat);
    exitPad.position.set(
      0,
      44,
      -(this.bridgeLength / 2 + padDepth / 2)
    );
    group.add(exitPad);

    const sideGeo = new THREE.BoxGeometry(
      6,
      25,
      this.bridgeLength + padDepth
    );
    const sideMat = new THREE.MeshPhongMaterial({
      color: 0x222222,
      emissive: 0x111111,
    });

    const leftBeam = new THREE.Mesh(sideGeo, sideMat);
    leftBeam.position.set(-(this.laneWidth / 2 - 4), 30, -padDepth / 2);
    group.add(leftBeam);

    const rightBeam = new THREE.Mesh(sideGeo, sideMat);
    rightBeam.position.set(this.laneWidth / 2 - 4, 30, -padDepth / 2);
    group.add(rightBeam);

    const crossGeo = new THREE.BoxGeometry(this.laneWidth - 10, 6, 40);
    for (let j = -1; j <= 1; j++) {
      const crossMesh = new THREE.Mesh(crossGeo, sideMat);
      crossMesh.position.set(0, 20, j * (this.bridgeLength / 3));
      group.add(crossMesh);
    }

    group.position.set((randLane - 1) * this.laneWidth, 0, spawnZ);
    this.scene.add(group);

    const bridgeObj = {
      mesh: group,
      lane: randLane,
      bridgeId: this.bridgeIdCounter++,
      x: (randLane - 1) * this.laneWidth,
      padDepth,
      hasBox: false,
    };
    this.bridges.push(bridgeObj);

    // A-3: UFO 우선 스폰(다리 위에), UFO 있으면 박스 스폰 금지
    let hasUfo = false;
    if (levelNumForSpawn >= 4) {
      hasUfo = this.obstacleManager.trySpawnUfo(levelNumForSpawn, bridgeObj);
    }

    if (
      !hasUfo &&
      levelNumForSpawn >= 3 &&
      this.obstacleManager.shouldSpawnBox(levelNumForSpawn)
    ) {
      this.obstacleManager.attachBoxToBridge(bridgeObj, levelNumForSpawn);
    }
  }

  private spawn2DSpeedLine(): void {
    const container = getRefEl(this.domRefs.speedLinesOverlay);
    if (!container) return;

    const line = document.createElement('div');
    line.className = 'speed-line-2d';

    const vpX = 50;
    const vpY = 46;

    const startX = vpX + (Math.random() - 0.5) * 10;
    const startY = vpY + (Math.random() - 0.5) * 8;

    const angle = Math.random() * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    const thickness = 1.6 + Math.random() * 2.2;
    const length = window.innerHeight * (0.18 + Math.random() * 0.22);

    line.style.width = `${thickness}px`;
    line.style.height = `${length}px`;
    line.style.left = `${startX}%`;
    line.style.top = `${startY}%`;

    const baseOpacity = 0.12 + Math.random() * 0.18;
    line.style.opacity = `${baseOpacity}`;

    const deg = (Math.atan2(dirY, dirX) * 180) / Math.PI + 90;
    line.style.transformOrigin = '50% 0%';
    line.style.transform = `rotate(${deg}deg) scaleY(0.15)`;

    container.appendChild(line);

    const travel = 900 + Math.random() * 1400;
    const dx = dirX * travel;
    const dy = dirY * travel;

    const duration = 220 + Math.random() * 220;
    const anim = line.animate(
      [
        { transform: `translate(0px,0px) rotate(${deg}deg) scaleY(0.12)`, opacity: 0 },
        { opacity: baseOpacity, offset: 0.12 },
        { transform: `translate(${dx}px,${dy}px) rotate(${deg}deg) scaleY(1.0)`, opacity: 0 },
      ],
      { duration, easing: 'linear' }
    );

    anim.onfinish = () => line.remove();
  }

  private updateCamera(
    dt: number,
    dt60: number,
    currentSpeed: number
  ): void {
    if (!this.camera) return;

    const lagSpeed = CAMERA_LAG_SPEED;
    if (this.isJumping) {
      this.visualX +=
        (this.targetX - this.visualX) * (1 - Math.exp(-lagSpeed * dt));
    } else {
      const laneX = this.activeBridge ? this.activeBridge.x : this.visualX;
      this.visualX = laneX;
    }

    this.cameraLagX +=
      (this.visualX - this.cameraLagX) * (1 - Math.exp(-lagSpeed * dt));

    this.duckDipOffset += (0 - this.duckDipOffset) * DUCK_RECOVER_RATE_POS * dt60;
    this.duckPitchX += (0 - this.duckPitchX) * DUCK_RECOVER_RATE_ROT * dt60;
    this.duckBounceOffset *= Math.pow(1 - DUCK_BOUNCE_DECAY_RATE, dt60);

    let yOffsetRaw = 0;
    let zOffset = 0;

    const currentLevelNum = this.getCurrentLevelNum();
    const isDucking = this.duckDipOffset < -10;

    // dt-independent smoothing (stable even when dt is clamped)
    // Interpret RUNBOB_ALPHA as legacy-per-60fps step coefficient
    const alphaBob = 1 - Math.pow(1 - RUNBOB_ALPHA, dt60);

    if (this.movementActive && this.isOnBridge) {
      const freq =
        currentLevelNum === 1
          ? LV1_RUN_SHAKE_FREQ
          : 15.7 + currentLevelNum * 5.5;
      const amp =
        currentLevelNum === 1
          ? LV1_RUN_SHAKE_AMP
          : 0.55 + (currentLevelNum - 1) * 0.12;
      yOffsetRaw = Math.sin(this.gameTime * freq) * amp;

      let runBobScale = 1;
      if (this.landingStabilityTimer > 0) runBobScale = 0;
      else if (isDucking) runBobScale = RUNBOB_SCALE_DUCK;
      else if (this.isJumping || this.isOnPad) runBobScale = RUNBOB_SCALE_JUMP_PAD;
      const yOffsetMasked = yOffsetRaw * runBobScale;

      this.camYBob += (yOffsetMasked - this.camYBob) * alphaBob;
    } else {
      this.camYBob += (0 - this.camYBob) * alphaBob;
    }

    const currentJumpY = this.playerJumpY;

    if (this.isJumping) {
      if (this.jumpProgress < 0.1)
        zOffset = (this.jumpProgress / 0.1) * -15;
      else if (this.jumpProgress < 0.2)
        zOffset = (1.0 - (this.jumpProgress - 0.1) / 0.1) * -15;
    }

    const baseCamH = CAMERA_BASE_HEIGHT;
    const joltY = this.microJolt * 1.8;
    const joltZ = this.microJolt * -4.2;

    const targetCamYBase =
      baseCamH +
      this.groundY +
      currentJumpY +
      this.landingImpactY +
      joltY +
      this.duckDipOffset +
      this.duckBounceOffset;

    // dt-independent smoothing for base camera Y
    const alphaBase = 1 - Math.pow(1 - 0.15, dt60);
    this.camYBase += (targetCamYBase - this.camYBase) * alphaBase;
    this.camera.position.y = this.camYBase + this.camYBob;
    this.camera.position.z =
      CAMERA_BASE_Z + zOffset + this.landingImpactZ + joltZ;
    this.camera.position.x = this.cameraLagX;

    if (currentSpeed > HIGH_SPEED_SHAKE_THRESHOLD) {
      const highSpeedRange = Math.max(
        0.0001,
        FOV_SPEED_MAX - HIGH_SPEED_SHAKE_THRESHOLD
      );
      const shakeRatio = Math.min(
        1,
        (currentSpeed - HIGH_SPEED_SHAKE_THRESHOLD) / highSpeedRange
      );
      const time = this.gameTime;
      const shakeX =
        Math.sin(time * HIGH_SPEED_SHAKE_FREQ_X) *
        Math.sin(time * (HIGH_SPEED_SHAKE_FREQ_X * 0.37)) *
        HIGH_SPEED_SHAKE_X_AMP *
        shakeRatio;
      const shakeY =
        Math.sin(time * HIGH_SPEED_SHAKE_FREQ_Y) *
        Math.sin(time * (HIGH_SPEED_SHAKE_FREQ_Y * 0.53)) *
        HIGH_SPEED_SHAKE_Y_AMP *
        shakeRatio;
      this.camera.position.x += shakeX;
      this.camera.position.y += shakeY;
    }

    const speedRange = Math.max(0.0001, FOV_SPEED_MAX - FOV_SPEED_MIN);
    const speedRatioRaw = (currentSpeed - FOV_SPEED_MIN) / speedRange;
    const speedRatio = Math.min(1, Math.max(0, speedRatioRaw));
    this.targetFov = FOV_MIN + (FOV_MAX - FOV_MIN) * speedRatio;

    if (Math.abs(this.currentFov - this.targetFov) > 0.02) {
      this.currentFov +=
        (this.targetFov - this.currentFov) * 0.06 * dt60;
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    let targetTilt = 0;
    if (!this.isOnPad && this.isChangingLane && this.isJumping) {
      if (this.jumpProgress < 0.15)
        targetTilt = this.targetX > this.visualX ? -0.05 : 0.05;
    }

    if (this.landingShake !== 0) {
      targetTilt += this.landingShake;
      this.landingShake *= Math.pow(0.85, dt60);
      if (Math.abs(this.landingShake) < 0.001) this.landingShake = 0;
    }

    this.cameraTiltZ +=
      (targetTilt - this.cameraTiltZ) * (1 - Math.exp(-10 * dt));
    this.camera.rotation.z = this.cameraTiltZ;
    this.camera.rotation.x = this.duckPitchX;

    this.camera.lookAt(this.cameraLagX, this.groundY + 45, -1500);
  }

  private getJumpParamsByLevel(
    levelNum: number
  ): { duration: number; height: number } {
    const lv = (levelNum >= 1 && levelNum <= 4) ? levelNum as 1 | 2 | 3 | 4 : 1;
    return { duration: JUMP_DURATION[lv], height: JUMP_HEIGHT[lv] };
  }

  private triggerJump(): void {
    if (this.isJumping) return;
    this.isJumping = true;
    this.jumpProgress = 0;
    this.jumpStartTime = this.gameTime;

    this.audio.sfxJump();
    this.microJolt += MICROJOLT_AMOUNT;

    const currentLevelNum = this.getCurrentLevelNum();
    if (currentLevelNum === 1)
      showInstruction(this.domRefs, 'JUMP!', 'text-yellow-400', 450);
    if (currentLevelNum === 2)
      showInstruction(this.domRefs, 'JUMP!', 'text-yellow-400', 450);
  }

  private updateJump(dt: number): void {
    if (!this.isJumping) return;

    const currentLevelNum = this.getCurrentLevelNum();
    const jp = this.getJumpParamsByLevel(currentLevelNum);
    const elapsed = this.gameTime - this.jumpStartTime;
    this.jumpProgress = Math.min(elapsed / jp.duration, 1.0);

    let jumpCurve = 0;
    if (this.jumpProgress < 0.6) {
      const t = this.jumpProgress / 0.6;
      jumpCurve = 1 - Math.pow(1 - t, 2);
    } else {
      const t = (this.jumpProgress - 0.6) / 0.4;
      jumpCurve = 1 - Math.pow(t, 3);
    }
    this.playerJumpY = Math.max(0, jumpCurve * jp.height);

    if (this.jumpProgress >= 1) {
      this.playerJumpY = 0;
      this.isJumping = false;
      this.jumpProgress = 0;

      this.landingStabilityTimer = 0.12;
      this.impactYTimer = 0.05;
      this.impactZTimer = 0.04;
      this.landingImpactY = LANDING_IMPACT_Y;
      this.landingImpactZ = LANDING_IMPACT_Z;

      this.isChangingLane = false;
    }
  }

  private triggerRest(): void {
    this.isResting = true;
    this.movementActive = false;

    const ins = getRefEl(this.domRefs.introScreen);
    const txt = getRefEl(this.domRefs.introTitle);
    const btn = getRefEl(this.domRefs.startBtn);

    if (btn) btn.style.display = 'none';
    if (ins) ins.classList.remove('hidden', 'fade-out');

    const restDurationSec = this.durations[this.currentLevelIndex] ?? 20;
    const updateRestCountdown = (remaining: number) => {
      if (txt) {
        txt.style.fontSize = '3.2rem';
        txt.innerHTML =
          PHRASES.restBreathe +
          (remaining > 0
            ? `<br><span style="font-size:2rem;color:#94a3b8;margin-top:1rem;display:block;">다음 레벨까지 ${remaining}초</span>`
            : '');
      }
    };
    updateRestCountdown(restDurationSec);

    this.clearScheduledTimeouts();
    this.restStartMs = performance.now();
    this.restCountdownTimer = setInterval(() => {
      const elapsed = Math.floor((performance.now() - this.restStartMs) / 1000);
      const remaining = Math.max(0, restDurationSec - elapsed);
      updateRestCountdown(remaining);
    }, 1000);

    this.registerTimeout(() => {
      if (this.restCountdownTimer !== null) {
        clearInterval(this.restCountdownTimer);
        this.restCountdownTimer = null;
      }
      this.currentLevelIndex++;
      const nextLevel = this.getCurrentLevelNum();

      const levelNumEl = getRefEl(this.domRefs.levelNum);
      if (levelNumEl) levelNumEl.innerText = String(nextLevel);
      setLevelTag(this.domRefs, nextLevel);

      if (nextLevel === 3) {
        this.obstacleManager.setGoldBudget(3 + Math.floor(Math.random() * 2));
      }

      if (txt) {
        if (nextLevel === 3) {
          txt.style.fontSize = '3rem';
          txt.innerHTML = PHRASES.lv3Intro;
        } else if (nextLevel === 4) {
          txt.style.fontSize = '3rem';
          txt.innerHTML = PHRASES.lv4Intro;
        }
      }

      this.registerTimeout(() => {
        this.doCountdownStart(() => {
          this.isResting = false;
          this.movementActive = true;
          this.levelTime = 0;
          if (ins) ins.classList.add('fade-out');
        });
      }, 2000);
    }, restDurationSec * 1000);
  }

  private triggerEnding(): void {
    this.gameState = 'finished';
    this.isResting = true;
    this.movementActive = false;

    this.audio.stopMusic();

    const ins = getRefEl(this.domRefs.introScreen);
    const txt = getRefEl(this.domRefs.introTitle);

    if (ins) ins.classList.remove('hidden', 'fade-out');
    if (txt) {
      txt.style.fontSize = '3.2rem';
      txt.innerHTML = PHRASES.ending;
    }
  }

  private doCountdownStart(onDone: () => void): void {
    const cdOverlay = getRefEl(this.domRefs.countdownOverlay);
    if (!cdOverlay) return;

    this.clearCountdown();
    cdOverlay.classList.remove('hidden');
    let count = 3;
    cdOverlay.innerText = String(count);

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) cdOverlay.innerText = String(count);
      else if (count === 0) cdOverlay.innerText = 'START!';
      else {
        this.clearCountdown();
        cdOverlay.classList.add('hidden');
        onDone?.();
      }
    }, 1000);
  }

  private onBeatTick(levelNum: number): void {
    const pulseStrength =
      levelNum === 1
        ? 0.03
        : levelNum === 2
        ? 0.05
        : levelNum === 3
        ? 0.06
        : 0.08;

    this.flashPulseValue = Math.min(
      1.0,
      this.flashPulseValue + pulseStrength
    );
    this.beatPulseValue = Math.min(1.0, this.beatPulseValue + 0.4);
  }

  private triggerStartSequence(): void {
    this.isResting = true;
    this.movementActive = false;

    const ins = getRefEl(this.domRefs.introScreen);
    const txt = getRefEl(this.domRefs.introTitle);
    const btn = getRefEl(this.domRefs.startBtn);

    if (btn) btn.style.display = 'none';
    if (ins) ins.classList.remove('hidden', 'fade-out');
    if (txt) {
      txt.style.fontSize = '3.1rem';
      txt.innerHTML = PHRASES.welcome;
    }

    this.clearScheduledTimeouts();
    this.registerTimeout(() => {
      if (txt) {
        txt.style.fontSize = '3rem';
        txt.innerHTML = PHRASES.lv1Guide;
      }

      this.registerTimeout(() => {
        this.doCountdownStart(() => {
          this.isResting = false;
          this.movementActive = true;
          this.levelTime = 0;
          if (ins) ins.classList.add('fade-out');
          showInstruction(this.domRefs, 'JUMP!', 'text-yellow-400', 700);
        });
      }, this.LV1_GUIDE_DURATION);
    }, this.WELCOME_DURATION);
  }

  async startGame(bgmStoragePath?: string, panoStoragePath?: string): Promise<void> {
    this.clearScheduledTimeouts();
    this.clearCountdown();

    this.panoStoragePath = panoStoragePath ?? null;

    await this.audio.init();
    if (bgmStoragePath) {
      await this.audio.loadBgmFromStoragePath(bgmStoragePath);
    }
    this.audio.resume().then(() => this.audio.startMusic());

    const hud = getRefEl(this.domRefs.hud);
    if (hud) hud.classList.remove('hidden');

    this.init3D();
    this.spawnBridge(true, 1, 0);

    this.gameState = 'playing';
    this.movementActive = false;
    this.isResting = true;

    this.gameTime = 0;
    this.levelTime = 0;
    this.currentLevelIndex = 0;
    this.nextBeatTime = 0;
    this.currentSpeedValue = 0;

    const levelNumEl = getRefEl(this.domRefs.levelNum);
    if (levelNumEl) levelNumEl.innerText = '1';
    setLevelTag(this.domRefs, 1);

    const startBtn = getRefEl(this.domRefs.startBtn);
    if (startBtn) startBtn.style.display = 'none';

    this.triggerStartSequence();
    this.startLoop();
  }

  private startLoop(): void {
    this.clock = new THREE.Clock();
    const animate = () => {
      if (this.clock == null) return;
      const rawDt = this.clock.getDelta();
      this.update(rawDt);
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  update(rawDt: number): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    const dt = Math.min(rawDt, 0.1);
    const dt60 = dt * 60;

    if (this.gameState !== 'playing') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const currentLevelNum = this.getCurrentLevelNum();

    if (this.movementActive) {
      this.gameTime += dt;
      this.levelTime += dt;

      if (this.landingStabilityTimer > 0) this.landingStabilityTimer -= dt;

      const springK = 150.0;
      const damping = 0.88;

      if (this.impactYTimer > 0) {
        this.impactYTimer = Math.max(0, this.impactYTimer - dt);
        this.landingImpactYVel += -this.landingImpactY * springK * dt;
        this.landingImpactYVel *= Math.pow(damping, dt60);
        this.landingImpactY += this.landingImpactYVel * dt;
      } else {
        this.landingImpactY = 0;
        this.landingImpactYVel = 0;
      }

      if (this.impactZTimer > 0) {
        this.impactZTimer = Math.max(0, this.impactZTimer - dt);
        this.landingImpactZVel += -this.landingImpactZ * springK * dt;
        this.landingImpactZVel *= Math.pow(damping, dt60);
        this.landingImpactZ += this.landingImpactZVel * dt;
      } else {
        this.landingImpactZ = 0;
        this.landingImpactZVel = 0;
      }

      this.microJolt *= Math.exp(-JOLT_DECAY * dt);

      // single source of truth for 2D speedlines (FX)
      // rates are "per-60fps-frame" legacy-style
      const lineSpawnRate = currentLevelNum === 4 ? 0.18 : currentLevelNum === 1 ? 0.08 : 0.1;

      // optional: suppress during landing stability to keep "impact clarity"
      const rate = this.landingStabilityTimer > 0 ? 0 : lineSpawnRate;

      // dt-compensated probability (frame-rate independent)
      const p = 1 - Math.pow(1 - rate, dt60);
      if (Math.random() < p) this.spawn2DSpeedLine();
    }

    this.updateJump(dt);

    while (this.movementActive && this.gameTime >= this.nextBeatTime) {
      this.nextBeatTime += this.beatStepSec;
      this.onBeatTick(currentLevelNum);
    }

    const currentDuration = this.durations[this.currentLevelIndex];
    if (this.movementActive && this.levelTime > currentDuration) {
      if (this.displayLevels[this.currentLevelIndex + 1] === 0) {
        this.currentLevelIndex++;
        this.levelTime = 0;
        this.triggerRest();
      } else if (this.displayLevels[this.currentLevelIndex + 1] === -1) {
        this.currentLevelIndex++;
        this.triggerEnding();
      } else if (this.currentLevelIndex < this.durations.length - 1) {
        this.currentLevelIndex++;
        this.levelTime = 0;

        const nextLv = this.getCurrentLevelNum();
        const levelNumEl = getRefEl(this.domRefs.levelNum);
        if (levelNumEl) levelNumEl.innerText = String(nextLv);
        setLevelTag(this.domRefs, nextLv);

        if (nextLv === 2)
          showInstruction(this.domRefs, 'FASTER!', 'text-cyan-300', 900);
        if (nextLv === 3)
          showInstruction(this.domRefs, 'PUNCH! 🥊', 'text-red-400', 900);
        if (nextLv === 4)
          showInstruction(this.domRefs, 'FOCUS!', 'text-orange-300', 900);
      }
    }

    if (this.bridges.length < 3) {
      this.spawnBridge(
        this.bridges.length === 0,
        currentLevelNum,
        this.cameraLagX
      );
    }

    const lv = (currentLevelNum >= 1 && currentLevelNum <= 4) ? currentLevelNum as 1 | 2 | 3 | 4 : 1;
    const levelSpeedFactor = SPEED_MULTIPLIERS[lv];

    let speedScalar = 1.0;
    if (lv === 1 && this.movementActive) {
      const t = Math.min(this.levelTime / LV1_START_ACCEL_DURATION_SEC, 1);
      speedScalar = t * t * (3 - 2 * t);
    }

    this.currentSpeedValue = this.movementActive
      ? (this.baseSpeed * levelSpeedFactor * speedScalar) + this.gameTime * 0.0001
      : 0;
    const currentSpeed = this.currentSpeedValue;

    const fog = this.scene?.fog;
    if (fog && 'far' in fog) (fog as THREE.Fog).far = FOG_FAR_BY_LEVEL[lv];
    if (this.camera) {
      this.camera.far = CAMERA_FAR_BY_LEVEL[lv];
      this.camera.updateProjectionMatrix();
    }

    const pruneZ = BRIDGE_PRUNE_Z_BY_LEVEL[lv];
    for (let i = this.bridges.length - 1; i >= 0; i--) {
      this.bridges[i].mesh.position.z += currentSpeed * 50 * dt60;
      if (this.bridges[i].mesh.position.z > pruneZ) {
        if (this.activeBridge === this.bridges[i]) this.activeBridge = null;
        this.scene.remove(this.bridges[i].mesh);
        this.bridges.splice(i, 1);
      }
    }

    let foundActive = false;
    this.isOnPad = false;

    if (this.activeBridge) {
      const padDepth = this.activeBridge.padDepth || 200;
      const frontZ =
        this.activeBridge.mesh.position.z + this.bridgeLength / 2;
      const backZWithPad =
        this.activeBridge.mesh.position.z -
        this.bridgeLength / 2 -
        padDepth;

      if (frontZ > this.playerZ && backZWithPad < this.playerZ) {
        foundActive = true;
        const relZ = this.playerZ - this.activeBridge.mesh.position.z;
        this.isOnPad = relZ < -(this.bridgeLength / 2);

        const padStartRel = -(this.bridgeLength / 2);
        const triggerRel = padStartRel - padDepth * this.PAD_TRIGGER_RATIO;

        if (
          this.movementActive &&
          relZ <= triggerRel &&
          this.activeBridge.bridgeId !== this.lastJumpBridgeId
        ) {
          this.lastJumpBridgeId = this.activeBridge.bridgeId;
          const nextIndex = this.bridges.indexOf(this.activeBridge) + 1;
          if (nextIndex < this.bridges.length) {
            const nextB = this.bridges[nextIndex];
            this.targetX = nextB.x;
            this.isChangingLane = this.activeBridge.lane !== nextB.lane;
          }
          this.triggerJump();
        }
      } else {
        this.activeBridge = null;
      }
    }

    if (!this.activeBridge) {
      for (const b of this.bridges) {
        const padDepth = b.padDepth || 200;
        const frontZ = b.mesh.position.z + this.bridgeLength / 2;
        const backZWithPad =
          b.mesh.position.z - this.bridgeLength / 2 - padDepth;

        if (frontZ > this.playerZ && backZWithPad < this.playerZ) {
          this.activeBridge = b;
          foundActive = true;
          const relZ = this.playerZ - b.mesh.position.z;
          this.isOnPad = relZ < -(this.bridgeLength / 2);
          break;
        }
      }
    }

    if (foundActive) {
      this.isOnBridge = true;
      this.groundY = 30;
      if (!this.isJumping) this.playerJumpY = 0;
    } else {
      this.isOnBridge = false;
      this.isOnPad = false;
      this.groundY = 0;
    }

    this.obstacleManager.update(
      dt60,
      currentSpeed,
      currentLevelNum,
      this.playerZ,
      this.cameraLagX
    );

    // B-3: moveEnabled 연동
    if (this.stars) this.stars.rotation.y += this.movementActive ? 0.0002 * dt60 : 0;
    if (this.panoMesh) this.panoMesh.rotation.y += this.movementActive ? 0.0002 * dt60 : 0;

    if (this.movementActive) {
      for (const obj of this.spaceObjects) {
        obj.mesh.position.z += obj.speed * dt60;
        if (obj.mesh.position.z > 15000) obj.mesh.position.z = -25000;
        obj.mesh.rotation.y += obj.rotationSpeed * dt60;
      }
    }

    let speedOpacity = 0;
    if (currentLevelNum === 1) speedOpacity = 0.1;
    if (currentLevelNum === 2) speedOpacity = 0.16;
    if (currentLevelNum === 3) speedOpacity = 0.18;
    if (currentLevelNum === 4) speedOpacity = 0.24;

    const targetOpacity = this.movementActive
      ? speedOpacity + this.beatPulseValue * 0.15
      : 0;

    this.speedLines.children.forEach((l) => {
      (l as THREE.Mesh).position.z += this.movementActive
        ? (SPEEDLINE_BASE_SPEED + currentLevelNum * SPEEDLINE_LEVEL_MULT) * dt60
        : 0;
      if ((l as THREE.Mesh).position.z > 2500)
        (l as THREE.Mesh).position.z = -12000;

      const mat = (l as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * 0.15 * dt60;
    });

    if (this.speedLinesNear) {
      const baseNear = 780;
      const speedBoost = this.movementActive ? Math.min(900, currentLevelNum * 180) : 0;
      const nearMove = (baseNear + speedBoost) * dt60;

      const nearTargetOpacity = this.movementActive
        ? (0.10 + currentLevelNum * 0.03) + this.beatPulseValue * 0.08
        : 0;

      this.speedLinesNear.children.forEach((l) => {
        const m = l as THREE.Mesh;
        m.position.z += this.movementActive ? nearMove : 0;

        if (m.position.z > 650) {
          m.position.z = -(1100 + Math.random() * 5600);
          m.position.x = (Math.random() - 0.5) * 3200;
          m.position.y = (Math.random() - 0.5) * 2200;
        }

        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity += (nearTargetOpacity - mat.opacity) * 0.22 * dt60;
      });
    }

    this.beatPulseValue *= Math.pow(0.92, dt60);
    this.flashPulseValue *= Math.pow(0.88, dt60);

    const flash = getRefEl(this.domRefs.flashOverlay);
    if (flash) {
      flash.style.opacity = String(Math.max(0, this.flashPulseValue));
    }

    this.updateCamera(dt, dt60, currentSpeed);

    const prog = getRefEl(this.domRefs.progressBar);
    if (prog && this.movementActive) {
      const pct = (this.gameTime / TOTAL_PLAY_SEC) * 100;
      prog.style.width = Math.min(100, pct) + '%';
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(w: number, h: number): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  dispose(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.audio.stopMusic();
    this.obstacleManager?.dispose();
    if (this.panoMesh) {
      this.panoMesh.parent?.remove(this.panoMesh);
      const mat = this.panoMesh.material as THREE.MeshBasicMaterial;
      mat?.map?.dispose();
      mat?.dispose();
      this.panoMesh.geometry?.dispose();
      this.panoMesh = null;
    }
    if (this.stars) {
      this.scene?.remove(this.stars);
      const mat = this.stars.material as THREE.Material;
      this.stars.geometry?.dispose();
      mat?.dispose();
      this.stars = null;
    }
    if (this.speedLinesNear) {
      this.speedLinesNear.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as THREE.Material).dispose();
      });
      this.scene?.remove(this.speedLinesNear);
      this.speedLinesNear = null;
    }
    if (this.renderer) this.renderer.dispose();
    this.clearScheduledTimeouts();
    this.clearCountdown();
    this.clock = null;
  }
}
