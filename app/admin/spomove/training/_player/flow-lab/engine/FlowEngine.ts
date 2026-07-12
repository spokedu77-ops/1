/**
 * Flow 2.0 — 메인 엔진 (원본 iiwarmup/flow 수치 완전 이식)
 *
 * 속도: BASE_SPEED=0.6 × 50 × dt60 = ~1800 units/sec (원본 동일)
 * 점프: PAD_TRIGGER_RATIO=0.65 → bridge.z >= 2280 에서 발동 (원본 동일)
 * 카메라 bob: amp 1.2 유닛, alpha 스무딩 (원본 동일)
 * 파란 바닥 + 3색 레인: createTrackLanes (원본 동일)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FlowCamera, type FlowCameraUpdateInput } from './FlowCamera';
import { FlowAudio } from './FlowAudio';
import { AdaptiveQuality } from './AdaptiveQuality';
import { ObstacleManager } from './entities/ObstacleManager';
import { ColorGateManager, COLOR_GATE_LOCAL_Z } from './entities/ColorGateManager';
import type { FlowBridge } from './entities/ObstacleManager';
import {
  BridgeRenderer,
  type BridgeVisual,
  LANE_WIDTH,
  BRIDGE_LENGTH,
  PAD_DEPTH,
  LANE_COLORS,
} from './renderers/BridgeRenderer';
import type { FlowStageConfig } from './modules/stageBuilder';
import type { FlowModuleKey } from './modules/flowModules';
import {
  generateObstacleSchedule,
  countReachInSchedule,
  type ObstacleSlot,
} from './modules/flowObstacleSchedule';
import { SpaceEnvironment } from './renderers/SpaceEnvironment';
import { SpeedVFX } from './renderers/SpeedVFX';
import { ColoredSpeedLines } from './renderers/ColoredSpeedLines';
import { DecorativeAsteroids } from './renderers/DecorativeAsteroids';
import { PunchVFX } from './renderers/PunchVFX';
import { ArenaRenderer } from './renderers/ArenaRenderer';
import { PostProcessingRenderer } from './renderers/PostProcessingRenderer';
import { staticPerfTier } from '../../lib/reactTrainPerf';
import {
  pickRandomGateColor,
  preloadColorGatePoseImages,
  shouldSpawnColorGateOnBridgeAttempt,
  type GateColorId,
} from './modules/colorGateGuides';

// ─── 상수 (원본 coordContract 완전 동일) ────────────────────────────────────

// LANE_WIDTH, BRIDGE_LENGTH, PAD_DEPTH, LANE_COLORS → BridgeRenderer에서 import
const BRIDGE_GAP  = 450;
const PLAYER_Z    = 400;
const GROUND_Y           = 30;
const PAD_TRIGGER_RATIO  = 0.65;

// 점프 트리거: relZ = PLAYER_Z - bridge.z <= padStartRel - PAD_DEPTH * PAD_TRIGGER_RATIO
// = -1750 - 130 = -1880  →  bridge.z >= PLAYER_Z + 1880 = 2280
const PAD_START_REL    = -(BRIDGE_LENGTH / 2);                         // -1750
const JUMP_TRIGGER_REL = PAD_START_REL - PAD_DEPTH * PAD_TRIGGER_RATIO; // -1880

// 속도 (원본: currentSpeed * 50 * dt60)
const BASE_SPEED = 0.6;
// 스테이지별 배수 (원본 LV1=0.8, LV2+=1.0, LV4+=1.25 참조)
const SPEED_MULTS: number[] = [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8];

// 점프 파라미터 (원본 동일)
const JUMP_HEIGHT      = 98;
const MINI_JUMP_HEIGHT = 72;   // 점프 높이 기준값
// 점프 지속 시간 by 스테이지 (원본 LV1=0.72, LV2=0.70, LV3+=0.64 근사)
const JUMP_DURATIONS: number[] = [0.72, 0.70, 0.64, 0.62, 0.62, 0.62, 0.62, 0.62, 0.62];

// 점프 착지 졸트 (FlowCamera에 전달하는 값)
const MICROJOLT_AMOUNT  = 0.65;
const PUNCH_VFX_Y       = 52;  // 레인 위 펀치 (낮음)
const KICK_VFX_Y        = 102;  // 가슴~어깨 높이 킥

// 스피드라인
const SPEEDLINE_COUNT      = 250;

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

export type FlowGamePhase = 'idle' | 'countdown' | 'stage-intro' | 'speed-intro' | 'playing' | 'complete';

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
  /** 색 관문 스테이지 시작 (색은 onColorGateColor로 문과 동기화) */
  onColorGateStage?: (info: {
    action: FlowModuleKey;
    step: number;
    total: number;
  }) => void;
  /** 가장 가까운 관문 색 — 문마다 갱신 (null이면 HUD 숨김) */
  onColorGateColor?: (gateColorId: GateColorId | null) => void;
}

