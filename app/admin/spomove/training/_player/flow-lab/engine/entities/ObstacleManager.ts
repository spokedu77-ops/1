/**
 * Flow 2.0 — ObstacleManager
 * 지원 장애물:
 *   box (punch) / punchWall (reach) / ufo (duck) / kickBarrel (kick) / shard·coin
 */

import * as THREE from 'three';
import type { FlowModuleKey } from '../modules/flowModules';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const BOX_WARN_Z      = -500;  // 박스 접근 경고 거리 (600 units / 1440 speed ≈ 417ms)
const BOX_AUTO_HIT_Z  = 300;   // 일반 박스 자동 파괴 Z
const BOX_DESTROY_Z   = 450;
const BOX_RATE        = 0.55;
const UFO_RATE        = 0.45;
const UFO_HEIGHT      = 180;
const BRIDGE_DECK_Y   = 40;
/** 펀치 크레이트 — 레인(바닥)에 붙음, 무릎~발 높이 */
const PUNCH_CRATE_H   = 32;
const PUNCH_ANCHOR_Y  = BRIDGE_DECK_Y;
/** 킥 배럴 — 가슴 높이(발 들어 차기) */
const KICK_BARREL_R   = 20;
const KICK_BARREL_LEN = 72;
const KICK_CENTER_ABOVE_DECK = 62;
const KICK_ANCHOR_Y   = BRIDGE_DECK_Y + KICK_CENTER_ABOVE_DECK - KICK_BARREL_R;
const PUNCH_WALL_HP   = 5;    // 펀치 벽 총 타격 횟수
const WALL_W          = 110;  // 더 넓게
const WALL_H          = 230;  // 더 높게
const WALL_TRIGGER_DIST = 100;

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface FlowBridge {
  mesh: THREE.Group;
  lane: number;
  bridgeId: number;
  x: number;
  hasBox: boolean;
  padMesh: THREE.Mesh;
}

interface BoxEntity {
  mesh: THREE.Group;
  isReach: boolean;
  isKick: boolean;
  reward: boolean;
  warnedReach: boolean;
  warnFired: boolean;
  bridgeRef: FlowBridge;
  autoHitDone: boolean;
  hitCount: number;
  rollAngle: number;
}

interface UfoEntity {
  mesh: THREE.Group;
  warned: boolean;
  duckStarted: boolean;
  passed: boolean;
  age: number;
  // 애니메이션 대상 참조
  discBody:  THREE.Mesh;
  ringLower: THREE.Mesh;
  beam:      THREE.Mesh;
  antLight:  THREE.Mesh;
  enginePods: THREE.Mesh[];
}

interface ShardEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  type: 'shard' | 'coin';
}

// ─── GLB 템플릿 (enhanced 모드 전용) ─────────────────────────────────────────

export interface ObstacleGlbTemplates {
  crateTemplate:     THREE.Object3D | null; // dive_obstacle_crate_a.glb
  spaceshipTemplate: THREE.Object3D | null; // dive_duck_spaceship.glb
  wallTemplate:      THREE.Object3D | null; // dive_punch_wall.glb
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface ObstacleCallbacks {
  onBoxHit?: (reward: boolean) => void;
  onBoxWarn?: (isReach: boolean) => void;
  onBoxAutoHit?: (isReach: boolean) => void;
  onKickWarn?: () => void;
  onKickAutoHit?: () => void;
  onPunchWallEnter?: () => void;
  onUfoDuckStart?: () => void;
  onUfoPassed?: () => void;
  onUfoWarn?: () => void;
  onCameraShake?: (intensity: number, ms: number) => void;
  onFlash?: () => void;
  getShardScale?: () => number;
}

// ─── Manager ─────────────────────────────────────────────────────────────────

export class ObstacleManager {
  private scene: THREE.Scene;
  private bridgeLength: number;
  private cb: ObstacleCallbacks;

  private boxes: BoxEntity[] = [];
  private ufos: UfoEntity[] = [];
  private shards: ShardEntity[] = [];
  private wallBreakRef: BoxEntity | null = null;

  private goldBudget = 3;
  private goldSpawned = 0;
  private readonly _tmpVec = new THREE.Vector3();

  // GLB 시각 템플릿 (clone(true)로 인스턴스 생성 — geometry/material 공유)
  private crateTemplate:     THREE.Object3D | null = null;
  private spaceshipTemplate: THREE.Object3D | null = null;
  private wallTemplate:      THREE.Object3D | null = null;

