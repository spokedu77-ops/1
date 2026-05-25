/**
 * Flow 2.0 — ObstacleManager
 * 모듈 조건 기반 장애물 생성·업데이트·제거
 *
 * 지원 장애물:
 *   box        — punch 모듈 (일반 박스)
 *   reachBox   — reach 모듈 (높은 보라 박스)
 *   ufo        — duck 모듈
 *   sprintGate — sprint 모듈 (청록 링 아치)
 *   freezeWall — freeze 모듈 (얼음 벽)
 *   shard/coin — 파편·코인 파티클
 */

import * as THREE from 'three';
import type { FlowModuleKey } from '../modules/flowModules';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const BOX_WARN_Z     = -200;  // 어드밴스 경고: 박스가 이 Z 넘으면 PUNCH 텍스트
const BOX_AUTO_HIT_Z = 300;   // 자동 파괴 이펙트: 카메라에서 300 유닛 앞
const BOX_DESTROY_Z  = 450;   // 박스 최종 삭제 Z
const BOX_HIT_Z      = 80;    // tryPunchBox 판정 반경
const BOX_RATE       = 0.55;
const UFO_RATE       = 0.45;
const UFO_HEIGHT     = 180;   // UFO 중심 Y (원본 coordContract 동일)
const REACH_Y        = 200;
const STANDARD_BOX_Y = 40;

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
  onBoxWarn?: (isReach: boolean) => void;      // 어드밴스 경고 (박스 접근)
  onBoxAutoHit?: (isReach: boolean) => void;  // 플레이어 구역 자동 파괴
  onUfoDuckStart?: () => void;
  onUfoPassed?: () => void;
  onUfoWarn?: () => void;
  onSprintGatePassed?: () => void;
  onFreezeWallPassed?: () => void;
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
  private sprintGates: THREE.Group[] = [];
  private freezeWalls: THREE.Group[] = [];

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

  hasSprintGate(): boolean { return this.sprintGates.length > 0; }
  hasFreezeWall(): boolean { return this.freezeWalls.length > 0; }

  // ── 스폰 결정 ───────────────────────────────────────────────────────────────

  shouldSpawnBox(activeModules: Set<FlowModuleKey>): boolean {
    if (!activeModules.has('punch') && !activeModules.has('reach')) return false;
    if (this.ufos.some((u) => !u.passed)) return false;
    return Math.random() < BOX_RATE;
  }

  shouldSpawnUfo(activeModules: Set<FlowModuleKey>): boolean {
    if (!activeModules.has('duck')) return false;
    if (this.boxes.some(() => true)) return false;
    return Math.random() < UFO_RATE;
  }

  // ── 박스 ────────────────────────────────────────────────────────────────────

  attachBox(bridge: FlowBridge, activeModules: Set<FlowModuleKey>): void {
    if (bridge.hasBox) return;
    bridge.hasBox = true;

    const isReach =
      activeModules.has('reach') &&
      (!activeModules.has('punch') || Math.random() < 0.45);

    const reward = this.goldSpawned < this.goldBudget && Math.random() < 0.5;
    if (reward) this.goldSpawned++;

    const group = this.makeBox(isReach, reward);
    const yPos = isReach ? REACH_Y : STANDARD_BOX_Y;
    group.position.set(0, yPos, -(this.bridgeLength * 0.1));
    bridge.mesh.add(group);
    this.boxes.push({ mesh: group, isReach, reward, warnedReach: false, warnFired: false, bridgeRef: bridge, autoHitDone: false });
  }

  private makeBox(isReach: boolean, reward: boolean): THREE.Group {
    const g = new THREE.Group();

    if (isReach) {
      // REACH: 밝은 보라, 1.8× 크기, 하단 글로잉 기둥으로 높이 강조
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(70, 80, 65),
        new THREE.MeshPhongMaterial({ color: 0x9900ff, emissive: 0x6600cc, emissiveIntensity: 0.55, shininess: 90 }),
      );
      body.position.y = 40;
      g.add(body);

      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(76, 20, 70),
        new THREE.MeshPhongMaterial({ color: 0xcc66ff, emissive: 0xaa00ff, emissiveIntensity: 0.5, shininess: 80 }),
      );
      lid.position.y = 86;
      g.add(lid);

      // 바닥까지 이어지는 보라 기둥 → "높이" 시각화
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(14, REACH_Y, 14),
        new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      pillar.position.y = -REACH_Y / 2;
      g.add(pillar);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(90, 10, 6),
        new THREE.MeshBasicMaterial({ color: 0xcc00ff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      glow.position.y = 40;
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

  // ── 스프린트 게이트 ──────────────────────────────────────────────────────────

  attachSprintGate(bridge: FlowBridge): void {
    const g = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(190, 11, 8, 28),
      new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 }),
    );
    ring.position.y = 200;
    g.add(ring);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(190, 28, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    glow.position.y = 200;
    g.add(glow);

    const pilGeo = new THREE.CylinderGeometry(5, 5, 400, 6);
    const pilMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.55 });
    const lp = new THREE.Mesh(pilGeo, pilMat);
    lp.position.set(-190, 200, 0);
    const rp = lp.clone();
    rp.position.set(190, 200, 0);
    g.add(lp, rp);

    g.position.set(0, 0, -(this.bridgeLength * 0.3));
    bridge.mesh.add(g);
    this.sprintGates.push(g);
  }

  // ── 프리즈 벽 ────────────────────────────────────────────────────────────────

  attachFreezeWall(bridge: FlowBridge): void {
    const g = new THREE.Group();

    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(400, 230, 10),
      new THREE.MeshPhongMaterial({ color: 0xbae6fd, emissive: 0x0ea5e9, emissiveIntensity: 0.45, transparent: true, opacity: 0.45, shininess: 80 }),
    );
    wall.position.y = 115;
    g.add(wall);

    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(404, 234, 5),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    edge.position.y = 115;
    g.add(edge);

    g.position.set(0, 0, -(this.bridgeLength * 0.3));
    bridge.mesh.add(g);
    this.freezeWalls.push(g);
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

  // ── 메인 업데이트 ────────────────────────────────────────────────────────────

  update(dt: number, playerWorldZ: number): void {
    const dt60 = dt * 60;

    // 박스
    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const box = this.boxes[i];
      const wz = box.mesh.getWorldPosition(new THREE.Vector3()).z;

      // 어드밴스 경고 (박스가 충분히 가까워졌을 때)
      if (!box.warnFired && wz > BOX_WARN_Z) {
        box.warnFired = true;
        this.cb.onBoxWarn?.(box.isReach);
      }

      // 자동 파괴 이펙트 (카메라에서 300 유닛 앞)
      if (!box.autoHitDone && wz > BOX_AUTO_HIT_Z) {
        box.autoHitDone = true;
        const wp = box.mesh.getWorldPosition(new THREE.Vector3());
        this.spawnShards(wp, box.isReach ? 80 : 65, box.reward);
        this.cb.onBoxAutoHit?.(box.isReach);
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
      // 텍스트 경고: 플레이어 700 유닛 앞 (~0.5초) → 실제로 UFO가 보이기 시작할 때
      if (!ufo.warned && wz > playerWorldZ - 700) {
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

    // 스프린트 게이트 통과 판정 — userData.triggered 로 단 1회만 발화
    this.sprintGates = this.sprintGates.filter((g) => {
      const wz = g.getWorldPosition(new THREE.Vector3()).z;
      if (!g.userData['triggered'] && wz > playerWorldZ - 30 && wz < playerWorldZ + 150) {
        g.userData['triggered'] = true;
        this.cb.onSprintGatePassed?.();
      }
      if (wz > playerWorldZ + 300) {
        g.parent?.remove(g);
        return false;
      }
      return true;
    });

    // 프리즈 벽 통과 판정 — userData.triggered 로 단 1회만 발화
    this.freezeWalls = this.freezeWalls.filter((w) => {
      const wz = w.getWorldPosition(new THREE.Vector3()).z;
      if (!w.userData['triggered'] && wz > playerWorldZ - 30 && wz < playerWorldZ + 150) {
        w.userData['triggered'] = true;
        this.cb.onFreezeWallPassed?.();
      }
      if (wz > playerWorldZ + 300) {
        w.parent?.remove(w);
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

  /** 박스 펀치 시도 — 성공 시 파편 스폰하고 true 반환 */
  tryPunchBox(playerWorldPos: THREE.Vector3, activeModules: Set<FlowModuleKey>): boolean {
    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const box = this.boxes[i];
      const bwz = box.mesh.getWorldPosition(new THREE.Vector3()).z;
      const isReachable = box.isReach
        ? activeModules.has('reach')
        : activeModules.has('punch');
      if (!isReachable) continue;
      if (bwz > playerWorldPos.z - BOX_HIT_Z && bwz < playerWorldPos.z + BOX_HIT_Z) {
        const wp = box.mesh.getWorldPosition(new THREE.Vector3());
        this.spawnShards(wp, box.isReach ? 22 : 18, box.reward);
        box.mesh.parent?.remove(box.mesh);
        this.boxes.splice(i, 1);
        this.cb.onBoxHit?.(box.reward);
        this.cb.onCameraShake?.(box.reward ? 1.2 : 0.8, 120);
        this.cb.onFlash?.();
        return true;
      }
    }
    return false;
  }

  /** 스테이지 전환 시 모든 장애물 제거 */
  clearAll(): void {
    for (const b of this.boxes) b.mesh.parent?.remove(b.mesh);
    for (const u of this.ufos) u.mesh.parent?.remove(u.mesh);
    for (const g of this.sprintGates) g.parent?.remove(g);
    for (const w of this.freezeWalls) w.parent?.remove(w);
    for (const s of this.shards) this.scene.remove(s.mesh);
    this.boxes = [];
    this.ufos = [];
    this.sprintGates = [];
    this.freezeWalls = [];
    this.shards = [];
  }
}