export interface FlowStats {
  stagesCompleted: number;
  totalSec:        number;
}

export interface FlowEngineOptions {
  stages:            FlowStageConfig[];
  motionScale?:      number;
  bgmPath?:          string;
  panoramaHighUrl?:  string;
  panoramaLowUrl?:   string;
  panoramaYawDeg?:   number;
}

interface BridgeObj extends FlowBridge {
  visual:           BridgeVisual;
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
  private stars:      THREE.Points | null = null;
  private speedLines: THREE.Group | null = null;
  private speedVFX:      SpeedVFX      | null = null;
  private punchVFX:      PunchVFX      | null = null;
  private arenaRenderer: ArenaRenderer | null = null;
  private postFX:        PostProcessingRenderer | null = null;
  private coloredSpeedLines: ColoredSpeedLines | null = null;
  private decorAsteroids: DecorativeAsteroids | null = null;
  private loadedGltfScenes:  THREE.Object3D[] = []; // 로드된 GLB 템플릿 참조 보관
  private crateGlbScene:     THREE.Object3D | null = null;
  private spaceshipGlbScene: THREE.Object3D | null = null;
  private wallGlbScene:      THREE.Object3D | null = null;
  private oceanSurface: THREE.Mesh | null = null;
  private oceanBubbles: THREE.Points | null = null;
  private oceanTime = 0;
  private lastTickMs = -1;
  private rafId      = 0;
  private oceanFrameIdx = 0;

  private audio:          FlowAudio         = new FlowAudio();
  private aq:             AdaptiveQuality   = new AdaptiveQuality(
    staticPerfTier === 'low' ? 'LOW' : 'HIGH',
  );
  private obstacles:      ObstacleManager | null = null;
  private colorGates:     ColorGateManager | null = null;
  private currentColorGateAction: FlowModuleKey | null = null;
  private colorGateSpawnIdx = 0;
  private colorGateLaneOverrideX: number | null = null;
  private flowCam:        FlowCamera | null = null;
  private bridgeRenderer: BridgeRenderer | null = null;
  private spaceEnv:       SpaceEnvironment | null = null;

  private bridges:      BridgeObj[] = [];
  private activeBridge: BridgeObj | null = null;
  private lastJumpBridgeId = -1;
  private bridgeIdCnt      = 0;
  private bridgeLaneIdx    = 0; // 빨강(1)→노랑(2)→초록(0) 순환
  // 브릿지 레인 순서: 빨강(center=1) → 노랑(right=2) → 초록(left=0)
  private static readonly BRIDGE_LANE_SEQ = [1, 2, 0] as const;

  // ── 카메라 입력용 엔진 상태 ───────────────────────────────────────────────
  private targetX        = 0;
  private isChangingLane = false;
  private isOnBridge     = false;
  private isOnPad        = false;
  private groundY        = GROUND_Y;
  private flashOverlay: HTMLElement | null = null;
  private flashPulseValue = 0;

  // ── 점프 (원본 동일) ───────────────────────────────────────────────────────
  private isJumping    = false;
  private jumpProgress = 0;
  private jumpStartTime = 0;
  private playerJumpY  = 0;
  private jumpHeight   = JUMP_HEIGHT;
  private jumpDuration = JUMP_DURATIONS[0];

  // ── 게임 시간 ─────────────────────────────────────────────────────────────
  private gameTime   = 0;   // motionScale 적용 누적 (bob/점프용)
  private sessionSec = 0;   // 벽시계 누적