  constructor(
    scene: THREE.Scene,
    bridgeLength: number,
    cb: ObstacleCallbacks = {},
    glbTemplates?: ObstacleGlbTemplates,
  ) {
    this.scene = scene;
    this.bridgeLength = bridgeLength;
    this.cb = cb;
    if (glbTemplates) {
      this.crateTemplate     = glbTemplates.crateTemplate;
      this.spaceshipTemplate = glbTemplates.spaceshipTemplate;
      this.wallTemplate      = glbTemplates.wallTemplate;
    }
  }

  resetGold(budget: number): void {
    this.goldBudget = budget;
    this.goldSpawned = 0;
  }

  hasActiveBox(): boolean { return this.boxes.length > 0; }
  hasActiveUfo(): boolean { return this.ufos.some((u) => !u.passed); }

  shouldSpawnBox(activeModules: Set<FlowModuleKey>): boolean {
    if (!activeModules.has('punch') && !activeModules.has('reach')) return false;
    if (this.boxes.length > 0) return false;
    const rate = activeModules.has('reach') && !activeModules.has('punch') ? 0.72 : BOX_RATE;
    return Math.random() < rate;
  }

  shouldSpawnUfo(activeModules: Set<FlowModuleKey>): boolean {
    if (!activeModules.has('duck')) return false;
    if (this.boxes.length > 0) return false;
    if (this.ufos.some((u) => !u.passed)) return false;
    return Math.random() < UFO_RATE;
  }

  // ── 박스 ────────────────────────────────────────────────────────────────────

  attachBox(bridge: FlowBridge, activeModules: Set<FlowModuleKey>, forceIsReach?: boolean): void {
    if (bridge.hasBox) return;
    bridge.hasBox = true;

    const isReach = forceIsReach !== undefined
      ? forceIsReach
      : (activeModules.has('reach') && (!activeModules.has('punch') || Math.random() < 0.45));

    const reward = this.goldSpawned < this.goldBudget && Math.random() < 0.5;
    if (reward) this.goldSpawned++;

    const group = this.makeBox(isReach, reward);
    const yPos = isReach ? 0 : PUNCH_ANCHOR_Y;
    const localZ = isReach ? -(this.bridgeLength * 0.25) : -(this.bridgeLength * 0.1);
    group.position.set(0, yPos, localZ);
    bridge.mesh.add(group);
    this.boxes.push({
      mesh: group, isReach, isKick: false, reward,
      warnedReach: false, warnFired: false,
      bridgeRef: bridge, autoHitDone: false, hitCount: 0, rollAngle: 0,
    });
  }

  attachKick(bridge: FlowBridge): void {
    if (bridge.hasBox) return;
    bridge.hasBox = true;

    const group = this.makeKickBarrel();
    const localZ = -(this.bridgeLength * 0.12);
    group.position.set(0, KICK_ANCHOR_Y, localZ);
    bridge.mesh.add(group);
    this.boxes.push({
      mesh: group, isReach: false, isKick: true, reward: false,
      warnedReach: false, warnFired: false,
      bridgeRef: bridge, autoHitDone: false, hitCount: 0, rollAngle: 0,
    });
  }

  private makeKickBarrel(): THREE.Group {
    const g = new THREE.Group();
    const barrel = new THREE.Group();
    barrel.userData['isKickRoll'] = true;
    barrel.position.y = KICK_BARREL_R;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(KICK_BARREL_R, KICK_BARREL_R, KICK_BARREL_LEN, 20),
      new THREE.MeshPhongMaterial({
        color: 0x374151,
        emissive: 0x111827,
        emissiveIntensity: 0.2,
        shininess: 40,
      }),
    );
    body.rotation.z = Math.PI / 2;
    barrel.add(body);

    // X축 롤링 배럴 — 링 스트라이프 (거대 박스 스트라이프 제거)
    for (let s = 0; s < 5; s++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(KICK_BARREL_R * 0.96, 3.5, 8, 18),
        new THREE.MeshBasicMaterial({ color: s % 2 === 0 ? 0xfbbf24 : 0x111827 }),
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.x = -KICK_BARREL_LEN / 2 + (s + 0.5) * (KICK_BARREL_LEN / 5);
      barrel.add(ring);
    }

