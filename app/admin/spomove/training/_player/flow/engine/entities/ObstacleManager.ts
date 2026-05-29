/**
 * Flow 2.0 — ObstacleManager
 * 지원 장애물:
 *   box (punch) / punchWall (reach) / ufo (duck) / shard·coin
 */

import * as THREE from 'three';
import type { FlowModuleKey } from '../modules/flowModules';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const BOX_WARN_Z      = -200;  // 박스 접근 경고: 약 350ms 전 (500유닛/1440속도)
const BOX_AUTO_HIT_Z  = 300;   // 일반 박스 자동 파괴 Z
const BOX_DESTROY_Z   = 450;
const BOX_RATE        = 0.55;
const UFO_RATE        = 0.45;
const UFO_HEIGHT      = 180;
const STANDARD_BOX_Y  = 40;
const PUNCH_WALL_HP   = 5;    // 펀치 벽 총 타격 횟수
const WALL_W          = 90;
const WALL_H          = 210;

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
  isReach: boolean;   // true = 다단 펀치 벽(REACH), false = 일반 박스(PUNCH)
  reward: boolean;
  warnedReach: boolean;
  warnFired: boolean;
  bridgeRef: FlowBridge;
  autoHitDone: boolean;
  hitCount: number;   // 펀치 벽 전용: 현재까지 맞은 횟수 (0 → PUNCH_WALL_HP-1)
}

interface UfoEntity {
  mesh: THREE.Group;
  warned: boolean;
  duckStarted: boolean;
  passed: boolean;
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
  onBoxAutoHit?: (isReach: boolean) => void; // 일반 박스 자동 파괴
  onPunchWallEnter?: () => void;             // 펀치 벽 진입 → FlowEngine이 타격 시퀀스 제어
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
  private wallBreakRef: BoxEntity | null = null; // 현재 타격 중인 펀치 벽

  private goldBudget = 3;
  private goldSpawned = 0;

  constructor(scene: THREE.Scene, bridgeLength: number, cb: ObstacleCallbacks = {}) {
    this.scene = scene;
    this.bridgeLength = bridgeLength;
    this.cb = cb;
  }

  resetGold(budget: number): void {
    this.goldBudget = budget;
    this.goldSpawned = 0;
  }

  // ── 슬롯 체크 ──────────────────────────────────────────────────────────────

  hasActiveBox(): boolean { return this.boxes.length > 0; }
  hasActiveUfo(): boolean { return this.ufos.some((u) => !u.passed); }

  // ── 스폰 결정 ───────────────────────────────────────────────────────────────

  shouldSpawnBox(activeModules: Set<FlowModuleKey>): boolean {
    if (!activeModules.has('punch') && !activeModules.has('reach')) return false;
    if (this.boxes.length > 0) return false; // 동시 다중 박스/벽 방지
    // reach 전용일 때 더 높은 확률 (단독 모듈이라 자주 보여야 함)
    const rate = activeModules.has('reach') && !activeModules.has('punch') ? 0.72 : BOX_RATE;
    return Math.random() < rate;
  }

  shouldSpawnUfo(activeModules: Set<FlowModuleKey>): boolean {
    if (!activeModules.has('duck')) return false;
    if (this.boxes.length > 0) return false;
    if (this.ufos.some((u) => !u.passed)) return false; // 동시 다중 UFO 방지
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
    // 벽은 브릿지 더 앞쪽(-25%)에 배치 → 더 일찍, 더 크게 보임
    const localZ = isReach ? -(this.bridgeLength * 0.25) : -(this.bridgeLength * 0.1);
    group.position.set(0, yPos, localZ);
    bridge.mesh.add(group);
    this.boxes.push({ mesh: group, isReach, reward, warnedReach: false, warnFired: false, bridgeRef: bridge, autoHitDone: false, hitCount: 0 });
  }