  // ── 스테이지 ──────────────────────────────────────────────────────────────
  private phase:           FlowGamePhase = 'idle';
  private stageList:       FlowStageConfig[] = [];
  private stageIdx         = 0;
  private stageTimer       = 0;
  private speedIntroShown  = false; // 스테이지별 후반 속도 안내 표시 여부
  private activeModules    = new Set<FlowModuleKey>();
  private motionScale      = 1;

  // ── 특수 모듈 ─────────────────────────────────────────────────────────────
  private currentSpeed     = 0;
  // 장애물 스케줄
  private stageSchedule:    ObstacleSlot[] = [];
  private stageScheduleIdx  = 0;
  private sessionReachPlaced = 0;
  // 펀치 벽 타격 시퀀스
  private wallBreakActive  = false;
  private wallBreakHits    = 0;
  private wallBreakTimer   = 0;
  private jumpInstrCooldown = 0;
  private isBonus = false; // 보너스 스테이지 여부

  private stats:     FlowStats = { stagesCompleted: 0, totalSec: 0 };
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

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
    await this.init3D(); // GLB 로드가 포함되므로 async
    if (this.disposed) return;
    // startCountdown은 start()에서 — 렌더 루프 시작 후 호출해야 blank screen 없음
  }

  private async init3D(): Promise<void> {
    const theme = THEMES['space']!;
    const tier = this.aq.getTier();
    const useEnhancedBridge = this.aq.getUseEnhancedBridge();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(theme.bg);
    this.scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);

    const initW = this.canvas.clientWidth  || window.innerWidth;
    const initH = this.canvas.clientHeight || window.innerHeight;

    this.camera         = new THREE.PerspectiveCamera(60, initW / initH, 0.1, 12000);
    this.flowCam        = new FlowCamera(this.camera, GROUND_Y);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: tier !== 'LOW' });
    this.renderer.setSize(initW, initH);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, this.aq.getPixelRatioMax()));

    const amb = new THREE.AmbientLight(0xffffff, theme.ambientInt);
    this.scene.add(amb);
    const pt = new THREE.PointLight(theme.pointColor, 15, 12000);
    pt.position.set(0, 2000, 800);
    this.scene.add(pt);

    this.spaceEnv = new SpaceEnvironment({
      scene:       this.scene,
      qualityTier: tier,
      yawDeg:      this.opts.panoramaYawDeg,
    });
    const panoLow = this.opts.panoramaLowUrl;
    const panoHigh = this.opts.panoramaHighUrl;
    if (panoLow || panoHigh) {
      void this.spaceEnv.loadPanorama(panoHigh, panoLow);
    }

    this.coloredSpeedLines = new ColoredSpeedLines(this.scene, tier);
    this.decorAsteroids = new DecorativeAsteroids(this.scene, tier);
    this.punchVFX = new PunchVFX(this.scene);

    if (this.aq.getUseSpeedVFX()) {
      this.speedVFX = new SpeedVFX(this.scene);
    }

    const trackScene = await this.loadGlbScenes();
    if (this.disposed || !this.scene) return;

    this.bridgeRenderer = new BridgeRenderer(this.scene, useEnhancedBridge, trackScene);
    this.arenaRenderer = new ArenaRenderer(this.scene, tier);

    if (this.aq.getUseBloom()) {
      this.postFX = new PostProcessingRenderer(
        this.renderer, this.scene, this.camera,
        initW, initH, tier,
      );
    }

    this.createTrackLanes();

    const glbTemplates =
      this.crateGlbScene || this.spaceshipGlbScene || this.wallGlbScene
        ? {
            crateTemplate:     this.crateGlbScene,
            spaceshipTemplate: this.spaceshipGlbScene,
            wallTemplate:      this.wallGlbScene,
          }
        : undefined;

    this.obstacles = new ObstacleManager(this.scene, BRIDGE_LENGTH, {
      onBoxHit:           () => {},
      onBoxWarn:          () => { /* instruction 제거 */ },
      onUfoWarn:          () => { /* instruction 제거 */ },
      onUfoDuckStart:     () => {
        if (!this.activeModules.has('duck')) return;
        this.flowCam?.onDuckStart();
      },
      onUfoPassed:        () => {
        this.flowCam?.onDuckEnd();
        this.audio.sfxLand();
      },
      onPunchWallEnter:   () => {
        if (!this.activeModules.has('reach')) return;
        this.wallBreakActive = true;
        this.wallBreakHits   = 0;
        this.wallBreakTimer  = WALL_BREAK_INTERVAL;
      },
      onBoxAutoHit:       (isReach: boolean) => {
        this.flowCam?.addMicroJolt(MICROJOLT_AMOUNT);
        this.audio.sfxPunch();
        if (this.punchVFX && this.camera) {
          this.punchVFX.trigger(
            this.activeBridge?.x ?? 0,
            PUNCH_VFX_Y,
            this.camera.position.z - 240,
            LANE_COLORS[this.activeBridge?.lane ?? 1],
          );
        }
        if (isReach && this.activeModules.has('reach')) {
          this.flowCam?.addHitShake(1.2, 220);
        }
      },
      onKickWarn:         () => { /* instruction 제거 */ },
      onKickAutoHit:      () => {
        if (!this.activeModules.has('kick')) return;
        this.flowCam?.onKickStart();
        this.flowCam?.addMicroJolt(MICROJOLT_AMOUNT * 0.85);
        this.audio.sfxKick();
        if (this.punchVFX && this.camera) {
          this.punchVFX.trigger(
            this.activeBridge?.x ?? 0,
            KICK_VFX_Y,
            this.camera.position.z - 240,
            0x34d399,
          );
        }
      },
      onCameraShake:      (int, ms) => {
        this.flowCam?.addHitShake(int, ms);
      },
      onFlash:            () => { this.flashPulseValue = Math.min(1, this.flashPulseValue + 0.75); },
      getShardScale:      () => this.aq.getShardScale(),
    }, glbTemplates);

    for (let i = 0; i < 3; i++) this.spawnBridge(i === 0);

    if (this.stageList.some((s) => s.isColorGate)) {
      this.ensureColorGateManager();
    }
  }

  // ── GLB 자산 로딩 ────────────────────────────────────────────────────────

  private async loadGlbScenes(): Promise<THREE.Object3D | null> {
    const nonGateStages = this.stageList.filter((stage) => !stage.isColorGate);
    const needsCrate = nonGateStages.some((stage) => stage.activeModules.has('jump'));
    const needsSpaceship = nonGateStages.some((stage) => stage.activeModules.has('duck'));
    const needsWall = nonGateStages.some((stage) => stage.activeModules.has('reach'));
    if (!needsCrate && !needsSpaceship && !needsWall) return null;

    const loader = new GLTFLoader();

    const loadOne = (path: string): Promise<THREE.Object3D | null> =>
      new Promise((resolve) => {
        loader.load(
          path,
          (gltf) => {
            this.loadedGltfScenes.push(gltf.scene);
            resolve(gltf.scene);
          },
          undefined,
          (err) => {
            console.warn('[FlowEngine] GLB 로드 실패:', path, err);
            resolve(null);
          },
        );
      });

    const [crate, spaceship, wall] = await Promise.all([
      needsCrate ? loadOne('/spomove/dive/models/dive_obstacle_crate_a.glb') : Promise.resolve(null),
      needsSpaceship ? loadOne('/spomove/dive/models/dive_duck_spaceship.glb') : Promise.resolve(null),
      needsWall ? loadOne('/spomove/dive/models/dive_punch_wall.glb') : Promise.resolve(null),
    ]);

    this.crateGlbScene     = crate ?? null;
    this.spaceshipGlbScene = spaceship ?? null;
    this.wallGlbScene      = wall ?? null;
    return null;
  }

  // ── 파란 바닥 레인 (원본과 완전 동일) ─────────────────────────────────────

  private createTrackLanes(): void {
    if (!this.scene) return;
    const isEnh = this.aq.getUseEnhancedBridge();
    for (let i = -1; i <= 1; i++) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(LANE_WIDTH, 60000),
        new THREE.MeshStandardMaterial({
          color:             isEnh ? 0x061b3d : 0x3b82f6,
          metalness:         isEnh ? 0.35 : 0,
          roughness:         isEnh ? 0.5  : 1.0,
          emissive:          isEnh ? 0x010714 : 0x000000,
          emissiveIntensity: isEnh ? 0.1 : 0,
          transparent:       true,
          opacity:           isEnh ? 0.96 : 0.9,
        }),
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
    if (!this.bridgeRenderer) return;
    let spawnZ: number;
    if (isFirst) {
      spawnZ = PLAYER_Z;
    } else if (this.bridges.length > 0) {
      const last = this.bridges[this.bridges.length - 1];
      spawnZ = last.mesh.position.z - (BRIDGE_LENGTH + PAD_DEPTH + BRIDGE_GAP);
    } else {
      spawnZ = -8000;
    }

    const gateColorId = !isFirst ? this.planColorGateForNextBridge() : null;
    const randLane = FlowEngine.BRIDGE_LANE_SEQ[this.bridgeLaneIdx % 3]!;
    this.bridgeLaneIdx++;
    const bridgeX  = (randLane - 1) * LANE_WIDTH;

    const visual = this.bridgeRenderer.createBridge({
      lane: randLane,
      x: bridgeX,
      z: spawnZ,
      colorGateDeck: gateColorId
        ? { gateLocalZ: COLOR_GATE_LOCAL_Z, color: 0x1d4ed8 }
        : undefined,
    });

    const bridgeObj: BridgeObj = {
      mesh: visual.mesh, lane: randLane, bridgeId: this.bridgeIdCnt++,
      x: bridgeX,
      visual,
      hasBox: false, hasColorGate: false, padMesh: visual.padMesh, padDepth: visual.padDepth,
      instructionFired: false,
      preJumpFired: false,
    };
    this.bridges.push(bridgeObj);

    if (!isFirst && this.obstacles) {
      const slot: ObstacleSlot = this.stageScheduleIdx < this.stageSchedule.length
        ? (this.stageSchedule[this.stageScheduleIdx++] ?? null)
        : null;
      this.stageScheduleIdx = Math.min(this.stageScheduleIdx, this.stageSchedule.length);

      if (slot === 'ufo') {
        this.obstacles.attachUfo(bridgeObj);
      } else if (slot === 'reach') {
        this.obstacles.attachBox(bridgeObj, this.activeModules, true);
      } else if (slot === 'box') {
        this.obstacles.attachBox(bridgeObj, this.activeModules, false);
      } else if (slot === 'kick') {
        this.obstacles.attachKick(bridgeObj);
      }
    }

    if (gateColorId && this.colorGates) {
      this.colorGates.attach(bridgeObj, bridgeX, gateColorId);
    }
  }

  /** 색 관문: 시작 후 2브릿지는 비우고, 이후 브릿지마다 게이트 색 lane으로 생성 */
  private planColorGateForNextBridge(): GateColorId | null {
    if (!this.currentColorGateAction || !this.colorGates) return null;
    if (!this.stageList[this.stageIdx]?.isColorGate) return null;
    if (!this.colorGates.isReady()) return null;

    this.colorGateSpawnIdx += 1;
    if (!shouldSpawnColorGateOnBridgeAttempt(this.colorGateSpawnIdx, Math.random())) return null;

    return pickRandomGateColor();
  }

  /** 카운트다운·init3D에서 미리 준비 */
  private ensureColorGateManager(): void {
    if (this.colorGates) return;
    this.colorGates = new ColorGateManager(staticPerfTier === 'low');
    void preloadColorGatePoseImages().then((images) => {
      if (this.disposed || !this.colorGates) return;
      this.colorGates.setPoseImages(images);
    });
  }

  // ── 카운트다운 ───────────────────────────────────────────────────────────

  private startCountdown(): void {
    if (this.stageList.some((s) => s.isColorGate)) {
      void preloadColorGatePoseImages();
      this.ensureColorGateManager();
    }
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
    this.stageIdx         = idx;
    const stage           = this.stageList[idx];
    if (!stage) { this.endGame(); return; }

    this.activeModules    = stage.activeModules;
    this.isBonus          = stage.isBonus;
    this.stageTimer       = 0;
    this.speedIntroShown  = false;
    this.jumpHeight    = JUMP_HEIGHT;
    this.jumpDuration  = JUMP_DURATIONS[Math.min(idx, JUMP_DURATIONS.length - 1)]!;
    this.resetSpecialTimers();
    this.obstacles?.clearAll();
    this.colorGates?.clearAll();
    for (const b of this.bridges) {
      b.hasBox = false;
      b.hasColorGate = false;
      b.instructionFired = false;
      b.preJumpFired = false;
    }
    this.bridgeLaneIdx = 0; // 스테이지마다 빨강부터 다시 시작
    this.activeBridge = null;
    this.colorGateLaneOverrideX = null;

    // 장애물 스케줄 생성 (색 관문: 장애물 없음)
    const speedMult = SPEED_MULTS[Math.min(idx, SPEED_MULTS.length - 1)]!;
    if (stage.isColorGate) {
      this.stageSchedule = [];
    } else {
      this.stageSchedule = generateObstacleSchedule({
        activeModules: stage.activeModules,
        durationSec: stage.durationSec,
        speedMult,
        sessionReachPlaced: this.sessionReachPlaced,
        isBonus: stage.isBonus,
      });
      this.sessionReachPlaced += countReachInSchedule(this.stageSchedule);
    }
    this.stageScheduleIdx = 0;

    if (stage.isColorGate && stage.colorGateAction) {
      this.currentColorGateAction = stage.colorGateAction;
      this.colorGateSpawnIdx = 0;
      this.ensureColorGateManager();
      this.colorGates?.clearAll();
      for (const b of this.bridges) {
        b.hasColorGate = false;
      }
      this.colorGateLaneOverrideX = null;
      this.cb.onColorGateStage?.({
        action: stage.colorGateAction,
        step: stage.colorGateStep ?? 1,
        total: stage.colorGateTotal ?? 5,
      });
    } else {
      this.currentColorGateAction = null;
      this.colorGateLaneOverrideX = null;
    }

    this.cb.onStageChange?.(idx);
    // 스테이지 0은 카운트다운 후 already-playing. 1+ 또는 색 관문은 2초 인트로
    if (idx > 0) {
      this.setPhase('stage-intro');
      this.countdownTimer = setTimeout(() => this.setPhase('playing'), 2000);
    }
  }

  private resetSpecialTimers(): void {
    this.wallBreakActive   = false;
    this.wallBreakHits     = 0;
    this.wallBreakTimer    = 0;
    this.jumpInstrCooldown = 0;
    this.isJumping    = false;
    this.jumpProgress = 0;
    this.playerJumpY  = 0;
    this.flowCam?.resetAnimState();
  }

  private endStage(): void {
    this.stats.stagesCompleted++;
    this.audio.sfxStageUp();
    const leavingColorGate = this.stageList[this.stageIdx]?.isColorGate;
    if (!leavingColorGate) {
      this.flashPulseValue = 1.0;
    }
    this.flowCam?.addHitShake(0.9, 250);
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
        const skipBloom = this.stageList[this.stageIdx]?.isColorGate === true;
        if (this.postFX && !skipBloom) {
          this.postFX.render();
        } else {
          this.renderer.render(this.scene, this.camera);
        }
      }
    };
    this.rafId = requestAnimationFrame(animate);
  }

  private update(rawDt: number): void {
    const dt      = Math.min(rawDt, 0.1);
    const dtM     = dt * this.motionScale;
    const dt60    = dt * 60;
    const dt60M   = dtM * 60;

    // 아레나 장식은 항상 이동 (인트로·비플레이 중에도 시각적 연속성 유지)
    this.arenaRenderer?.update(Math.max(0.3, this.currentSpeed), dt60M);

    // AQ
    const tierBefore = this.aq.getTier();
    this.aq.update(dt);
    if (this.aq.getTier() !== tierBefore && this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, this.aq.getPixelRatioMax()));
      if (tierBefore !== 'LOW' && this.aq.getTier() === 'LOW' && this.postFX) {
        this.postFX.dispose();
        this.postFX = null;
      }
    }

    // stage-intro / speed-intro 중에는 배경 정지
    const isIntroPhase = this.phase === 'stage-intro' || this.phase === 'speed-intro';
    if (this.spaceEnv) {
      this.spaceEnv.update({
        dt,
        speed:        this.currentSpeed,
        cameraX:      this.camera?.position.x ?? 0,
        isIntroPhase,
      });
    } else if (this.stars && !isIntroPhase) {
      this.stars.rotation.y -= 0.00008 * dt60M;
    }

    // 바다 파도 애니메이션 (인트로 중에는 멈춤)
    if ((this.oceanSurface || this.oceanBubbles) && !isIntroPhase) {
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
      this.flowCam?.update({
        dtM, dt60M, dtWall: dt, speed: 0,
        phase: this.phase, gameTime: this.gameTime,
        isJumping: this.isJumping, jumpProgress: this.jumpProgress, playerJumpY: this.playerJumpY,
        isOnBridge: this.isOnBridge, isOnPad: this.isOnPad, isChangingLane: this.isChangingLane,
        targetX: this.targetX,
        activeBridgeX: this.colorGateLaneOverrideX ?? this.activeBridge?.x ?? null,
        groundY: this.groundY,
      } satisfies FlowCameraUpdateInput);
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

    // ── 후반 속도 안내 — 1단계(stageIdx 0)에서만, 색 관문 제외 ─────────────
    if (!stage.isColorGate && this.stageIdx === 0 && !this.speedIntroShown && this.stageTimer >= stage.durationSec / 2) {
      this.speedIntroShown = true;
      if (this.countdownTimer) clearTimeout(this.countdownTimer);
      this.setPhase('speed-intro');
      this.countdownTimer = setTimeout(() => {
        if (this.phase === 'speed-intro') this.setPhase('playing');
      }, 2000);
      return;
    }

    // ── 속도 계산 ──────────────────────────────────────────────────────────
    const stageMult   = SPEED_MULTS[Math.min(this.stageIdx, SPEED_MULTS.length - 1)]!;
    // 1단계: 전반 1.0x / 후반 1.15x, 나머지 스테이지: 처음부터 1.15x
    const fasterMult  = (this.stageIdx === 0 && this.stageTimer < stage.durationSec / 2) ? 1.0 : 1.15;
    let speedScalar = this.wallBreakActive ? 0.0 : 1.0;
    this.currentSpeed = BASE_SPEED * stageMult * fasterMult * speedScalar;
    const bridgeMove  = this.currentSpeed * 50 * dt60M;

    // ── 브릿지 이동·프룬 ────────────────────────────────────────────────────
    for (let i = this.bridges.length - 1; i >= 0; i--) {
      this.bridges[i].mesh.position.z += bridgeMove;
      if (this.bridges[i].mesh.position.z > BRIDGE_PRUNE_Z) {
        if (this.activeBridge === this.bridges[i]) this.activeBridge = null;
        this.bridgeRenderer!.removeBridge(this.bridges[i]);
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

    // ── 색 관문: 통과 연출 + HUD 색 동기화 ─────────────────────────────────
    if (stage.isColorGate && this.colorGates) {
      this.colorGates.update(
        PLAYER_Z,
        dt,
        (gateColorId) => {
          this.cb.onColorGateColor?.(gateColorId);
        },
        (_gateColorId, bridge) => {
          this.bridgeRenderer?.revealColorGateDeck((bridge as BridgeObj).visual);
          this.colorGateLaneOverrideX = null;
        },
      );
    }

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
        this.playerJumpY    = 0;
        this.isJumping      = false;
        this.jumpProgress   = 0;
        this.isChangingLane = false;
        this.flowCam?.onLanding(isMini);
        if (!stage.isColorGate && isMini) {
          this.flashPulseValue = Math.min(1, this.flashPulseValue + 0.45);
        }
        this.audio.sfxLand();
      }
    }

    // ── 펀치 벽 타격 시퀀스 ───────────────────────────────────────────────
    if (this.wallBreakActive) {
      this.wallBreakTimer -= dt;
      if (this.wallBreakTimer <= 0) {
        this.wallBreakHits++;
        const done = this.obstacles?.hitPunchWall() ?? true;
        this.flowCam?.addMicroJolt(0.55);
        this.audio.sfxPunch();
        this.flowCam?.addHitShake(0.75 + this.wallBreakHits * 0.1, 130);
        if (this.punchVFX && this.camera) {
          this.punchVFX.trigger(
            this.activeBridge?.x ?? 0,
            60,
            this.camera.position.z - 240,
            LANE_COLORS[this.activeBridge?.lane ?? 1],
          );
        }
        if (done) {
          this.wallBreakActive = false;
          this.wallBreakHits   = 0;
          this.obstacles?.breakPunchWall();
          this.flashPulseValue = 1.0;
          this.flowCam?.addHitShake(1.5, 300);
        } else {
          this.wallBreakTimer = WALL_BREAK_INTERVAL;
        }
      }
    }

    // ── 스피드라인 / SpeedVFX / 장식 소행성 ───────────────────────────────
    this.coloredSpeedLines?.update(this.currentSpeed, this.stageIdx, dt60M);
    this.decorAsteroids?.update(dt60M, this.currentSpeed);
    if (this.speedVFX) {
      this.speedVFX.update(this.currentSpeed, this.stageIdx, dt60M);
    }

    // ── PunchVFX 업데이트 ─────────────────────────────────────────────────
    this.punchVFX?.update(dt);

    // flash 감쇠 — 색 관문 중 흰 화면 플래시 금지
    if (stage.isColorGate) {
      this.flashPulseValue = 0;
      if (this.flashOverlay) this.flashOverlay.style.opacity = '0';
    } else {
      this.flashPulseValue *= Math.pow(0.80, dt60);
      if (this.flashOverlay) this.flashOverlay.style.opacity = String(Math.max(0, this.flashPulseValue));
    }

    this.flowCam?.update({
      dtM, dt60M, dtWall: dt, speed: this.currentSpeed,
      phase: this.phase, gameTime: this.gameTime,
      isJumping: this.isJumping, jumpProgress: this.jumpProgress, playerJumpY: this.playerJumpY,
      isOnBridge: this.isOnBridge, isOnPad: this.isOnPad, isChangingLane: this.isChangingLane,
      targetX: this.targetX,
      activeBridgeX: this.colorGateLaneOverrideX ?? this.activeBridge?.x ?? null,
      groundY: this.groundY,
    } satisfies FlowCameraUpdateInput);
  }

  // ── 자동 점프 ────────────────────────────────────────────────────────────

  private triggerAutoJump(): void {
    if (this.isJumping) return;
    this.isJumping     = true;
    this.jumpProgress  = 0;
    this.jumpStartTime = this.gameTime;
    this.jumpHeight    = JUMP_HEIGHT;
    this.jumpDuration  = JUMP_DURATIONS[Math.min(this.stageIdx, JUMP_DURATIONS.length - 1)]!;
    this.flowCam?.addMicroJolt(MICROJOLT_AMOUNT);
    this.audio.sfxJump();
  }

  // 어드밴스 경고는 ObstacleManager.onBoxWarn 으로 이관됨
  private checkObstacleInstructions(): void { /* no-op */ }

  // ── resize ───────────────────────────────────────────────────────────────

  resize(w: number, h: number): void {
    if (!this.renderer) return;
    this.renderer.setSize(w, h);
    this.flowCam?.resize(w, h);
    this.postFX?.resize(w, h);
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
    this.disposed = true;
    this.stop();
    this.colorGates?.dispose();
    this.colorGates = null;
    this.audio.dispose();
    this.flowCam?.dispose();
    this.flowCam = null;
    this.bridgeRenderer?.dispose();
    this.bridgeRenderer = null;
    this.spaceEnv?.dispose();
    this.spaceEnv = null;
    this.coloredSpeedLines?.dispose();
    this.coloredSpeedLines = null;
    this.decorAsteroids?.dispose();
    this.decorAsteroids = null;
    this.speedVFX?.dispose();
    this.speedVFX = null;
    this.punchVFX?.dispose();
    this.punchVFX = null;
    this.arenaRenderer?.dispose();
    this.arenaRenderer = null;
    this.postFX?.dispose();
    this.postFX = null;
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    this.crateGlbScene     = null;
    this.spaceshipGlbScene = null;
    this.wallGlbScene      = null;
    this.loadedGltfScenes  = []; // 참조 해제 (geometry/material은 scene.traverse에서 처리)
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
