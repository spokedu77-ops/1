/**
 * Flow 2.0 — 메인 엔진 (원본 iiwarmup/flow 수치 완전 이식)
 *
 * 속도: BASE_SPEED=0.6 × 50 × dt60 = ~1800 units/sec (원본 동일)
 * 점프: PAD_TRIGGER_RATIO=0.65 → bridge.z >= 2280 에서 발동 (원본 동일)
 * 카메라 bob: amp 1.2 유닛, alpha 스무딩 (원본 동일)
 * 파란 바닥 + 3색 레인: createTrackLanes (원본 동일)
 */

import * as THREE from 'three';
import { FlowAudio } from './FlowAudio';
import { AdaptiveQuality } from './AdaptiveQuality';
import { ObstacleManager } from './entities/ObstacleManager';
import type { FlowBridge } from './entities/ObstacleManager';
import type { FlowStageConfig } from './modules/stageBuilder';
import type { FlowModuleKey } from './modules/flowModules';

// ─── 상수 (원본 coordContract 완전 동일) ────────────────────────────────────

// 레인 색상: 왼쪽(0)=초록, 가운데(1)=빨강, 오른쪽(2)=노랑 — 모든 테마 공통
const LANE_COLORS: [number, number, number] = [0x22c55e, 0xef4444, 0xfbbf24];
const LANE_WIDTH         = 80;
const BRIDGE_LENGTH      = 3500;
const BRIDGE_GAP         = 450;
const PAD_DEPTH          = 200;
const PLAYER_Z           = 400;
const GROUND_Y           = 30;
const CAMERA_BASE_HEIGHT = 130;
const CAMERA_BASE_Z      = 600;
const CAMERA_LAG_SPEED   = 6.32;
const PAD_TRIGGER_RATIO  = 0.65;

// 점프 트리거: relZ = PLAYER_Z - bridge.z <= padStartRel - PAD_DEPTH * PAD_TRIGGER_RATIO
// = -1750 - 130 = -1880  →  bridge.z >= PLAYER_Z + 1880 = 2280
const PAD_START_REL    = -(BRIDGE_LENGTH / 2);           // -1750
const JUMP_TRIGGER_REL = PAD_START_REL - PAD_DEPTH * PAD_TRIGGER_RATIO; // -1880

// 속도 (원본: currentSpeed * 50 * dt60)
const BASE_SPEED = 0.6;
// 스테이지별 배수 (원본 LV1=0.8, LV2+=1.0, LV4+=1.25 참조)
const SPEED_MULTS: number[] = [0.8, 1.0, 1.0, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25];
const SPRINT_MULT  = 1.45;

// 점프 파라미터 (원본 동일)
const JUMP_HEIGHT   = 98;
const JUMP_HEIGHT_BIG = 147;
// 점프 지속 시간 by 스테이지 (원본 LV1=0.72, LV2=0.70, LV3+=0.64 근사)
const JUMP_DURATIONS: number[] = [0.72, 0.70, 0.64, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62];

// 착지 임팩트 (원본 동일)
const LANDING_IMPACT_Y  = -2.4;
const LANDING_IMPACT_Z  = -7.5;
const MICROJOLT_AMOUNT  = 0.65;
const JOLT_DECAY        = 8.0;
const SPRING_K          = 150.0;
const SPRING_DAMPING    = 0.88;

// 카메라 bob (원본 동일)
const RUNBOB_ALPHA = 0.4;   // per-60fps-frame alpha
const RUN_BOB_FREQ = 12;    // rad/gameTime-sec (LV1)
const RUN_BOB_AMP  = 1.2;   // 카메라 Y 유닛
const RUNBOB_ALPHA_BASE = 0.15; // camYBase 스무딩

// FOV
const FOV_MIN = 54;
const FOV_MAX = 82;
const FOV_SPEED_MIN = 0.3;
const FOV_SPEED_MAX = 0.9;

// 고속 흔들림
const HIGH_SPEED_SHAKE_THRESHOLD = 0.7;
const HIGH_SPEED_SHAKE_X_AMP = 0.65;
const HIGH_SPEED_SHAKE_Y_AMP = 0.45;
const HIGH_SPEED_SHAKE_FREQ_X = 4.6;
const HIGH_SPEED_SHAKE_FREQ_Y = 5.3;

// 스피드라인
const SPEEDLINE_COUNT      = 250;
const SPEEDLINE_BASE_SPEED = 260;
const SPEEDLINE_LEVEL_MULT = 38;

// 브릿지 프룬
const BRIDGE_PRUNE_Z = 5000;

// 특수 모듈
const SPRINT_CYCLE  = 12;
const SPRINT_DUR    = 3;
const FREEZE_MIN    = 10;
const FREEZE_MAX    = 18;
const FREEZE_HOLD   = 1.8;
const BALANCE_MIN   = 14;
const BALANCE_MAX   = 22;
const STAGE_FLASH_DUR = 0.5;

// 테마 (레인 색상은 LANE_COLORS로 통일, fog 색상이 하늘·수평선 색 결정)
const THEMES: Record<string, {
  bg: number; fog: number; fogNear: number; fogFar: number;
  ambientInt: number; pointColor: number;
}> = {
  default: { bg: 0x000000, fog: 0x000000, fogNear: 500, fogFar: 3200, ambientInt: 0.7,  pointColor: 0x3b82f6 },
  space:   { bg: 0x0c0030, fog: 0x090022, fogNear: 400, fogFar: 3500, ambientInt: 0.6,  pointColor: 0xb06ef7 },
  neon:    { bg: 0x001508, fog: 0x000d05, fogNear: 400, fogFar: 3500, ambientInt: 0.5,  pointColor: 0x00ff88 },
  // ocean: bg·fog를 동일한 바다 파란색 → 멀리 보이는 하늘·수평선이 전부 파랗게 채워짐
  ocean:   { bg: 0x1565a0, fog: 0x1565a0, fogNear: 150, fogFar: 2800, ambientInt: 0.85, pointColor: 0x7dd3fc },
};

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type FlowGamePhase =
  | 'idle'
  | 'countdown'
  | 'stage-intro'
  | 'playing'
  | 'stage-flash'
  | 'complete';