    const endCapMat = new THREE.MeshPhongMaterial({ color: 0x6b7280, shininess: 60 });
    for (const sx of [-1, 1]) {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(KICK_BARREL_R * 0.88, KICK_BARREL_R * 0.88, 5, 14),
        endCapMat,
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.x = sx * (KICK_BARREL_LEN / 2 + 2);
      barrel.add(cap);
    }

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(38, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0x34d399, transparent: true, opacity: 0.18,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    glow.scale.set(1.5, 0.72, 0.72);
    barrel.add(glow);

    g.add(barrel);
    return g;
  }

  private makeBox(isReach: boolean, reward: boolean): THREE.Group {
    const g = new THREE.Group();

    if (isReach) {
      // ── 콘크리트 타격 벽 ──────────────────────────────────────────────────
      const surfY  = 40;
      const centerY = surfY + WALL_H / 2;

      // 메인 몸체 — 두꺼운 콘크리트
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_W, WALL_H, 26),
        new THREE.MeshPhongMaterial({
          color: 0x374151,
          emissive: 0x111827,
          emissiveIntensity: 0.35,
          shininess: 8,
        }),
      );
      body.position.y = centerY;
      g.add(body);

      // 표면 레이어 (입체감)
      const surface = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_W - 8, WALL_H - 8, 5),
        new THREE.MeshPhongMaterial({
          color: 0x4b5563,
          emissive: 0x1f2937,
          emissiveIntensity: 0.2,
          shininess: 4,
        }),
      );
      surface.position.set(0, centerY, 16);
      g.add(surface);

      // 수평 균열 줄 — 타격 구역 분리
      for (let r = 1; r <= 4; r++) {
        const crack = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_W + 2, 3, 30),
          new THREE.MeshBasicMaterial({ color: 0x111827 }),
        );
        crack.position.y = surfY + (WALL_H / 5) * r;
        g.add(crack);
      }

      // 좌우 금속 프레임
      for (const sx of [-1, 1]) {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(12, WALL_H + 24, 30),
          new THREE.MeshPhongMaterial({ color: 0x1f2937, emissive: 0x0a0f1a, shininess: 55 }),
        );
        frame.position.set(sx * (WALL_W / 2 + 5), centerY, 0);
        g.add(frame);
      }

      // 상단 볼트 좌우
      for (const sx of [-1, 1]) {
        const bolt = new THREE.Mesh(
          new THREE.CylinderGeometry(5, 5, 10, 8),
          new THREE.MeshPhongMaterial({ color: 0x9ca3af, shininess: 80 }),
        );
        bolt.position.set(sx * (WALL_W / 2 - 10), surfY + WALL_H + 8, 14);
        g.add(bolt);
      }

      // 중앙 타겟 원 (빨강)
      const target = new THREE.Mesh(
        new THREE.CylinderGeometry(30, 30, 5, 20),
        new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.9 }),
      );
      target.rotation.x = Math.PI / 2;
      target.position.set(0, centerY, 16);
      g.add(target);

      // 타겟 내부 (흰)
      const innerTarget = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 14, 6, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }),
      );
      innerTarget.rotation.x = Math.PI / 2;
      innerTarget.position.set(0, centerY, 17);
      g.add(innerTarget);

      // 하단 위험 줄무늬 (노랑+검정)
      for (let s = 0; s < 7; s++) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_W / 7, 14, 30),
          new THREE.MeshBasicMaterial({ color: s % 2 === 0 ? 0xfbbf24 : 0x111827 }),
        );
        stripe.position.set(-WALL_W / 2 + (s + 0.5) * (WALL_W / 7), surfY + 9, 0);
        g.add(stripe);
      }

      // HP LED 바 — 초록색
      for (let hp = 0; hp < PUNCH_WALL_HP; hp++) {
        const seg = new THREE.Mesh(
          new THREE.BoxGeometry(18, 14, 12),
          new THREE.MeshBasicMaterial({ color: 0x22c55e }),
        );
        seg.position.set(-36 + hp * 18, surfY + WALL_H + 20, 0);
        seg.userData['hpIndex'] = hp;
        g.add(seg);
      }

      // 위험 발광 테두리
      const glowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_W + 36, WALL_H + 36, 20),
        new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true, opacity: 0.08,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      glowFrame.position.y = centerY;
      g.add(glowFrame);

    } else {
      // ── 나무 크레이트 (펀치 박스) — 레인 위 낮은 박스 ─────────────────────
      const CW = 76, CH = PUNCH_CRATE_H, CD = 60;
      const cy = CH / 2;

      // 메인 몸체 — 나무 갈색
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(CW, CH, CD),
        new THREE.MeshPhongMaterial({
          color: 0x7c4e1e,
          emissive: 0x2d1a08,
          emissiveIntensity: 0.25,
          shininess: 6,
        }),
      );
      body.position.y = cy;
      g.add(body);

      // 덮개
      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(CW + 4, 6, CD + 4),
        new THREE.MeshPhongMaterial({ color: 0x9b6228, emissive: 0x2d1a08, emissiveIntensity: 0.2, shininess: 4 }),
      );
      lid.position.y = CH + 2;
      g.add(lid);

      // 나무결 수평선 3개
      for (let b = 1; b < 4; b++) {
        const grain = new THREE.Mesh(
          new THREE.BoxGeometry(CW + 2, 2, CD + 2),
          new THREE.MeshBasicMaterial({ color: 0x4a2c10, transparent: true, opacity: 0.6 }),
        );
        grain.position.y = (CH / 4) * b;
        g.add(grain);
      }

      // 모서리 금속 브래킷 4개
      const bracketColor = reward ? 0xfacc15 : 0x8a8a8a;
      const bracketEmissive = reward ? 0x6b4a00 : 0x2a2a2a;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        const bracket = new THREE.Mesh(
          new THREE.BoxGeometry(9, CH + 6, 9),
          new THREE.MeshPhongMaterial({ color: bracketColor, emissive: bracketEmissive, shininess: 70 }),
        );
        bracket.position.set(sx * (CW / 2 - 3), cy, sz * (CD / 2 - 3));
        g.add(bracket);
      }

      // X자 테이프 — 십자 2개로 표현
      for (let axis = 0; axis < 2; axis++) {
        const tape = new THREE.Mesh(
          new THREE.BoxGeometry(axis === 0 ? CW + 2 : 5, 5, axis === 0 ? 5 : CD + 2),
          new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.75 }),
        );
        tape.position.y = cy;
        g.add(tape);
      }

      // 글로우
      const glowColor = reward ? 0xfacc15 : 0xff6600;
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(42, 8, 6),
        new THREE.MeshBasicMaterial({
          color: glowColor, transparent: true, opacity: 0.28,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      glow.position.y = cy;
      g.add(glow);
    }

    // ── GLB 시각 치환 (enhanced 모드) ─────────────────────────────────────────

    if (isReach && this.wallTemplate) {
      // 벽: wallVisualRoot 구조 + 방향 정규화 + 비균등 스케일 + 중앙 정렬 + HP 인디케이터
      const BRIDGE_SURF = 40;
      const HP_W = 16, HP_H = 10, HP_D = 3, HP_GAP = 4;
      const wallVisualRoot = new THREE.Group();

      const glbClone = this.wallTemplate.clone(true);
      glbClone.frustumCulled = false;
      glbClone.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh) return;
        m.frustumCulled = false;
      });

      // ① 방향 정규화: Z/Y 비율이 가장 작은 회전 선택 (얇은 Z, 높은 Y)
      const rotCandidates: THREE.Euler[] = [
        new THREE.Euler(0,              0, 0),
        new THREE.Euler(Math.PI / 2,    0, 0),
        new THREE.Euler(-Math.PI / 2,   0, 0),
        new THREE.Euler(0,  Math.PI / 2, 0),
        new THREE.Euler(0, -Math.PI / 2, 0),
        new THREE.Euler(0,  Math.PI,     0),
      ];
      let bestEuler = rotCandidates[0]!;
      let bestScore = Infinity;
      glbClone.scale.set(1, 1, 1);
      glbClone.position.set(0, 0, 0);
      for (const euler of rotCandidates) {
        glbClone.rotation.copy(euler);
        glbClone.updateWorldMatrix(true, true);
        const tBox  = new THREE.Box3().setFromObject(glbClone);
        const tSize = tBox.getSize(new THREE.Vector3());
        if (tSize.x < 0.001 || tSize.y < 0.001 || tSize.z < 0.001) continue;
        const score = tSize.z / tSize.y;
        if (score < bestScore) { bestScore = score; bestEuler = euler; }
      }
      glbClone.rotation.copy(bestEuler);
      glbClone.position.set(0, 0, 0);
      glbClone.updateWorldMatrix(true, true);

      // ② 회전 후 bounds 측정
      const rotBox  = new THREE.Box3().setFromObject(glbClone);
      const rotSize = rotBox.getSize(new THREE.Vector3());

      // ③ 비균등 스케일 (W=130, H=250, D=35)
      const sX = rotSize.x > 0.001 ? 130 / rotSize.x : 1;
      const sY = rotSize.y > 0.001 ? 250 / rotSize.y : 1;
      const sZ = rotSize.z > 0.001 ? 35  / rotSize.z : 1;
      glbClone.scale.set(sX, sY, sZ);
      glbClone.updateWorldMatrix(true, true);

      // ④ 최종 bounds → X/Z 중앙 정렬 + 하단 → 브릿지 표면
      const finalBox    = new THREE.Box3().setFromObject(glbClone);
      const finalCenter = finalBox.getCenter(new THREE.Vector3());
      glbClone.position.x = -finalCenter.x;
      glbClone.position.z = -finalCenter.z;
      glbClone.position.y = BRIDGE_SURF - finalBox.min.y;
      wallVisualRoot.add(glbClone);

      // ⑤ HP 인디케이터 (wallVisualRoot child, 벽 상단 위 + 정면)
      const wallTopY   = glbClone.position.y + finalBox.max.y;
      const wallFrontZ = finalBox.max.z - finalCenter.z;
      const hpY = wallTopY  + 16;
      const hpZ = wallFrontZ + 6;
      const totalHpW = PUNCH_WALL_HP * HP_W + (PUNCH_WALL_HP - 1) * HP_GAP;
      const hpStartX = -(totalHpW / 2) + HP_W / 2;
      for (let hp = 0; hp < PUNCH_WALL_HP; hp++) {
        const seg = new THREE.Mesh(
          new THREE.BoxGeometry(HP_W, HP_H, HP_D),
          new THREE.MeshBasicMaterial({ color: 0x22c55e, toneMapped: false }),
        );
        seg.position.set(hpStartX + hp * (HP_W + HP_GAP), hpY, hpZ);
        seg.userData['hpIndex'] = hp;
        wallVisualRoot.add(seg);
      }

      // ⑦ SF 네온 프레임 오버레이 — cyan 얇은 수평 바 (상단 + 하단)
      const fMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, toneMapped: false });
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(136, 3, 4), fMat);
      topBar.position.set(0, wallTopY - 5, wallFrontZ + 2);
      wallVisualRoot.add(topBar);
      const botBar = new THREE.Mesh(new THREE.BoxGeometry(136, 3, 4), fMat);
      botBar.position.set(0, BRIDGE_SURF + 3, wallFrontZ + 2);
      wallVisualRoot.add(botBar);

      // ⑥ 기존 절차적 메시 숨김 (기존 HP LED hpIndex 제거 — 중복 판정 방지)
      for (const c of [...g.children]) {
        if (typeof c.userData['hpIndex'] === 'number') {
          delete c.userData['hpIndex'];
        }
        c.visible = false;
      }
      g.add(wallVisualRoot);

    } else if (!isReach && this.crateTemplate) {
      // 크레이트: 레인 위 낮은 박스 (W=76, H=36, D=72)
      const glbClone = this.crateTemplate.clone(true);
      glbClone.frustumCulled = false;
      glbClone.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh) return;
        m.frustumCulled = false;
      });
      glbClone.updateWorldMatrix(true, true);
      const srcBox  = new THREE.Box3().setFromObject(glbClone);
      const srcSize = srcBox.getSize(new THREE.Vector3());
      const hasSrc  = srcSize.x > 0.001 && srcSize.y > 0.001 && srcSize.z > 0.001;
      const scale = hasSrc ? Math.min(76 / srcSize.x, 36 / srcSize.y, 72 / srcSize.z) : 1;
      glbClone.scale.setScalar(scale);
      const scaledBox = new THREE.Box3().setFromObject(glbClone);
      glbClone.position.y = -scaledBox.min.y;
      for (const c of [...g.children]) c.visible = false;
      g.add(glbClone);
    }

    return g;
  }

  // ── 돌뿌리 ──────────────────────────────────────────────────────────────────

  // ── UFO ─────────────────────────────────────────────────────────────────────

  attachUfo(bridge: FlowBridge): boolean {
    const group = new THREE.Group();

    // ① 메인 선체 디스크 — 금속 질감, 넓고 납작
    const discBody = new THREE.Mesh(
      new THREE.CylinderGeometry(165, 180, 20, 28),
      new THREE.MeshPhongMaterial({
        color: 0x94a3b8,
        emissive: 0x0f1f3d,
        emissiveIntensity: 0.25,
        shininess: 95,
      }),
    );
    group.add(discBody);

    // ② 상단 2단 선체 — 갈수록 좁아지는 탑 구조
    const hullMid = new THREE.Mesh(
      new THREE.CylinderGeometry(105, 148, 22, 22),
      new THREE.MeshPhongMaterial({ color: 0x64748b, emissive: 0x0f172a, emissiveIntensity: 0.3, shininess: 70 }),
    );
    hullMid.position.y = 20;
    group.add(hullMid);

    const hullTop = new THREE.Mesh(
      new THREE.CylinderGeometry(58, 95, 18, 18),
      new THREE.MeshPhongMaterial({ color: 0x475569, emissive: 0x1e3a5f, emissiveIntensity: 0.35, shininess: 80 }),
    );
    hullTop.position.y = 38;
    group.add(hullTop);

    // ③ 조종석 돔 — 반투명 유리
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(52, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhongMaterial({
        color: 0x7dd3fc,
        transparent: true, opacity: 0.55,
        emissive: 0x1d4ed8, emissiveIntensity: 0.55,
        shininess: 200,
      }),
    );
    cockpit.position.y = 50;
    group.add(cockpit);

    // ④ 안테나 + 신호 램프
    const antStalk = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 5, 34, 8),
      new THREE.MeshPhongMaterial({ color: 0x334155, shininess: 55 }),
    );
    antStalk.position.y = 86;
    group.add(antStalk);

    const antLight = new THREE.Mesh(
      new THREE.SphereGeometry(8, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    antLight.position.y = 103;
    group.add(antLight);

    // ⑤ 선체 외장 패널 8개 (디스크 테두리)
    const panelMat = new THREE.MeshPhongMaterial({ color: 0x475569, emissive: 0x0f172a, shininess: 45 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 18), panelMat);
      panel.position.set(Math.cos(a) * 158, 2, Math.sin(a) * 158);
      panel.rotation.y = a;
      group.add(panel);
    }

    // ⑥ 하단 엔진 포드 6개 (디스크 아래 발광)
    const enginePods: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const a   = (i / 6) * Math.PI * 2;
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(11, 9, 14, 10),
        new THREE.MeshPhongMaterial({ color: 0x1e3a5f, emissive: 0x3b82f6, emissiveIntensity: 0.9, shininess: 90 }),
      );
      pod.position.set(Math.cos(a) * 115, -13, Math.sin(a) * 115);
      group.add(pod);
      enginePods.push(pod);
    }

    // ⑦ 하단 발광 링 (토러스)
    const ringLower = new THREE.Mesh(
      new THREE.TorusGeometry(172, 7, 10, 44),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    ringLower.position.y = -5;
    group.add(ringLower);

    // ⑧ 스캔 빔 — 역원뿔
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(85, UFO_HEIGHT - 40, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc, transparent: true, opacity: 0.10,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    beam.rotation.x = Math.PI; // 빔이 아래를 향하도록
    beam.position.y = -(UFO_HEIGHT - 40) / 2;
    group.add(beam);

    // ⑨ 지면 원형 그림자
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(145, 20),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 44;
    group.add(shadow);

    // ⑩ 전체 글로우 후광
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(210, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0x3b82f6, transparent: true, opacity: 0.06,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    group.add(glow);

    // ── GLB 우주선 시각 치환 (enhanced 모드) ──────────────────────────────────
    // 기존 절차적 UFO 메시: visible=false (hover·bank 애니메이션은 숨겨진 채 계속 실행)
    // GLB spaceship: 부모 그룹의 hover·bank 애니메이션 그대로 상속; PBR texture 원본 유지
    if (this.spaceshipTemplate) {
      const ship = this.spaceshipTemplate.clone(true);
      ship.frustumCulled = false;
      ship.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh) return;
        m.frustumCulled = false;
      });

      // source bounds 측정 → uniform scale (width ~330 기준)
      ship.updateWorldMatrix(true, true);
      const srcBox  = new THREE.Box3().setFromObject(ship);
      const srcSize = srcBox.getSize(new THREE.Vector3());
      if (srcSize.x > 0.001 && srcSize.y > 0.001) {
        const scale = Math.min(330 / srcSize.x, 130 / srcSize.y, 220 / srcSize.z);
        ship.scale.set(scale, scale * 1.30, scale); // Y축 30% 증가 — 우주선 세로 비율 보정
        // 수직 중심을 그룹 Y=0 (UFO_HEIGHT 부유 높이)에 정렬
        const scaledBox = new THREE.Box3().setFromObject(ship);
        ship.position.y = -(scaledBox.min.y + scaledBox.max.y) / 2;
      }

      for (const c of [...group.children]) c.visible = false;
      group.add(ship);
    }

    group.position.set(0, UFO_HEIGHT, -(this.bridgeLength * 0.2));
    bridge.mesh.add(group);
    this.ufos.push({
      mesh: group,
      warned: false, duckStarted: false, passed: false,
      age: 0,
      discBody, ringLower, beam, antLight, enginePods,
    });
    return true;
  }

  // ── 파편·코인 ────────────────────────────────────────────────────────────────

  spawnShards(pos: THREE.Vector3, count: number, isGold: boolean): void {
    const scale = this.cb.getShardScale?.() ?? 1;
    const n = Math.floor(count * scale);
    for (let i = 0; i < n; i++) {
      const s = 10 + Math.random() * 34;
      const geo = new THREE.BoxGeometry(
        s,
        s * (0.35 + Math.random() * 0.8),
        s * (0.2 + Math.random() * 0.5),
      );
      // 파편 색: 나무 갈색 계열 or 금색
      const shardColors = isGold
        ? [0xfacc15, 0xf59e0b, 0xfde68a]
        : [0x7c4e1e, 0x9b6228, 0xc4892a, 0x4a2c10, 0xff6600];
      const mat = new THREE.MeshBasicMaterial({
        color: shardColors[Math.floor(Math.random() * shardColors.length)],
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      const spd   = 6 + Math.random() * 14;
      const vel   = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * spd,
        4 + Math.random() * 14,
        Math.sin(phi) * Math.sin(theta) * spd,
      );
      this.scene.add(mesh);
      this.shards.push({ mesh, vel, life: 1, type: isGold ? 'coin' : 'shard' });
    }
  }

  // ── 펀치 벽 API ─────────────────────────────────────────────────────────────

  hitPunchWall(): boolean {
    const box = this.wallBreakRef;
    if (!box) return true;
    box.hitCount++;
    const targetIdx = box.hitCount - 1;
    box.mesh.traverse((child) => {
      if ((child as THREE.Object3D).userData['hpIndex'] === targetIdx) child.visible = false;
    });
    box.mesh.getWorldPosition(this._tmpVec);
    this._tmpVec.y += 80;
    this.spawnShards(this._tmpVec, 28, false);  // 타격마다 파편 더 많이
    return box.hitCount >= PUNCH_WALL_HP;
  }

  breakPunchWall(): void {
    const box = this.wallBreakRef;
    if (!box) return;
    box.mesh.getWorldPosition(this._tmpVec);
    this.spawnShards(this._tmpVec, 280, box.reward); // 최종 폭발 대량 파편
    box.bridgeRef.hasBox = false;
    box.mesh.parent?.remove(box.mesh);
    const idx = this.boxes.indexOf(box);
    if (idx >= 0) this.boxes.splice(idx, 1);
    this.wallBreakRef = null;
  }

  // ── 메인 업데이트 ────────────────────────────────────────────────────────────

  update(dt: number, playerWorldZ: number): void {
    const dt60 = dt * 60;

    // 박스·킥 배럴
    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const box = this.boxes[i];

      if (box.isKick) {
        box.rollAngle += dt60 * 0.18;
        box.mesh.traverse((child) => {
          if (child.userData['isKickRoll']) child.rotation.x = box.rollAngle;
        });
      }

      const wz = box.mesh.getWorldPosition(this._tmpVec).z;

      // 펀치 벽: 더 가까이(100 units 앞)에서 타격 시작
      if (box.isReach && !box.autoHitDone && wz > playerWorldZ - WALL_TRIGGER_DIST) {
        box.autoHitDone = true;
        this.wallBreakRef = box;
        this.cb.onPunchWallEnter?.();
        continue;
      }

      if (box.isKick && !box.warnFired && wz > BOX_WARN_Z) {
        box.warnFired = true;
        this.cb.onKickWarn?.();
      }

      if (!box.isReach && !box.isKick && !box.warnFired && wz > BOX_WARN_Z) {
        box.warnFired = true;
        this.cb.onBoxWarn?.(false);
      }

      if (box.isKick && !box.autoHitDone && wz > BOX_AUTO_HIT_Z) {
        box.autoHitDone = true;
        box.mesh.getWorldPosition(this._tmpVec);
        this._tmpVec.y += KICK_CENTER_ABOVE_DECK;
        this.spawnShards(this._tmpVec, 120, false);
        this.cb.onKickAutoHit?.();
        this.cb.onCameraShake?.(0.9, 140);
        this.cb.onFlash?.();
        box.bridgeRef.hasBox = false;
        box.mesh.parent?.remove(box.mesh);
        this.boxes.splice(i, 1);
        continue;
      }

      if (!box.isReach && !box.isKick && !box.autoHitDone && wz > BOX_AUTO_HIT_Z) {
        box.autoHitDone = true;
        box.mesh.getWorldPosition(this._tmpVec);
        this.spawnShards(this._tmpVec, 140, box.reward); // 파편 대폭 증가
        this.cb.onBoxAutoHit?.(false);
        this.cb.onBoxHit?.(box.reward);
        this.cb.onCameraShake?.(box.reward ? 1.5 : 1.0, 150);
        this.cb.onFlash?.();
        box.bridgeRef.hasBox = false;
        box.mesh.parent?.remove(box.mesh);
        this.boxes.splice(i, 1);
        continue;
      }

      if (wz > BOX_DESTROY_Z) {
        box.bridgeRef.hasBox = false;
        box.mesh.parent?.remove(box.mesh);
        this.boxes.splice(i, 1);
      }
    }

    // UFO
    for (const ufo of this.ufos) {
      ufo.age += dt;

      // 호버링 + 좌우 뱅킹 (우주선 특유의 불안정한 부유감)
      ufo.mesh.position.y = UFO_HEIGHT + Math.sin(ufo.age * 2.4) * 13;
      ufo.mesh.rotation.z = Math.sin(ufo.age * 1.6) * 0.20;
      ufo.mesh.rotation.x = -0.06 + Math.sin(ufo.age * 0.9) * 0.06;

      // 선체 디스크 자체 회전
      ufo.discBody.rotation.y = ufo.age * 1.2;

      // 빔 펄스
      (ufo.beam.material as THREE.MeshBasicMaterial).opacity =
        0.06 + Math.abs(Math.sin(ufo.age * 5.5)) * 0.18;

      // 링 펄스
      (ufo.ringLower.material as THREE.MeshBasicMaterial).opacity =
        0.45 + Math.sin(ufo.age * 4.0) * 0.22;

      // 안테나 신호 램프 깜빡임
      const antOn = Math.sin(ufo.age * 8) > 0.3;
      (ufo.antLight.material as THREE.MeshBasicMaterial).color.setHex(antOn ? 0xff2222 : 0x440000);

      // 엔진 포드 순차 점등
      ufo.enginePods.forEach((pod, i) => {
        const on = Math.sin(ufo.age * 6 - i * 1.05) > 0;
        (pod.material as THREE.MeshPhongMaterial).emissiveIntensity = on ? 1.1 : 0.3;
      });

      const wz = ufo.mesh.getWorldPosition(this._tmpVec).z;

      // UFO 600 units 앞에서 경고 → 더 긴 반응 시간
      if (!ufo.warned && wz > playerWorldZ - 600) {
        ufo.warned = true;
        this.cb.onUfoWarn?.();
      }
      if (!ufo.duckStarted && wz > playerWorldZ - 200) {
        ufo.duckStarted = true;
        this.cb.onUfoDuckStart?.();
      }
      if (!ufo.passed && wz > playerWorldZ + 100) {
        ufo.passed = true;
        this.cb.onUfoPassed?.();
      }
    }
    this.ufos = this.ufos.filter((u) => {
      const wz = u.mesh.getWorldPosition(this._tmpVec).z;
      if (wz > playerWorldZ + 500) {
        u.mesh.parent?.remove(u.mesh);
        return false;
      }
      return true;
    });

    // 파편·코인
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.vel.y -= (s.type === 'coin' ? 0.35 : 0.55) * dt60;
      s.vel.multiplyScalar(Math.pow(0.965, dt60));
      s.mesh.position.addScaledVector(s.vel, dt60 * 0.55);
      s.mesh.rotation.x += s.vel.x * 0.012;
      s.mesh.rotation.z += s.vel.z * 0.012;
      s.life -= (s.type === 'coin' ? 0.010 : 0.022) * dt60;
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, s.life);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.shards.splice(i, 1);
      }
    }
  }

  clearAll(): void {
    for (const b of this.boxes) b.mesh.parent?.remove(b.mesh);
    for (const u of this.ufos) u.mesh.parent?.remove(u.mesh);
    for (const s of this.shards) this.scene.remove(s.mesh);
    this.boxes = [];
    this.ufos = [];
    this.shards = [];
    this.wallBreakRef = null;
  }
}
