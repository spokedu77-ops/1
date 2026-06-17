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

// 레인 색상: 레인 구분용 — 브릿지 상판은 항상 파랑으로 고정
const LANE_COLORS: [number, number, number] = [0x22c55e, 0xef4444, 0xfbbf24];
const LANE_WIDTH         = 80;
const BRIDGE_LENGTH      = 4200;
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
const PAD_START_REL    = -(BRIDGE_LENGTH / 2);                         // -1750
const JUMP_TRIGGER_REL = PAD_START_REL - PAD_DEPTH * PAD_TRIGGER_RATIO; // -1880

// 속도 (원본: currentSpeed * 50 * dt60)
const BASE_SPEED = 0.6;
// 스테이지별 배수 (원본 LV1=0.8, LV2+=1.0, LV4+=1.25 참조)
const SPEED_MULTS: number[] = [0.8, 1.0, 1.0, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25];

// 점프 파라미터 (원본 동일)
const JUMP_HEIGHT      = 98;
const MINI_JUMP_HEIGHT = 72;   // 점프 높이 기준값
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

// 펀치 벽 타격 시퀀스
const WALL_BREAK_INTERVAL = 0.32; // 타격 간격 (초)

// 테마 (레인 색상은 LANE_COLORS로 통일, fog 색상이 하늘·수평선 색 결정)
const THEMES: Record<string, {
  bg: number; fog: number; fogNear: number; fogFar: number;
  ambientInt: number; pointColor: number;
}> = {
  default: { bg: 0x000814, fog: 0x000814, fogNear: 500, fogFar: 3200, ambientInt: 0.7,  pointColor: 0x3b82f6 },
  space:   { bg: 0x0c0030, fog: 0x090022, fogNear: 400, fogFar: 3500, ambientInt: 0.6,  pointColor: 0xb06ef7 },
  neon:    { bg: 0x001508, fog: 0x000d05, fogNear: 400, fogFar: 3500, ambientInt: 0.5,  pointColor: 0x00ff88 },
  // ocean: bg·fog를 동일한 바다 파란색 → 멀리 보이는 하늘·수평선이 전부 파랗게 채워짐
  ocean:   { bg: 0x1565a0, fog: 0x1565a0, fogNear: 150, fogFar: 2800, ambientInt: 0.85, pointColor: 0x7dd3fc },
};

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type FlowGamePhase = 'idle' | 'countdown' | 'stage-intro' | 'playing' | 'complete';

export interface FlowEngineCallbacks {
  onPhaseChange:  (phase: FlowGamePhase) => void;
  onCountdown:    (n: number) => void;
  onStageChange:  (stageIndex: number) => void;
  onTimerUpdate:  (remainingSec: number, totalProgress: number) => void;
  onInstruction:  (text: string, colorClass: string, ms: number, priority?: number) => void;
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
  bgImageUrl?:  string; // 배경 이미지 URL (일반 JPG/PNG)
}

interface BridgeObj extends FlowBridge {
  padDepth:         number;
  instructionFired: boolean;
  preJumpFired:     boolean;
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
  private lastTickMs = -1;
  private rafId      = 0;
  private oceanFrameIdx = 0;

  private audio = new FlowAudio();
  private aq    = new AdaptiveQuality();
  private obstacles: ObstacleManager | null = null;

  private bridges:      BridgeObj[] = [];
  private activeBridge: BridgeObj | null = null;
  private lastJumpBridgeId = -1;
  private bridgeIdCnt      = 0;
  private bridgeLaneIdx    = 0; // 빨강(1)→노랑(2)→초록(0) 순환
  // 브릿지 레인 순서: 빨강(center=1) → 노랑(right=2) → 초록(left=0)
  private static readonly BRIDGE_LANE_SEQ = [1, 2, 0] as const;

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

