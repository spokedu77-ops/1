/**
 * Flow 2.0 — ObstacleManager
 * 지원 장애물:
 *   box (punch) / punchWall (reach) / ufo (duck) / shard·coin
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
const STANDARD_BOX_Y  = 40;
const PUNCH_WALL_HP   = 5;    // 펀치 벽 총 타격 횟수
const WALL_W          = 110;  // 더 넓게
const WALL_H          = 230;  // 더 높게
const WALL_TRIGGER_DIST = 100; // 플레이어 100 units 앞에서 타격 시퀀스 시작

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
  reward: boolean;
  warnedReach: boolean;
  warnFired: boolean;
  bridgeRef: FlowBridge;
  autoHitDone: boolean;
  hitCount: number;
}

interface UfoEntity {
  mesh: THREE.Group;
  warned: boolean;
  duckStarted: boolean;
  passed: boolean;
  age: number;
}

interface ShardEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  type: 'shard' | 'coin';
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface ObstacleCallbacks {
  onBoxHit?: (reward: boolean) => void;
  onBoxWarn?: (isReach: boolean) => void;
  onBoxAutoHit?: (isReach: boolean) => void;
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

  constructor(scene: THREE.Scene, bridgeLength: number, cb: ObstacleCallbacks = {}) {
    this.scene = scene;
    this.bridgeLength = bridgeLength;
    this.cb = cb;
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
    const yPos = isReach ? 0 : STANDARD_BOX_Y;
    const localZ = isReach ? -(this.bridgeLength * 0.25) : -(this.bridgeLength * 0.1);
    group.position.set(0, yPos, localZ);
    bridge.mesh.add(group);
    this.boxes.push({
      mesh: group, isReach, reward,
      warnedReach: false, warnFired: false,
      bridgeRef: bridge, autoHitDone: false, hitCount: 0,
    });
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
      // ── 나무 크레이트 (펀치 박스) ─────────────────────────────────────────
      const CW = 72, CH = 56, CD = 64;
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
        new THREE.SphereGeometry(60, 8, 6),
        new THREE.MeshBasicMaterial({
          color: glowColor, transparent: true, opacity: 0.28,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      glow.position.y = cy;
      g.add(glow);
    }

    return g;
  }

  // ── UFO ─────────────────────────────────────────────────────────────────────

  attachUfo(bridge: FlowBridge): boolean {
    const group = new THREE.Group();

    // ① 메인 디스크 — 더 납작하고 넓게
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(160, 175, 14, 16),
      new THREE.MeshPhongMaterial({
        color: 0xc0e8ff,
        emissive: 0x2563eb,
        emissiveIntensity: 0.5,
        shininess: 110,
      }),
    );
    group.add(disc); // children[0]

    // ② 돔
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(125, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhongMaterial({
        color: 0x93c5fd,
        transparent: true, opacity: 0.55,
        emissive: 0x1d4ed8, emissiveIntensity: 0.3,
      }),
    );
    dome.position.y = 7;
    group.add(dome); // children[1]

    // ③ 스캔 빔 (아래로)
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(65, 5, UFO_HEIGHT - 50, 10),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc, transparent: true, opacity: 0.14,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    beam.position.y = -(UFO_HEIGHT - 50) / 2;
    group.add(beam); // children[2]

    // ④ 지면 그림자 원
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(130, 16),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 42;
    group.add(shadow); // children[3]

    // ⑤ 하단 발광 링
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(140, 6, 8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    group.add(ring); // children[4]

    // ⑥ 디스크 하단 포드 4개 (소형 엔진)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const pod = new THREE.Mesh(
        new THREE.SphereGeometry(12, 8, 6),
        new THREE.MeshPhongMaterial({ color: 0x1e40af, emissive: 0x3b82f6, emissiveIntensity: 0.8, shininess: 80 }),
      );
      pod.position.set(Math.cos(angle) * 130, -8, Math.sin(angle) * 130);
      group.add(pod);
    }

    group.position.set(0, UFO_HEIGHT, -(this.bridgeLength * 0.2));
    bridge.mesh.add(group);
    this.ufos.push({ mesh: group, warned: false, duckStarted: false, passed: false, age: 0 });
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

    // 박스
    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const box = this.boxes[i];
      const wz = box.mesh.getWorldPosition(this._tmpVec).z;

      // 펀치 벽: 더 가까이(100 units 앞)에서 타격 시작
      if (box.isReach && !box.autoHitDone && wz > playerWorldZ - WALL_TRIGGER_DIST) {
        box.autoHitDone = true;
        this.wallBreakRef = box;
        this.cb.onPunchWallEnter?.();
        continue;
      }

      if (!box.isReach && !box.warnFired && wz > BOX_WARN_Z) {
        box.warnFired = true;
        this.cb.onBoxWarn?.(false);
      }

      if (!box.isReach && !box.autoHitDone && wz > BOX_AUTO_HIT_Z) {
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

      // 호버링 + 기울기 + 빔 펄스 애니메이션
      ufo.mesh.position.y   = UFO_HEIGHT + Math.sin(ufo.age * 2.6) * 14;
      ufo.mesh.rotation.z   = Math.sin(ufo.age * 1.7) * 0.24;  // 좌우 뱅킹
      ufo.mesh.rotation.x   = -0.08 + Math.sin(ufo.age * 1.1) * 0.07; // 앞뒤 흔들

      // 디스크 자체 회전
      const disc = ufo.mesh.children[0] as THREE.Mesh;
      if (disc) disc.rotation.y = ufo.age * 1.5;

      // 빔 opacity 펄스
      const beam = ufo.mesh.children[2] as THREE.Mesh;
      if (beam?.material) {
        (beam.material as THREE.MeshBasicMaterial).opacity =
          0.06 + Math.abs(Math.sin(ufo.age * 5.2)) * 0.16;
      }

      // 발광 링 펄스
      const ring = ufo.mesh.children[4] as THREE.Mesh;
      if (ring?.material) {
        (ring.material as THREE.MeshBasicMaterial).opacity =
          0.4 + Math.sin(ufo.age * 3.8) * 0.22;
      }

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