export interface FlowEngineCallbacks {
  onPhaseChange:  (phase: FlowGamePhase) => void;
  onCountdown:    (n: number) => void;
  onStageChange:  (stageIndex: number) => void;
  onTimerUpdate:  (remainingSec: number, totalProgress: number) => void;
  onInstruction:  (text: string, colorClass: string, ms: number) => void;
  onComplete:     (stats: FlowStats) => void;
  onBalanceCue:   (foot: 'left' | 'right') => void;
  onCameraShake:  (intensity: number, ms: number) => void;
  onFlash:        () => void;
}

export interface FlowStats {
  stagesCompleted: number;
  totalSec:        number;
}

export interface FlowEngineOptions {
  stages:       FlowStageConfig[];
  colorTheme?:  string;
  motionScale?: number;
  bgmPath?:     string;
}

interface BridgeObj extends FlowBridge {
  padDepth:         number;
  instructionFired: boolean;
}

// ─── 엔진 ────────────────────────────────────────────────────────────────────

export class FlowEngine {
  private canvas: HTMLCanvasElement;
  private cb:     Partial<FlowEngineCallbacks>;
  private opts:   FlowEngineOptions;

  private scene:    THREE.Scene | null = null;
  private camera:   THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private stars:    THREE.Points | null = null;
  private speedLines: THREE.Group | null = null;
  private oceanSurface: THREE.Mesh | null = null;
  private oceanBubbles: THREE.Points | null = null;
  private oceanTime = 0;
  private clock     = new THREE.Clock();
  private rafId     = 0;

  private audio = new FlowAudio();
  private aq    = new AdaptiveQuality();
  private obstacles: ObstacleManager | null = null;

  private bridges:      BridgeObj[] = [];
  private activeBridge: BridgeObj | null = null;
  private lastJumpBridgeId = -1;
  private bridgeIdCnt   = 0;

  // ── 카메라 (원본 동일 변수) ────────────────────────────────────────────────
  private visualX      = 0;
  private targetX      = 0;
  private cameraLagX   = 0;
  private camYBase     = CAMERA_BASE_HEIGHT + GROUND_Y;
  private camYBob      = 0;
  private currentFov   = 60;
  private targetFov    = 60;
  private cameraTiltZ  = 0;
  private isChangingLane = false;
  private isOnBridge   = false;
  private isOnPad      = false;
  private groundY      = GROUND_Y;
  private flashOverlay: HTMLElement | null = null;
  private flashPulseValue = 0;

  // ── 점프 (원본 동일) ───────────────────────────────────────────────────────
  private isJumping    = false;
  private jumpProgress = 0;
  private jumpStartTime = 0;
  private playerJumpY  = 0;
  private jumpHeight   = JUMP_HEIGHT;
  private jumpDuration = JUMP_DURATIONS[0];

  // ── 착지 임팩트 (원본 동일) ────────────────────────────────────────────────
  private landingImpactY    = 0;
  private landingImpactZ    = 0;
  private landingImpactYVel = 0;
  private landingImpactZVel = 0;
  private impactYTimer      = 0;
  private impactZTimer      = 0;
  private microJolt         = 0;
  private landingShake      = 0;
  private landingStabilityTimer = 0;
  private hitShakeRemaining = 0;
  private hitShakeIntensity = 0;
  private hitShakeDuration  = 0;

  // ── duck 자동 dip (원본 DUCK_DIP_TARGET=-80, DUCK_PITCH_TARGET=0.55) ────────
  private duckDipOffset    = 0;
  private duckBounceOffset = 0;
  private duckPitchX       = 0;

  // ── 게임 시간 ─────────────────────────────────────────────────────────────
  private gameTime   = 0;   // motionScale 적용 누적 (bob/점프용)
  private sessionSec = 0;   // 벽시계 누적

  // ── 스테이지 ──────────────────────────────────────────────────────────────
  private phase:        FlowGamePhase = 'idle';
  private stageList:    FlowStageConfig[] = [];
  private stageIdx      = 0;
  private stageTimer    = 0;
  private activeModules = new Set<FlowModuleKey>();
  private motionScale   = 1;

  // ── 특수 모듈 ─────────────────────────────────────────────────────────────
  private sprintCycle      = SPRINT_CYCLE;
  private sprintActive     = 0;
  private sprintGateWarned = false;
  private freezeCycle      = 0;
  private freezeActive     = 0;
  private freezeSignWarned = false;
  private balanceCycle     = 0;
  private balanceActive    = 0;
  private sprintGateQueued = false;
  private freezeWallQueued = false;
  private currentSpeed     = 0;