  // ── duck ──────────────────────────────────────────────────────────────────
  private duckDipOffset    = 0;
  private duckBounceOffset = 0;
  private duckPitchX       = 0;
  private duckHold         = false; // UFO 통과 전까지 딥 유지

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
  private currentSpeed     = 0;
  // 펀치 벽 타격 시퀀스
  private wallBreakActive  = false;
  private wallBreakHits    = 0;
  private wallBreakTimer   = 0;
  private jumpInstrCooldown = 0;
  private isBonus = false; // 보너스 스테이지 여부

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
    // startCountdown은 start()에서 — 렌더 루프 시작 후 호출해야 blank screen 없음
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
    if ((this.opts.colorTheme ?? 'default') === 'ocean')   this.buildOceanEnvironment();
    if ((this.opts.colorTheme ?? 'default') === 'default') this.buildDefaultAtmosphere();
    this.buildSpeedLines();
    this.createTrackLanes();

    this.obstacles = new ObstacleManager(this.scene, BRIDGE_LENGTH, {
      onBoxHit:           () => {},
      onBoxWarn:          (isReach: boolean) => {
        if (!this.isBonus && !isReach && this.activeModules.has('punch')) {
          this.showInstruction('펀치!', '#ff4400', 550, 2);
        }
      },
      onUfoWarn:          () => {
        if (!this.isBonus && this.activeModules.has('duck')) {
          this.showInstruction('숙여!', '#ffdd00', 550, 2);
        }
      },
      onUfoDuckStart:     () => {
        if (!this.activeModules.has('duck')) return;
        this.duckDipOffset = -120;
        this.duckPitchX    = 0.70;
        this.duckHold      = true;
      },
      onUfoPassed:        () => {
        this.duckHold         = false;
        this.duckBounceOffset = 90;
        this.duckPitchX       = -0.18;
        this.audio.sfxLand();
      },
      onPunchWallEnter:   () => {
        // 펀치 벽 진입 — FlowEngine이 타격 시퀀스 시작
        if (!this.activeModules.has('reach')) return;
        this.wallBreakActive = true;
        this.wallBreakHits   = 0;
        this.wallBreakTimer  = WALL_BREAK_INTERVAL;
      },
      onBoxAutoHit:       (isReach: boolean) => {
        this.microJolt += 0.65;
        this.audio.sfxPunch();
        if (isReach && this.activeModules.has('reach')) {
          this.hitShakeRemaining = 220;
          this.hitShakeIntensity = 1.2;
          this.hitShakeDuration  = 220;
        }
      },
      onCameraShake:      (int, ms) => {
        this.hitShakeRemaining = ms;
        this.hitShakeIntensity = int;
        this.hitShakeDuration  = ms;
      },
      onFlash:            () => { this.flashPulseValue = Math.min(1, this.flashPulseValue + 0.75); },
      getShardScale:      () => this.aq.getShardScale(),
    });

    for (let i = 0; i < 3; i++) this.spawnBridge(i === 0);

    // 배경 이미지 로드
    if (this.opts.bgImageUrl) {
      new THREE.TextureLoader().load(this.opts.bgImageUrl, (tex) => {
        if (this.scene) this.scene.background = tex;
      });
    }
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
    // 구분선 제거 — 흰 선이 배경에서 계속 보이는 문제
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

  // ── default 테마 대기 이펙트 ─────────────────────────────────────────────

  private buildDefaultAtmosphere(): void { /* 제거 — 배경 이미지 없을 때 기본 검정만 */ }

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
    let spawnZ: number;
    if (isFirst) {
      spawnZ = PLAYER_Z;
    } else if (this.bridges.length > 0) {
      const last = this.bridges[this.bridges.length - 1];
      spawnZ = last.mesh.position.z - (BRIDGE_LENGTH + PAD_DEPTH + BRIDGE_GAP);
    } else {
      spawnZ = -8000;
    }