  private makeBox(isReach: boolean, reward: boolean): THREE.Group {
    const g = new THREE.Group();

    if (isReach) {
      // PUNCH WALL: 브릿지 전폭을 막는 황금색 다단 펀치 벽
      const surfY = 40; // bridge top surface Y (bridge-local)
      const centerY = surfY + WALL_H / 2;

      // 벽 몸체
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_W, WALL_H, 14),
        new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4, shininess: 55 }),
      );
      body.position.y = centerY;
      g.add(body);

      // 가로 보강재 (시각적 분리선)
      for (let r = 1; r < 3; r++) {
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_W + 2, 5, 16),
          new THREE.MeshBasicMaterial({ color: 0x92400e }),
        );
        rib.position.y = surfY + (WALL_H / 3) * r;
        g.add(rib);
      }

      // HP 바 세그먼트 3개 — 벽 위쪽
      for (let hp = 0; hp < PUNCH_WALL_HP; hp++) {
        const seg = new THREE.Mesh(
          new THREE.BoxGeometry(22, 10, 16),
          new THREE.MeshBasicMaterial({ color: 0xfde68a }),
        );
        seg.position.set(-23 + hp * 24, surfY + WALL_H + 12, 0);
        seg.userData['hpIndex'] = hp;
        g.add(seg);
      }

      // 글로우
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_W + 22, WALL_H + 22, 26),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      glow.position.y = centerY;
      g.add(glow);
    } else {
      // PUNCH: 선명한 주황, 표준 크기
      const glowColor = reward ? 0xfacc15 : 0xff6600;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(65, 45, 55),
        new THREE.MeshPhongMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.4, shininess: 40 }),
      );
      body.position.y = 22.5;
      g.add(body);

      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(68, 18, 58),
        new THREE.MeshPhongMaterial({ color: 0xff9933, emissive: 0xff6600, emissiveIntensity: 0.35, shininess: 50 }),
      );
      lid.position.y = 50;
      g.add(lid);

      const band = new THREE.Mesh(
        new THREE.BoxGeometry(18, 70, 60),
        new THREE.MeshPhongMaterial({ color: 0xcc2200, emissive: 0xcc2200, emissiveIntensity: 0.5, shininess: 60 }),
      );
      band.position.y = 35;
      g.add(band);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(75, 10, 6),
        new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      glow.position.y = 35;
      g.add(glow);
    }

    return g;
  }

  // ── UFO ─────────────────────────────────────────────────────────────────────

  attachUfo(bridge: FlowBridge): boolean {
    const group = new THREE.Group();

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(150, 160, 12, 12),
      new THREE.MeshPhongMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.45, shininess: 90 }),
    );
    group.add(disc);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(120, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.55 }),
    );
    dome.position.y = 6;
    group.add(dome);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(60, 5, UFO_HEIGHT - 50, 8),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    beam.position.y = -(UFO_HEIGHT - 50) / 2;
    group.add(beam);

    // 경고 빔 (지면 그림자)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(120, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 42;
    group.add(shadow);

    group.position.set(0, UFO_HEIGHT, -(this.bridgeLength * 0.2));
    bridge.mesh.add(group);
    this.ufos.push({ mesh: group, warned: false, duckStarted: false, passed: false });
    return true;
  }

  // ── 파편·코인 ────────────────────────────────────────────────────────────────

  spawnShards(pos: THREE.Vector3, count: number, isGold: boolean): void {
    const scale = this.cb.getShardScale?.() ?? 1;
    const n = Math.floor(count * scale);
    for (let i = 0; i < n; i++) {
      const geo = new THREE.BoxGeometry(14 + Math.random() * 22, 14 + Math.random() * 22, 10);
      const mat = new THREE.MeshBasicMaterial({
        color: isGold ? 0xfacc15 : 0xff7700,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      const spd   = 4 + Math.random() * 8;
      const vel   = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * spd,
        3 + Math.random() * 10,
        Math.sin(phi) * Math.sin(theta) * spd,
      );
      this.scene.add(mesh);
      this.shards.push({ mesh, vel, life: 1, type: isGold ? 'coin' : 'shard' });
    }
  }

  // ── 펀치 벽 API (FlowEngine이 타격 시퀀스 제어) ─────────────────────────────

  /** 한 번 타격. HP 바 업데이트 + 파편. true 반환 = 마지막 타격 직전까지 완료 */
  hitPunchWall(): boolean {
    const box = this.wallBreakRef;
    if (!box) return true;
    box.hitCount++;
    // HP 바 세그먼트 순서대로 숨김
    const targetIdx = box.hitCount - 1;
    box.mesh.traverse((child) => {
      if ((child as THREE.Object3D).userData['hpIndex'] === targetIdx) child.visible = false;
    });
    const wp = box.mesh.getWorldPosition(new THREE.Vector3());
    this.spawnShards(new THREE.Vector3(wp.x, wp.y + 80, wp.z), 16, false);
    return box.hitCount >= PUNCH_WALL_HP; // true = 시퀀스 완료
  }

  /** 벽 최종 파괴 — 폭발 + 씬에서 제거 */
  breakPunchWall(): void {
    const box = this.wallBreakRef;
    if (!box) return;
    const wp = box.mesh.getWorldPosition(new THREE.Vector3());
    this.spawnShards(wp, 180, box.reward);
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
      const wz = box.mesh.getWorldPosition(new THREE.Vector3()).z;

      // 펀치 벽: 플레이어 180 유닛 앞 — 눈앞에 꽉 차는 거리
      if (box.isReach && !box.autoHitDone && wz > playerWorldZ - 180) {
        box.autoHitDone = true;
        this.wallBreakRef = box;
        this.cb.onPunchWallEnter?.();
        continue;
      }

      // 일반 박스 접근 경고 — 박스가 화면에 보이는 타이밍
      if (!box.isReach && !box.warnFired && wz > BOX_WARN_Z) {
        box.warnFired = true;
        this.cb.onBoxWarn?.(false);
      }

      // 일반 박스 자동 파괴
      if (!box.isReach && !box.autoHitDone && wz > BOX_AUTO_HIT_Z) {
        box.autoHitDone = true;
        const wp = box.mesh.getWorldPosition(new THREE.Vector3());
        this.spawnShards(wp, 65, box.reward);
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
      const wz = ufo.mesh.getWorldPosition(new THREE.Vector3()).z;
      // UFO가 플레이어 350 유닛 앞(~240ms) — 화면에 뚜렷이 보일 때 경고
      if (!ufo.warned && wz > playerWorldZ - 350) {
        ufo.warned = true;
        this.cb.onUfoWarn?.();
      }
      // 카메라 딥: 플레이어 200 유닛 앞 — 통과 직전
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
      const wz = u.mesh.getWorldPosition(new THREE.Vector3()).z;
      if (wz > playerWorldZ + 500) {
        u.mesh.parent?.remove(u.mesh);
        return false;
      }
      return true;
    });

    // 파편·코인
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.vel.y -= (s.type === 'coin' ? 0.35 : 0.45) * dt60;
      s.vel.multiplyScalar(Math.pow(0.97, dt60));
      s.mesh.position.addScaledVector(s.vel, dt60 * 0.55);
      s.life -= (s.type === 'coin' ? 0.012 : 0.028) * dt60;
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, s.life);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.shards.splice(i, 1);
      }
    }
  }

  /** 스테이지 전환 시 모든 장애물 제거 */
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