  private stats:     FlowStats = { stagesCompleted: 0, totalSec: 0 };
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    cb:     Partial<FlowEngineCallbacks>,
    opts:   FlowEngineOptions,
  ) {
    this.canvas = canvas;
    this.cb     = cb;
    this.opts   = opts;
  }

  // ── 초기화 ───────────────────────────────────────────────────────────────

  async init(flashOverlay: HTMLElement | null): Promise<void> {
    this.flashOverlay = flashOverlay;
    this.stageList    = this.opts.stages;
    this.motionScale  = Math.min(1, Math.max(0.25, this.opts.motionScale ?? 1));

    await this.audio.init();
    if (this.opts.bgmPath) await this.audio.loadBgm(this.opts.bgmPath);

    this.init3D();
    this.startCountdown();
  }

  private init3D(): void {
    const theme = THEMES[this.opts.colorTheme ?? 'default'] ?? THEMES['default']!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(theme.bg);
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);

    this.camera = new THREE.PerspectiveCamera(60, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 12000);
    this.camera.position.set(0, CAMERA_BASE_HEIGHT + GROUND_Y, CAMERA_BASE_Z);
    this.camera.lookAt(0, GROUND_Y + 45, -1500);
    this.camYBase = CAMERA_BASE_HEIGHT + GROUND_Y;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, this.aq.getPixelRatioMax()));

    const amb = new THREE.AmbientLight(0xffffff, theme.ambientInt);
    this.scene.add(amb);
    const pt = new THREE.PointLight(theme.pointColor, 15, 12000);
    pt.position.set(0, 2000, 800);
    this.scene.add(pt);

    this.buildStars();
    if ((this.opts.colorTheme ?? 'default') === 'ocean') this.buildOceanEnvironment();
    this.buildSpeedLines();
    this.createTrackLanes();

    this.obstacles = new ObstacleManager(this.scene, BRIDGE_LENGTH, {
      onBoxHit:           () => {},
      onBoxWarn:          () => { /* 어드밴스 경고 텍스트 제거 — autoHit에서만 표시 */ },
      onUfoWarn:          () => {
        // UFO가 -700 유닛 앞 → 플레이어 도달까지 ~490ms → 텍스트는 700ms만
        if (!this.activeModules.has('duck')) return;
        this.showInstruction('숙여!', 'text-cyan-300', 700);
      },
      onUfoDuckStart:     () => {
        // UFO가 플레이어 200 유닛 앞 — 카메라 딥 효과만 (텍스트 없음)
        if (!this.activeModules.has('duck')) return;
        this.duckDipOffset = -80;
        this.duckPitchX    = 0.55;
      },
      onUfoPassed:        () => {
        this.duckBounceOffset = 50;
        this.duckPitchX = 0;
        this.audio.sfxLand();
      },
      onBoxAutoHit:       (isReach: boolean) => {
        this.microJolt += 0.65;
        const am = this.activeModules;
        if (isReach && am.has('reach')) this.showInstruction('뻗어!', 'text-purple-300', 900);
        else if (!isReach && am.has('punch')) this.showInstruction('펀치!', 'text-red-400', 900);
      },
      onSprintGatePassed: () => { this.triggerSprint(); },
      onFreezeWallPassed: () => { this.triggerFreeze(); },
      onCameraShake:      (int, ms) => {
        this.hitShakeRemaining = ms;
        this.hitShakeIntensity = int;
        this.hitShakeDuration  = ms;
      },
      onFlash:            () => { this.flashPulseValue = Math.min(1, this.flashPulseValue + 0.75); },
      getShardScale:      () => this.aq.getShardScale(),
    });

    for (let i = 0; i < 3; i++) this.spawnBridge(i === 0);
  }

  // ── 파란 바닥 레인 (원본과 완전 동일) ─────────────────────────────────────

  private createTrackLanes(): void {
    if (!this.scene) return;
    for (let i = -1; i <= 1; i++) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(LANE_WIDTH, 60000),
        new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.9 }),
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(i * LANE_WIDTH, -30, -20000);
      this.scene.add(strip);
    }
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
    for (const x of [-LANE_WIDTH * 1.5, -LANE_WIDTH * 0.5, LANE_WIDTH * 0.5, LANE_WIDTH * 1.5]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 60000), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, -29, -20000);
      this.scene.add(line);
    }
  }

  // ── 별 ───────────────────────────────────────────────────────────────────

  private buildStars(): void {
    if (!this.scene) return;
    const cnt = Math.floor(1800 * this.aq.getStarCountScale());
    const pos = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 22000;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 22000;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 22000;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0.75 }));
    this.scene.add(this.stars);
  }

  // ── 바다 환경 (ocean 테마 전용) ──────────────────────────────────────────
  //
  // 핵심 원리:
  //  · THEMES.ocean의 bg·fog를 동일한 바다파란색으로 설정 → 거리가 전부 파랗게 채워짐
  //  · 트랙 바로 아래·양옆에 파도 수면을 배치 → 카메라에서 바로 보임
  //  · 카메라 높이(Y=160)에서 -30°각도로 내려보면 수면이 가시거리 안에 있어야 함

  private buildOceanEnvironment(): void {
    if (!this.scene) return;

    // ① 파도 수면 — 트랙(폭 240) 양옆 포함 초광폭 + 트랙 아래
    // PlaneGeometry 회전 후 buffer: getX=X좌우, getZ=Z깊이, setY=파고
    // Y=-2: 트랙 바닥 레인(Y=-30)보다 위, 브릿지 발판(Y=0)과 같은 높이
    const wGeo = new THREE.PlaneGeometry(18000, 55000, 40, 80);
    wGeo.rotateX(-Math.PI / 2);
    const wMat = new THREE.MeshPhongMaterial({
      color: 0x0077be,
      emissive: 0x003d7a,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.86,
      shininess: 220,
      specular: 0x7dd3fc,
    });
    this.oceanSurface = new THREE.Mesh(wGeo, wMat);
    this.oceanSurface.position.set(0, -2, -20000);
    this.scene.add(this.oceanSurface);

    // ② 물보라 파티클 — 트랙 양옆에 집중, 항상 수면 위
    const cnt = 500;
    const bpos = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      bpos[i * 3]     = side * (160 + Math.random() * 4000); // 트랙 가장자리 바깥
      bpos[i * 3 + 1] = 5 + Math.random() * 60;
      bpos[i * 3 + 2] = -Math.random() * 42000;
    }
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
    this.oceanBubbles = new THREE.Points(bGeo, new THREE.PointsMaterial({
      color: 0xe0f7ff, size: 6, transparent: true, opacity: 0.65,
    }));
    this.scene.add(this.oceanBubbles);

    // ③ 하늘빛 반사 띠 — 수면 위 낮게 떠있는 수평 발광 빔 여러 개
    //    카메라가 살짝 아래를 보므로 Z=-200~-1500 구간에 배치해야 시야에 들어옴
    for (let i = 0; i < 5; i++) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(14000, 3, 4),
        new THREE.MeshBasicMaterial({
          color: 0x7dd3fc, transparent: true,
          opacity: 0.18 - i * 0.02, depthWrite: false,
        }),
      );
      beam.position.set(0, -2 + i * 1.5, -300 - i * 600);
      this.scene.add(beam);
    }

    // ④ 태양광 기둥 — 카메라 시야 범위(fog 2800) 안에, 약간 옆으로
    for (let i = 0; i < 6; i++) {
      const h = 1800 + Math.random() * 600;
      const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(18 + Math.random() * 24, h, 100),
        new THREE.MeshBasicMaterial({
          color: 0xbae6fd, transparent: true,
          opacity: 0.055 + Math.random() * 0.04, depthWrite: false,
        }),
      );
      shaft.position.set(
        (Math.random() < 0.5 ? -1 : 1) * (300 + Math.random() * 1800),
        h * 0.5 - 2,
        -400 - i * 420,
      );
      shaft.rotation.z = (Math.random() - 0.5) * 0.25;
      this.scene.add(shaft);
    }

    // ⑤ 수평선 글로우 빔 (먼 거리, 수면 높이와 일치)
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(22000, 18, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.30 }),
    );
    glow.position.set(0, -2, -2600);
    this.scene.add(glow);
  }

  // ── 3D 스피드라인 (원본 동일) ─────────────────────────────────────────────

  private buildSpeedLines(): void {
    if (!this.scene) return;
    this.speedLines = new THREE.Group();
    for (let i = 0; i < SPEEDLINE_COUNT; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 800),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0 }),
      );
      line.position.set(
        (Math.random() - 0.5) * 12000,
        (Math.random() - 0.5) * 12000,
        (Math.random() - 1) * 15000,
      );
      this.speedLines.add(line);
    }
    this.scene.add(this.speedLines);
  }

  // ── 브릿지 ───────────────────────────────────────────────────────────────

  private spawnBridge(isFirst: boolean): void {
    if (!this.scene) return;
    const stage   = this.stageList[this.stageIdx];
    const bigJump = stage?.activeModules.has('bigJump') ?? false;

    let spawnZ: number;
    if (isFirst) {
      spawnZ = PLAYER_Z;
    } else if (this.bridges.length > 0) {
      const last = this.bridges[this.bridges.length - 1];
      const gap  = bigJump ? Math.round(BRIDGE_GAP * 1.7) : BRIDGE_GAP;
      spawnZ = last.mesh.position.z - (BRIDGE_LENGTH + PAD_DEPTH + gap);
    } else {
      spawnZ = -8000;
    }

    const randLane    = isFirst ? 1 : Math.floor(Math.random() * 3);
    const bridgeColor = LANE_COLORS[randLane]!;
    const g           = new THREE.Group();

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 5, 8, BRIDGE_LENGTH),
      new THREE.MeshBasicMaterial({ color: bridgeColor }),
    );
    top.position.y = 40;
    g.add(top);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    pad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
    g.add(pad);

    const sideGeo = new THREE.BoxGeometry(6, 25, BRIDGE_LENGTH + PAD_DEPTH);
    const sideMat = new THREE.MeshPhongMaterial({ color: 0x222222, emissive: 0x111111 });
    const leftBeam  = new THREE.Mesh(sideGeo, sideMat);
    const rightBeam = new THREE.Mesh(sideGeo, sideMat);
    leftBeam.position.set(-(LANE_WIDTH / 2 - 4), 30, -PAD_DEPTH / 2);
    rightBeam.position.set( (LANE_WIDTH / 2 - 4), 30, -PAD_DEPTH / 2);
    g.add(leftBeam, rightBeam);

    g.position.set((randLane - 1) * LANE_WIDTH, 0, spawnZ);
    this.scene.add(g);

    const bridgeObj: BridgeObj = {
      mesh: g, lane: randLane, bridgeId: this.bridgeIdCnt++,
      x: (randLane - 1) * LANE_WIDTH,
      hasBox: false, padMesh: pad, padDepth: PAD_DEPTH,
      instructionFired: false,
    };
    this.bridges.push(bridgeObj);

    if (!isFirst && this.obstacles && stage) {
      const am       = stage.activeModules;
      const hasPunch = am.has('punch') || am.has('reach');
      const hasDuck  = am.has('duck');

      if (hasDuck && hasPunch) {
        const r = Math.random();
        if (r > 0.35 && r < 0.65) {
          if (this.obstacles.shouldSpawnBox(am)) this.obstacles.attachBox(bridgeObj, am);
        } else if (r >= 0.65) {
          this.obstacles.attachUfo(bridgeObj);
        }
      } else if (hasDuck && !hasPunch) {
        if (this.obstacles.shouldSpawnUfo(am)) this.obstacles.attachUfo(bridgeObj);
      } else if (hasPunch && !hasDuck) {
        if (this.obstacles.shouldSpawnBox(am)) this.obstacles.attachBox(bridgeObj, am);
      }

      if (this.sprintGateQueued) { this.obstacles.attachSprintGate(bridgeObj); this.sprintGateQueued = false; }
      if (this.freezeWallQueued) { this.obstacles.attachFreezeWall(bridgeObj); this.freezeWallQueued = false; }
    }
  }

  // ── 카운트다운 ───────────────────────────────────────────────────────────

  private startCountdown(): void {
    this.setPhase('countdown');
    let n = 3;
    const tick = () => {
      this.cb.onCountdown?.(n);
      if (n <= 0) { this.startStage(0); return; }
      n--;
      this.countdownTimer = setTimeout(tick, 1000);
    };
    tick();
  }

  // ── 스테이지 ─────────────────────────────────────────────────────────────

  private startStage(idx: number): void {
    this.stageIdx      = idx;
    const stage        = this.stageList[idx];
    if (!stage) { this.endGame(); return; }

    this.activeModules = stage.activeModules;
    this.stageTimer    = 0;
    this.jumpHeight    = stage.activeModules.has('bigJump') ? JUMP_HEIGHT_BIG : JUMP_HEIGHT;
    this.jumpDuration  = JUMP_DURATIONS[Math.min(idx, JUMP_DURATIONS.length - 1)]!;
    this.resetSpecialTimers();
    this.obstacles?.clearAll();
    for (const b of this.bridges) { b.hasBox = false; b.instructionFired = false; }
    this.activeBridge      = null;
    this.lastJumpBridgeId  = -1;
    this.cb.onStageChange?.(idx);
    this.setPhase('stage-intro');

    this.countdownTimer = setTimeout(() => {
      this.setPhase('playing');
      this.audio.resume().then(() => this.audio.startMusic());
    }, 3000);
  }

  private resetSpecialTimers(): void {
    this.sprintCycle      = SPRINT_CYCLE;
    this.sprintActive     = 0;
    this.sprintGateWarned = false;
    this.sprintGateQueued = false;
    this.freezeCycle      = FREEZE_MIN + Math.random() * (FREEZE_MAX - FREEZE_MIN);
    this.freezeActive     = 0;
    this.freezeSignWarned = false;
    this.freezeWallQueued = false;
    this.balanceCycle     = BALANCE_MIN + Math.random() * (BALANCE_MAX - BALANCE_MIN);
    this.balanceActive    = 0;
    this.isJumping        = false;
    this.jumpProgress     = 0;
    this.playerJumpY      = 0;
  }

  private endStage(): void {
    this.stats.stagesCompleted++;
    this.setPhase('stage-flash');
    this.audio.sfxStageUp();
    // 스테이지 클리어 플래시
    this.flashPulseValue    = 1.0;
    this.hitShakeRemaining  = 250;
    this.hitShakeIntensity  = 0.9;
    this.hitShakeDuration   = 250;
    setTimeout(() => {
      const next = this.stageIdx + 1;
      if (next < this.stageList.length) this.startStage(next);
      else this.endGame();
    }, STAGE_FLASH_DUR * 1000);
  }

  private endGame(): void {
    this.stats.totalSec = this.sessionSec;
    this.audio.stopMusic();
    this.audio.sfxComplete();
    this.setPhase('complete');
    this.cb.onComplete?.(this.stats);
  }

  private setPhase(p: FlowGamePhase): void {
    this.phase = p;
    this.cb.onPhaseChange?.(p);
  }

  // ── 특수 모듈 트리거 ─────────────────────────────────────────────────────

  private triggerSprint(): void {
    this.sprintActive = SPRINT_DUR;
    this.audio.sfxSprint();
    // 강한 섬광 + 즉각적인 FOV 점프 + 쉐이크 (내부 직접 세팅)
    this.flashPulseValue    = 1.0;
    this.targetFov          = FOV_MAX;
    this.hitShakeRemaining  = 200;
    this.hitShakeIntensity  = 1.4;
    this.hitShakeDuration   = 200;
    this.showInstruction('가속!', 'text-cyan-300', 1400);
  }

  private triggerFreeze(): void {
    this.freezeActive = FREEZE_HOLD;
    this.audio.sfxFreeze();
    // 섬광 + 쉐이크 (내부 직접 세팅)
    this.flashPulseValue    = 0.85;
    this.hitShakeRemaining  = 300;
    this.hitShakeIntensity  = 1.0;
    this.hitShakeDuration   = 300;
    this.showInstruction('얼음!', 'text-sky-300', 2000);
  }

  // ── 게임 루프 ────────────────────────────────────────────────────────────

  private startLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.clock = new THREE.Clock();
    const animate = () => {
      this.rafId = requestAnimationFrame(animate);
      const rawDt = this.clock.getDelta();
      this.update(rawDt);
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.rafId = requestAnimationFrame(animate);
  }

  private update(rawDt: number): void {
    const dt      = Math.min(rawDt, 0.1);
    const dtM     = dt * this.motionScale;
    const dt60    = dt * 60;
    const dt60M   = dtM * 60;

    // AQ
    const tierBefore = this.aq.getTier();
    this.aq.update(dt);
    if (this.aq.getTier() !== tierBefore && this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, this.aq.getPixelRatioMax()));
    }

    if (this.stars) this.stars.rotation.y -= 0.00008 * dt60M;

    // 바다 파도 애니메이션
    if (this.oceanSurface || this.oceanBubbles) {
      this.oceanTime += dt;
      if (this.oceanSurface) {
        const pos = this.oceanSurface.geometry.attributes['position'] as THREE.BufferAttribute;
        const t   = this.oceanTime;
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i);
          const wz = pos.getZ(i);
          // 3중 사인파 → 자연스러운 불규칙 파도
          pos.setY(i,
            Math.sin(wx * 0.0020 + t * 1.15) * 28
            + Math.sin(wz * 0.0008 + t * 0.80) * 20
            + Math.sin(wx * 0.0042 + wz * 0.0028 + t * 1.55) * 11,
          );
        }
        pos.needsUpdate = true;
      }
      if (this.oceanBubbles) {
        const bp = this.oceanBubbles.geometry.attributes['position'] as THREE.BufferAttribute;
        for (let i = 0; i < bp.count; i++) {
          let y = bp.getY(i) + dt * (10 + (i % 6) * 4);
          if (y > 120) y = 5 + Math.random() * 15;
          bp.setY(i, y);
        }
        bp.needsUpdate = true;
      }
    }

    if (this.phase !== 'playing') {
      this.updateCamera(dtM, dt60M, 0, dt);
      return;
    }

    this.sessionSec += dt;
    this.gameTime   += dtM;

    const stage = this.stageList[this.stageIdx];
    if (!stage) return;

    this.stageTimer += dt;
    const remaining     = Math.max(0, stage.durationSec - this.stageTimer);
    const totalProgress = (this.stageIdx * stage.durationSec + this.stageTimer) /
      (this.stageList.length * stage.durationSec);
    this.cb.onTimerUpdate?.(remaining, Math.min(1, totalProgress));

    if (this.stageTimer >= stage.durationSec) { this.endStage(); return; }

    // ── 속도 계산 (원본: currentSpeed * 50 * dt60) ──────────────────────────
    const stageMult   = SPEED_MULTS[Math.min(this.stageIdx, SPEED_MULTS.length - 1)]!;
    // faster 모듈: 해당 스테이지 추가 속도 +15%
    const fasterMult  = this.activeModules.has('faster') ? 1.15 : 1.0;
    let speedScalar = 1.0;
    if (this.freezeActive > 0) speedScalar = 0;
    else if (this.sprintActive > 0) speedScalar = SPRINT_MULT;
    this.currentSpeed = BASE_SPEED * stageMult * fasterMult * speedScalar;
    const bridgeMove  = this.currentSpeed * 50 * dt60M;

    // ── 브릿지 이동·프룬 ────────────────────────────────────────────────────
    for (let i = this.bridges.length - 1; i >= 0; i--) {
      this.bridges[i].mesh.position.z += bridgeMove;
      if (this.bridges[i].mesh.position.z > BRIDGE_PRUNE_Z) {
        if (this.activeBridge === this.bridges[i]) this.activeBridge = null;
        const b = this.bridges[i].mesh;
        b.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => (mat as THREE.Material).dispose());
        });
        this.scene!.remove(b);
        this.bridges.splice(i, 1);
      }
    }
    if (this.bridges.length < 3) this.spawnBridge(false);

    // ── activeBridge 탐색 및 점프 트리거 (원본 로직 동일) ────────────────────
    let foundActive = false;
    this.isOnPad = false;

    const checkBridge = (b: BridgeObj) => {
      const frontZ       = b.mesh.position.z + BRIDGE_LENGTH / 2;
      const backZWithPad = b.mesh.position.z - BRIDGE_LENGTH / 2 - b.padDepth;
      if (frontZ > PLAYER_Z && backZWithPad < PLAYER_Z) {
        this.activeBridge = b;
        foundActive = true;
        const relZ = PLAYER_Z - b.mesh.position.z;
        this.isOnPad = relZ < PAD_START_REL;

        // 점프 트리거: PAD_TRIGGER_RATIO 기준
        if (
          relZ <= JUMP_TRIGGER_REL &&
          b.bridgeId !== this.lastJumpBridgeId
        ) {
          this.lastJumpBridgeId = b.bridgeId;
          // 다음 브릿지로 targetX 설정
          const nextIdx = this.bridges.indexOf(b) + 1;
          if (nextIdx < this.bridges.length) {
            const nextB = this.bridges[nextIdx];
            this.targetX = nextB.x;
            this.isChangingLane = b.lane !== nextB.lane;
          }
          this.triggerAutoJump();
        }
        return true;
      }
      return false;
    };

    if (this.activeBridge) {
      if (!checkBridge(this.activeBridge)) this.activeBridge = null;
      else foundActive = true;
    }
    if (!foundActive) {
      for (const b of this.bridges) {
        if (checkBridge(b)) break;
      }
    }

    this.isOnBridge = foundActive;
    this.groundY    = foundActive ? GROUND_Y : 0;

    // ── 장애물 업데이트 ────────────────────────────────────────────────────
    this.obstacles?.update(dt, PLAYER_Z);
    this.checkObstacleInstructions();

    // ── 점프 arc 업데이트 (원본 동일 곡선) ────────────────────────────────
    if (this.isJumping) {
      const elapsed = this.gameTime - this.jumpStartTime;
      this.jumpProgress = Math.min(elapsed / this.jumpDuration, 1.0);
      let curve = 0;
      if (this.jumpProgress < 0.6) {
        const t = this.jumpProgress / 0.6;
        curve = 1 - Math.pow(1 - t, 2);
      } else {
        const t = (this.jumpProgress - 0.6) / 0.4;
        curve = 1 - Math.pow(t, 3);
      }
      this.playerJumpY = Math.max(0, curve * this.jumpHeight);
      if (this.jumpProgress >= 1) {
        this.playerJumpY = 0;
        this.isJumping   = false;
        this.jumpProgress = 0;
        this.isChangingLane = false;
        this.landingStabilityTimer = 0.12;
        this.impactYTimer  = 0.05;
        this.impactZTimer  = 0.04;
        this.landingImpactY = LANDING_IMPACT_Y;
        this.landingImpactZ = LANDING_IMPACT_Z;
        this.audio.sfxLand();
      }
    }

    // ── 착지 임팩트 스프링 ────────────────────────────────────────────────
    if (this.landingStabilityTimer > 0) this.landingStabilityTimer -= dtM;

    if (this.impactYTimer > 0) {
      this.impactYTimer = Math.max(0, this.impactYTimer - dtM);
      this.landingImpactYVel += -this.landingImpactY * SPRING_K * dtM;
      this.landingImpactYVel *= Math.pow(SPRING_DAMPING, dt60M);
      this.landingImpactY    += this.landingImpactYVel * dtM;
    } else {
      this.landingImpactY    = 0;
      this.landingImpactYVel = 0;
    }

    if (this.impactZTimer > 0) {
      this.impactZTimer = Math.max(0, this.impactZTimer - dtM);
      this.landingImpactZVel += -this.landingImpactZ * SPRING_K * dtM;
      this.landingImpactZVel *= Math.pow(SPRING_DAMPING, dt60M);
      this.landingImpactZ    += this.landingImpactZVel * dtM;
    } else {
      this.landingImpactZ    = 0;
      this.landingImpactZVel = 0;
    }

    this.microJolt *= Math.exp(-JOLT_DECAY * dtM);

    // duck dip 회복
    this.duckDipOffset    += (0 - this.duckDipOffset) * 0.12 * dt60;
    this.duckPitchX       += (0 - this.duckPitchX)    * 0.15 * dt60;
    this.duckBounceOffset *= Math.pow(0.99, dt60);

    // ── 특수 모듈: sprint ─────────────────────────────────────────────────
    if (this.activeModules.has('sprint')) {
      if (this.sprintActive > 0) {
        this.sprintActive -= dt;
        if (this.sprintActive <= 0) {
          this.sprintActive     = 0;
          this.sprintCycle      = SPRINT_CYCLE;
          this.sprintGateWarned = false;
          this.sprintGateQueued = false;
          this.showInstruction('계속!', 'text-emerald-400', 600);
        }
        this.flashPulseValue = Math.min(1, this.flashPulseValue + 0.04 * dt60);
      } else {
        this.sprintCycle -= dt;
        // 임계값 6초: 게이트가 기존 브릿지에 즉시 부착되면 ~2-3초 후 도달 → 사이클 안에 확실히 통과
        if (!this.sprintGateWarned && this.sprintCycle <= 6) {
          this.sprintGateWarned = true;
          this.sprintGateQueued = true;
          this.showInstruction('링 통과!', 'text-cyan-400', 1200);
        }
        if (this.sprintCycle <= 0) {
          this.sprintCycle      = SPRINT_CYCLE;
          this.sprintGateWarned = false;
          this.sprintGateQueued = false;
        }
      }
    }

    // ── 특수 모듈: freeze ─────────────────────────────────────────────────
    if (this.activeModules.has('freeze')) {
      if (this.freezeActive > 0) {
        this.freezeActive -= dt;
        if (this.freezeActive <= 0) {
          this.freezeActive     = 0;
          this.freezeCycle      = FREEZE_MIN + Math.random() * (FREEZE_MAX - FREEZE_MIN);
          this.freezeSignWarned = false;
          this.freezeWallQueued = false;
          this.showInstruction('계속!', 'text-emerald-400', 600);
        }
      } else {
        this.freezeCycle -= dt;
        // 임계값 7초로 상향
        if (!this.freezeSignWarned && this.freezeCycle <= 7) {
          this.freezeSignWarned = true;
          this.freezeWallQueued = true;
          this.showInstruction('벽 접근!', 'text-sky-300', 1200);
        }
        if (this.freezeCycle <= 0) {
          this.freezeCycle      = FREEZE_MIN + Math.random() * (FREEZE_MAX - FREEZE_MIN);
          this.freezeSignWarned = false;
          this.freezeWallQueued = false;
        }
      }
    }

    // ── 큐된 게이트·벽 즉시 부착 (신규 브릿지 대기 없이 기존 브릿지에 부착) ──
    this.tryAttachQueuedObstacles();

    // ── 특수 모듈: balance ────────────────────────────────────────────────
    if (this.activeModules.has('balance')) {
      if (this.balanceActive > 0) {
        this.balanceActive -= dt;
        if (this.balanceActive <= 0) {
          this.balanceActive = 0;
          this.balanceCycle  = BALANCE_MIN + Math.random() * (BALANCE_MAX - BALANCE_MIN);
        }
      } else {
        this.balanceCycle -= dt;
        if (this.balanceCycle <= 0) {
          const foot = Math.random() < 0.5 ? 'left' : 'right';
          // onBalanceCue → FlowGameClient 하단 패널 표시 (showInstruction 중복 제거)
          this.cb.onBalanceCue?.(foot);
          this.balanceActive = 2.5;
        }
      }
    }

    // ── 스피드라인 opacity ────────────────────────────────────────────────
    if (this.speedLines) {
      const lvOpacity = 0.20 + this.stageIdx * 0.045;
      const targetOp  = Math.min(0.65, lvOpacity);
      this.speedLines.children.forEach((l) => {
        const m   = l as THREE.Mesh;
        m.position.z += (SPEEDLINE_BASE_SPEED + this.stageIdx * SPEEDLINE_LEVEL_MULT) * dt60M;
        if (m.position.z > 2500) m.position.z = -12000;
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity += (targetOp - mat.opacity) * 0.15 * dt60M;
      });
    }

    // flash 감쇠
    this.flashPulseValue *= Math.pow(0.80, dt60);
    if (this.flashOverlay) this.flashOverlay.style.opacity = String(Math.max(0, this.flashPulseValue));

    this.updateCamera(dtM, dt60M, this.currentSpeed, dt);
  }

  // ── 자동 점프 ────────────────────────────────────────────────────────────

  private triggerAutoJump(): void {
    if (this.isJumping) return;
    this.isJumping     = true;
    this.jumpProgress  = 0;
    this.jumpStartTime = this.gameTime;
    this.microJolt    += MICROJOLT_AMOUNT;
    this.audio.sfxJump();
    if (this.activeModules.has('bigJump')) {
      this.showInstruction('크게 점프!', 'text-orange-300', 1000);
    } else if (this.activeModules.has('jump')) {
      this.showInstruction('점프!', 'text-yellow-300', 700);
    }
  }

  // 어드밴스 경고는 ObstacleManager.onBoxWarn 으로 이관됨
  private checkObstacleInstructions(): void { /* no-op */ }

  /**
   * 큐된 게이트·벽을 신규 브릿지 스폰 대기 없이, 현재 씬의 브릿지 중
   * 플레이어로부터 가장 가까운 "앞"(Z 작은쪽) 브릿지에 즉시 부착.
   * → 경고 후 2~4초 내 게이트/벽이 플레이어에 도달하도록 보장.
   */
  private tryAttachQueuedObstacles(): void {
    if (!this.obstacles) return;

    if (this.sprintGateQueued && !this.obstacles.hasSprintGate()) {
      const target = this.findGateBridge();
      if (target) {
        this.obstacles.attachSprintGate(target);
        this.sprintGateQueued = false;
      }
    }

    if (this.freezeWallQueued && !this.obstacles.hasFreezeWall()) {
      const target = this.findGateBridge();
      if (target) {
        this.obstacles.attachFreezeWall(target);
        this.freezeWallQueued = false;
      }
    }
  }

  /** 게이트 부착 대상: 아직 플레이어 앞에 있고 가장 가까운 브릿지 */
  private findGateBridge(): BridgeObj | null {
    let best: BridgeObj | null = null;
    let bestDist = Infinity;
    for (const b of this.bridges) {
      // 게이트 월드 Z = bridge.z - BRIDGE_LENGTH*0.3
      const gateZ = b.mesh.position.z - BRIDGE_LENGTH * 0.3;
      // 플레이어보다 앞(낮은 Z), 너무 멀지 않은 범위
      if (gateZ < PLAYER_Z - 80 && gateZ > -20000) {
        const dist = PLAYER_Z - gateZ;
        if (dist < bestDist) { bestDist = dist; best = b; }
      }
    }
    return best;
  }

  // ── 카메라 업데이트 (원본 updateCamera 이식) ──────────────────────────────

  private updateCamera(dtM: number, dt60M: number, speed: number, dtWall: number): void {
    if (!this.camera) return;

    // X 래그 (원본 CAMERA_LAG_SPEED=6.32)
    if (this.isJumping) {
      this.visualX += (this.targetX - this.visualX) * (1 - Math.exp(-CAMERA_LAG_SPEED * dtM));
    } else {
      this.visualX = this.activeBridge ? this.activeBridge.x : this.visualX;
    }
    this.cameraLagX += (this.visualX - this.cameraLagX) * (1 - Math.exp(-CAMERA_LAG_SPEED * dtM));

    // Run bob (원본 동일 수치: amp=1.2, alpha=0.4)
    let yOffsetRaw = 0;
    const alphaBob = 1 - Math.pow(1 - RUNBOB_ALPHA, dt60M);
    if (this.isOnBridge && this.phase === 'playing') {
      const bobScale = (this.landingStabilityTimer > 0) ? 0 :
                       (this.isJumping || this.isOnPad) ? 0.4 : 1;
      yOffsetRaw = Math.sin(this.gameTime * RUN_BOB_FREQ) * RUN_BOB_AMP * bobScale;
    }
    this.camYBob += (yOffsetRaw - this.camYBob) * alphaBob;

    // Z offset: 점프 초반 살짝 당김 (원본 동일)
    let zOffset = 0;
    if (this.isJumping) {
      if (this.jumpProgress < 0.1)        zOffset = (this.jumpProgress / 0.1) * -15;
      else if (this.jumpProgress < 0.2)   zOffset = (1 - (this.jumpProgress - 0.1) / 0.1) * -15;
    }

    // camYBase smooth (원본 alpha=0.15)
    const joltY = this.microJolt * 1.8;
    const joltZ = this.microJolt * -4.2;
    const targetCamY =
      CAMERA_BASE_HEIGHT +
      this.groundY +
      this.playerJumpY +
      this.landingImpactY +
      joltY +
      this.duckDipOffset +
      this.duckBounceOffset;

    const alphaBase = 1 - Math.pow(1 - RUNBOB_ALPHA_BASE, dt60M);
    this.camYBase += (targetCamY - this.camYBase) * alphaBase;

    this.camera.position.x = this.cameraLagX;
    this.camera.position.y = this.camYBase + this.camYBob;
    this.camera.position.z = CAMERA_BASE_Z + zOffset + this.landingImpactZ + joltZ;

    // 히트 쉐이크
    if (this.hitShakeRemaining > 0) {
      const ratio = this.hitShakeRemaining / Math.max(1, this.hitShakeDuration);
      const amp   = this.hitShakeIntensity * ratio * 18;
      this.camera.position.x += (Math.random() - 0.5) * 2 * amp;
      this.camera.position.y += (Math.random() - 0.5) * 2 * amp;
      this.hitShakeRemaining -= dtWall * 1000;
      if (this.hitShakeRemaining <= 0) this.hitShakeRemaining = 0;
    }

    // 고속 카메라 흔들림 (원본 동일)
    if (speed > HIGH_SPEED_SHAKE_THRESHOLD) {
      const range  = Math.max(0.0001, FOV_SPEED_MAX - HIGH_SPEED_SHAKE_THRESHOLD);
      const ratio  = Math.min(1, (speed - HIGH_SPEED_SHAKE_THRESHOLD) / range);
      const t      = this.gameTime;
      this.camera.position.x += Math.sin(t * HIGH_SPEED_SHAKE_FREQ_X) * Math.sin(t * HIGH_SPEED_SHAKE_FREQ_X * 0.37) * HIGH_SPEED_SHAKE_X_AMP * ratio;
      this.camera.position.y += Math.sin(t * HIGH_SPEED_SHAKE_FREQ_Y) * Math.sin(t * HIGH_SPEED_SHAKE_FREQ_Y * 0.53) * HIGH_SPEED_SHAKE_Y_AMP * ratio;
    }

    // FOV (원본 동일)
    const speedRange = Math.max(0.0001, FOV_SPEED_MAX - FOV_SPEED_MIN);
    const speedRatio = Math.min(1, Math.max(0, (speed - FOV_SPEED_MIN) / speedRange));
    this.targetFov = FOV_MIN + (FOV_MAX - FOV_MIN) * speedRatio;
    if (Math.abs(this.currentFov - this.targetFov) > 0.02) {
      this.currentFov += (this.targetFov - this.currentFov) * 0.06 * dt60M;
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // 레인 전환 기울기
    let targetTilt = 0;
    if (!this.isOnPad && this.isChangingLane && this.isJumping) {
      if (this.jumpProgress < 0.15) targetTilt = this.targetX > this.visualX ? -0.05 : 0.05;
    }
    if (this.landingShake !== 0) {
      targetTilt += this.landingShake;
      this.landingShake *= Math.pow(0.85, dt60M);
      if (Math.abs(this.landingShake) < 0.001) this.landingShake = 0;
    }
    this.cameraTiltZ += (targetTilt - this.cameraTiltZ) * (1 - Math.exp(-10 * dtM));
    this.camera.rotation.z = this.cameraTiltZ;
    this.camera.rotation.x = this.duckPitchX;

    this.camera.lookAt(this.cameraLagX, this.groundY + 45, -1500);
  }

  // ── resize ───────────────────────────────────────────────────────────────

  resize(w: number, h: number): void {
    if (!this.renderer || !this.camera) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ── 유틸 ─────────────────────────────────────────────────────────────────

  private showInstruction(text: string, colorClass: string, ms: number): void {
    this.cb.onInstruction?.(text, colorClass, ms);
  }

  getPhase(): FlowGamePhase { return this.phase; }

  // ── 시작 / 종료 ──────────────────────────────────────────────────────────

  start(): void { this.startLoop(); }

  /** BGM 리스트가 늦게 로딩됐을 때 — init 이후 외부에서 호출 */
  async loadBgmLate(storagePath: string): Promise<void> {
    await this.audio.loadBgm(storagePath);
    if (this.phase === 'playing') this.audio.startMusic();
  }

  stop(): void {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
    if (this.countdownTimer) { clearTimeout(this.countdownTimer); this.countdownTimer = null; }
    this.audio.stopMusic();
  }

  dispose(): void {
    this.stop();
    this.audio.dispose();
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    if (this.scene) {
      this.scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => (m as THREE.Material).dispose());
        }
      });
      this.scene = null;
    }
    this.bridges = [];
  }
}