    const randLane    = FlowEngine.BRIDGE_LANE_SEQ[this.bridgeLaneIdx % 3]!;
    this.bridgeLaneIdx++;
    const bridgeColor = LANE_COLORS[randLane]!;
    const g           = new THREE.Group();

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 5, 8, BRIDGE_LENGTH),
      new THREE.MeshBasicMaterial({ color: bridgeColor }), // 빨강→노랑→초록 순환
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
      preJumpFired: false,
    };
    this.bridges.push(bridgeObj);

    const stage = this.stageList[this.stageIdx];
    if (!isFirst && this.obstacles && stage) {
      const am       = stage.activeModules;
      const hasPunch = am.has('punch') || am.has('reach');
      const hasDuck  = am.has('duck');

      // ── 장애물: 보너스는 33% 각 타입, 일반은 80% 하나 ───────────────────
      if (this.isBonus) {
        const r = Math.random();
        if (r < 0.33 && hasDuck && !this.obstacles.hasActiveUfo()) {
          this.obstacles.attachUfo(bridgeObj);
        } else if (r < 0.66 && hasPunch && !this.obstacles.hasActiveBox()) {
          this.obstacles.attachBox(bridgeObj, am);
        }
      } else if (Math.random() < 0.80) {
        if (hasPunch && hasDuck) {
          // 두 모듈 모두 활성: 50/50으로 하나 선택
          if (Math.random() < 0.5) {
            if (!this.obstacles.hasActiveBox()) this.obstacles.attachBox(bridgeObj, am);
          } else {
            if (!this.obstacles.hasActiveUfo()) this.obstacles.attachUfo(bridgeObj);
          }
        } else if (hasPunch && !this.obstacles.hasActiveBox()) {
          this.obstacles.attachBox(bridgeObj, am);
        } else if (hasDuck && !this.obstacles.hasActiveUfo()) {
          this.obstacles.attachUfo(bridgeObj);
        }
      }

    }
  }

  // ── 카운트다운 ───────────────────────────────────────────────────────────

  private startCountdown(): void {
    this.setPhase('countdown');
    let n = 3;
    const tick = () => {
      this.cb.onCountdown?.(n);
      if (n <= 0) {
        this.setPhase('playing');
        this.audio.resume().then(() => this.audio.startMusic());
        this.startStage(0);
        return;
      }
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
    this.isBonus       = stage.isBonus;
    this.stageTimer    = 0;
    this.jumpHeight    = JUMP_HEIGHT;
    this.jumpDuration  = JUMP_DURATIONS[Math.min(idx, JUMP_DURATIONS.length - 1)]!;
    this.resetSpecialTimers();
    this.obstacles?.clearAll();
    for (const b of this.bridges) { b.hasBox = false; b.instructionFired = false; b.preJumpFired = false; }
    this.bridgeLaneIdx = 0; // 스테이지마다 빨강부터 다시 시작
    this.activeBridge = null;
    // lastJumpBridgeId 유지 → phantom jump 방지
    this.cb.onStageChange?.(idx);
    // 스테이지 0은 카운트다운 후 already-playing. 1+부터 3초 인트로
    if (idx > 0) {
      this.setPhase('stage-intro');
      this.countdownTimer = setTimeout(() => this.setPhase('playing'), 3000);
    }
  }

  private resetSpecialTimers(): void {
    this.wallBreakActive  = false;
    this.wallBreakHits    = 0;
    this.wallBreakTimer   = 0;
    this.duckHold         = false;
    this.duckDipOffset    = 0;
    this.duckPitchX       = 0;
    this.duckBounceOffset = 0;
    this.jumpInstrCooldown = 0;
    this.isJumping    = false;
    this.jumpProgress = 0;
    this.playerJumpY  = 0;
  }

  private endStage(): void {
    this.stats.stagesCompleted++;
    this.audio.sfxStageUp();
    this.flashPulseValue   = 1.0;
    this.hitShakeRemaining = 250;
    this.hitShakeIntensity = 0.9;
    this.hitShakeDuration  = 250;
    const next = this.stageIdx + 1;
    if (next < this.stageList.length) this.startStage(next);
    else this.endGame();
  }

  private endGame(): void {
    this.stats.totalSec = this.sessionSec;
    this.audio.stopMusic();
    this.audio.sfxComplete();
    this.setPhase('complete');
    this.cb.onComplete?.(this.stats);
    this.spawnCompleteEffect();
  }

  private spawnCompleteEffect(): void {
    if (!this.obstacles) return;
    // 카메라 앞 가운데에서 축하 파티클 3연속 버스트
    const base = new THREE.Vector3(0, 120, PLAYER_Z - 150);
    this.obstacles.spawnShards(base, 200, true);
    setTimeout(() => {
      const left  = new THREE.Vector3(-160, 90, PLAYER_Z - 200);
      const right = new THREE.Vector3( 160, 90, PLAYER_Z - 200);
      this.obstacles?.spawnShards(left,  120, true);
      this.obstacles?.spawnShards(right, 120, true);
    }, 220);
    setTimeout(() => {
      this.obstacles?.spawnShards(new THREE.Vector3(0, 160, PLAYER_Z - 180), 160, true);
    }, 480);
  }

  private setPhase(p: FlowGamePhase): void {
    this.phase = p;
    this.cb.onPhaseChange?.(p);
  }

  // ── 특수 모듈 트리거 ─────────────────────────────────────────────────────

  // ── 게임 루프 ────────────────────────────────────────────────────────────

  private startLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.lastTickMs = -1;
    const animate = (now: number) => {
      this.rafId = requestAnimationFrame(animate);
      if (this.lastTickMs < 0) { this.lastTickMs = now; return; }
      const rawDt = (now - this.lastTickMs) / 1000;
      // 120/144hz 제한: tier별 최소 간격 미달이면 스킵
      const minInterval = this.aq.getTier() === 'LOW' ? 1 / 30 : 1 / 60;
      if (rawDt < minInterval - 0.001) return;
      this.lastTickMs = now;
      this.update(Math.min(rawDt, 0.1));
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
      // 꼭짓점 계산 — tier에 따라 N프레임마다 1회
      if (this.oceanSurface && this.aq.shouldUpdateOcean(this.oceanFrameIdx)) {
        const pos = this.oceanSurface.geometry.attributes['position'] as THREE.BufferAttribute;
        const t   = this.oceanTime;
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i);
          const wz = pos.getZ(i);
          pos.setY(i,
            Math.sin(wx * 0.0020 + t * 1.15) * 28
            + Math.sin(wz * 0.0008 + t * 0.80) * 20
            + Math.sin(wx * 0.0042 + wz * 0.0028 + t * 1.55) * 11,
          );
        }
        pos.needsUpdate = true;
      }
      this.oceanFrameIdx++;
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
    if (this.jumpInstrCooldown > 0) this.jumpInstrCooldown = Math.max(0, this.jumpInstrCooldown - dt);
    const remaining     = Math.max(0, stage.durationSec - this.stageTimer);
    const totalProgress = (this.stageIdx * stage.durationSec + this.stageTimer) /
      (this.stageList.length * stage.durationSec);
    this.cb.onTimerUpdate?.(remaining, Math.min(1, totalProgress));

    if (this.stageTimer >= stage.durationSec) { this.endStage(); return; }

    // ── 속도 계산 (원본: currentSpeed * 50 * dt60) ──────────────────────────
    const stageMult   = SPEED_MULTS[Math.min(this.stageIdx, SPEED_MULTS.length - 1)]!;
    // faster 모듈: 해당 스테이지 추가 속도 +15%
    const fasterMult  = this.activeModules.has('faster') ? 1.15 : 1.0;
    let speedScalar = this.wallBreakActive ? 0.0 : 1.0;
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

        // 점프 트리거 — isJumping 체크를 여기서도 (checkBridge 두 번 호출 가능 경로 방어)
        if (
          relZ <= JUMP_TRIGGER_REL &&
          b.bridgeId !== this.lastJumpBridgeId &&
          !this.isJumping
        ) {
          this.lastJumpBridgeId = b.bridgeId;
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
        const isMini = this.jumpHeight === MINI_JUMP_HEIGHT;
        this.playerJumpY = 0;
        this.isJumping   = false;
        this.jumpProgress = 0;
        this.isChangingLane = false;
        this.landingStabilityTimer = isMini ? 0.06 : 0.12;
        this.impactYTimer  = isMini ? 0.04 : 0.05;
        this.impactZTimer  = isMini ? 0.03 : 0.04;
        this.landingImpactY = isMini ? LANDING_IMPACT_Y * 1.4 : LANDING_IMPACT_Y;
        this.landingImpactZ = isMini ? LANDING_IMPACT_Z * 1.4 : LANDING_IMPACT_Z;
        // 미니점프 착지 — 강한 지면 충격
        if (isMini) {
          this.microJolt          += 1.0;
          this.flashPulseValue     = Math.min(1, this.flashPulseValue + 0.45);
          this.hitShakeRemaining   = 220;
          this.hitShakeIntensity   = 1.2;
          this.hitShakeDuration    = 220;
        }
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

    // duck dip 회복 — UFO 통과 전까지 홀드, 통과 후 천천히 회복
    if (!this.duckHold) {
      this.duckDipOffset += (0 - this.duckDipOffset) * 0.038 * dt60;
      this.duckPitchX    += (0 - this.duckPitchX)    * 0.042 * dt60;
    }
    this.duckBounceOffset *= Math.pow(0.985, dt60);

    // ── 펀치 벽 타격 시퀀스 ───────────────────────────────────────────────
    if (this.wallBreakActive) {
      this.wallBreakTimer -= dt;
      if (this.wallBreakTimer <= 0) {
        this.wallBreakHits++;
        const done = this.obstacles?.hitPunchWall() ?? true;
        this.microJolt += 0.55;
        this.audio.sfxPunch();
        this.hitShakeRemaining = 130;
        this.hitShakeIntensity = 0.75 + this.wallBreakHits * 0.1;
        this.hitShakeDuration  = 130;
        if (!this.isBonus) this.showInstruction('두드려!', '#ffaa00', 280, 2);
        if (done) {
          this.wallBreakActive = false;
          this.wallBreakHits   = 0;
          this.obstacles?.breakPunchWall();
          this.flashPulseValue   = 1.0;
          this.hitShakeRemaining = 300;
          this.hitShakeIntensity = 1.5;
          this.hitShakeDuration  = 300;
          if (!this.isBonus) this.showInstruction('부숴!', '#ff6600', 900, 3);
        } else {
          this.wallBreakTimer = WALL_BREAK_INTERVAL;
        }
      }
    }

    // ── 스피드라인 opacity — 실제 속도에 비례, 속도 0이면 완전 투명 ────────
    if (this.speedLines) {
      // 최대 속도 대비 현재 속도 비율 → 0이면 완전 숨김
      const maxSpeed  = BASE_SPEED * 1.25;
      const speedRatio = Math.max(0, (this.currentSpeed - 0.05) / maxSpeed);
      const targetOp  = speedRatio * Math.min(0.65, 0.20 + this.stageIdx * 0.045);
      const children  = this.speedLines.children;
      for (let i = 0; i < children.length; i++) {
        const m   = children[i] as THREE.Mesh;
        const mat = m.material as THREE.MeshBasicMaterial;
        if (!this.aq.isSpeedLineActive(i)) {
          if (mat.opacity > 0) mat.opacity = 0;
          continue;
        }
        m.position.z += (SPEEDLINE_BASE_SPEED + this.stageIdx * SPEEDLINE_LEVEL_MULT) * dt60M;
        if (m.position.z > 2500) m.position.z = -12000;
        mat.opacity += (targetOp - mat.opacity) * 0.15 * dt60M;
      }
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
    this.jumpHeight    = JUMP_HEIGHT;
    this.jumpDuration  = JUMP_DURATIONS[Math.min(this.stageIdx, JUMP_DURATIONS.length - 1)]!;
    this.microJolt    += MICROJOLT_AMOUNT;
    this.audio.sfxJump();
    if (this.jumpInstrCooldown <= 0 && !this.isBonus) {
      this.showInstruction('점프!', '#ffffff', 700, 1);
      this.jumpInstrCooldown = 3.0;
    }
  }

  // 어드밴스 경고는 ObstacleManager.onBoxWarn 으로 이관됨
  private checkObstacleInstructions(): void { /* no-op */ }

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

  private showInstruction(text: string, colorClass: string, ms: number, priority = 1): void {
    this.cb.onInstruction?.(text, colorClass, ms, priority);
  }

  getPhase(): FlowGamePhase { return this.phase; }

  // ── 시작 / 종료 ──────────────────────────────────────────────────────────

  start(): void { this.startLoop(); this.startCountdown(); }

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
