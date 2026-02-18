/**
 * Flow Phase - Obstacle Manager
 * 박스(Box), 파편(Shard), UFO 장애물 로직
 * Phase B-1: Constants 연동
 */

import * as THREE from 'three';
import {
  LV3_BOX_RATE,
  LV4_BOX_RATE,
  BOX_DESTROY_Z,
  BOX_CLEANUP_Z,
  HIT_STOP_LEVEL,
  UFO_WARN_SEC,
  UFO_SPAWN_RATE,
  UFO_DUCK_START_Z,
  UFO_PASS_Z,
  UFO_SPEED_MULT,
  UFO_HEIGHT,
} from '../core/coordContract';

// 로컬 별칭 (하위 호환)
const DESTROY_Z = BOX_DESTROY_Z;
const CLEANUP_Z = BOX_CLEANUP_Z;

export interface FlowBridge {
  mesh: THREE.Group;
  hasBox: boolean;
}

export interface BoxEntity {
  mesh: THREE.Group;
  reward: boolean;
}

interface ShardEntity {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  type: 'shard' | 'coin';
}

export interface UfoEntity {
  mesh: THREE.Group;
  duckStarted: boolean;
  passed: boolean;
  warned: boolean;
}

export interface ObstacleManagerCallbacks {
  onFlash?: () => void;
  onCameraTilt?: (amount: number) => void;
  /** 박스 타격 시 position 기반 카메라 흔들림 (기존 flash/tilt와 별도) */
  onCameraShake?: (intensity: number, durationMs: number) => void;
  onPunch?: () => void;
  onCoin?: () => void;
  onShowInstruction?: (text: string, colorClass?: string, ms?: number) => void;
  onUfoSpawned?: () => void;
  onUfoDuckStart?: () => void; // A-2: Duck 시작
  onUfoPassed?: () => void;
  /** LV3 박스 파괴 순간 hit stop 트리거 (1회) */
  onHitStop?: () => void;
  /** UFO duck 0.8초 전 경고 (UFO당 1회) */
  onUfoWarn?: () => void;
}

export class ObstacleManager {
  private scene: THREE.Scene;
  private bridgeLength: number;
  private boxes: BoxEntity[] = [];
  private shards: ShardEntity[] = [];
  private ufos: UfoEntity[] = [];
  private callbacks: ObstacleManagerCallbacks = {};
  private goldBudget = 0;
  private goldSpawned = 0;
  private lv3FirstRewardGiven = false;

  constructor(
    scene: THREE.Scene,
    bridgeLength: number,
    callbacks: ObstacleManagerCallbacks = {}
  ) {
    this.scene = scene;
    this.bridgeLength = bridgeLength;
    this.callbacks = callbacks;
  }

  setGoldBudget(n: number): void {
    this.goldBudget = n;
    this.goldSpawned = 0;
    this.lv3FirstRewardGiven = false;
  }

  shouldSpawnBox(levelNum: number): boolean {
    if (this.ufos.some((ufo) => !ufo.passed)) return false;
    if (levelNum === 3) return Math.random() < LV3_BOX_RATE;
    if (levelNum === 4 || levelNum === 5) return Math.random() < LV4_BOX_RATE;
    return false;
  }

  private decideRewardForLv3(): boolean {
    if (!this.lv3FirstRewardGiven) {
      this.lv3FirstRewardGiven = true;
      this.goldSpawned++;
      return true;
    }
    if (this.goldSpawned < this.goldBudget && Math.random() < 0.55) {
      this.goldSpawned++;
      return true;
    }
    return false;
  }

  private createBoxGroup(reward: boolean): THREE.Group {
    const boxGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(65, 45, 55);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xffedd5,
      emissive: 0xffa07a,
      emissiveIntensity: 0.25,
      shininess: 25,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 22.5;
    boxGroup.add(body);

    const lidGeo = new THREE.BoxGeometry(68, 18, 58);
    const lidMat = new THREE.MeshPhongMaterial({
      color: 0xfde68a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.3,
      shininess: 40,
    });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 50;
    boxGroup.add(lid);

    const bandGeo = new THREE.BoxGeometry(18, 70, 60);
    const bandMat = new THREE.MeshPhongMaterial({
      color: 0x2563eb,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.4,
      shininess: 60,
    });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 35;
    boxGroup.add(band);

    const glowGeo = new THREE.SphereGeometry(75, 12, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: reward ? 0xfacc15 : 0xf97316,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 35;
    boxGroup.add(glow);

    return boxGroup;
  }

  attachBoxToBridge(bridge: FlowBridge, levelNum: number): void {
    if (!bridge || bridge.hasBox) return;
    bridge.hasBox = true;

    let reward = false;
    if (levelNum === 3) reward = this.decideRewardForLv3();
    else if (levelNum === 4 || levelNum === 5) reward = Math.random() < 0.3;

    const boxGroup = this.createBoxGroup(reward);
    const localZ = -(this.bridgeLength * 0.1);
    boxGroup.position.set(0, 40, localZ);
    bridge.mesh.add(boxGroup);
    this.boxes.push({ mesh: boxGroup, reward });
  }

  /** UFO: 레벨 4 이상. 다리(bridge) 위에 스폰, 다리와 함께 이동 */
  trySpawnUfo(levelNum: number, bridge: FlowBridge): boolean {
    if (levelNum < 4 || Math.random() >= UFO_SPAWN_RATE) return false;

    const group = new THREE.Group();

    const discGeo = new THREE.CylinderGeometry(150, 160, 12, 12, 1);
    const discMat = new THREE.MeshPhongMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      shininess: 90,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    group.add(disc);

    const domeGeo = new THREE.SphereGeometry(
      120,
      12,
      6,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0xbfdbfe,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 6;
    group.add(dome);

    // 다리 중간에 배치. x=0(3레인 전체 커버), y=UFO_HEIGHT, z=0(다리 중앙)
    group.position.set(0, UFO_HEIGHT, 0);
    bridge.mesh.add(group);

    this.ufos.push({ mesh: group, duckStarted: false, passed: false, warned: false });
    this.callbacks.onUfoSpawned?.();
    return true;
  }

  private destroyBox(box: BoxEntity, index: number, currentLevelNum: number): void {
    const pos = new THREE.Vector3();
    box.mesh.getWorldPosition(pos);

    this.callbacks.onFlash?.();
    this.callbacks.onCameraTilt?.(Math.random() > 0.5 ? 0.2 : -0.2);
    this.callbacks.onCameraShake?.(0.18, 120);
    this.callbacks.onPunch?.();
    if (currentLevelNum === HIT_STOP_LEVEL) {
      this.callbacks.onHitStop?.();
    }
    if (currentLevelNum === 3 || currentLevelNum === 5) {
      this.callbacks.onShowInstruction?.('PUNCH!', 'text-red-400', 220);
    }

    const shardCount = 18 + Math.floor(Math.random() * 15);
    for (let i = 0; i < shardCount; i++) {
      const sSize = 12 + Math.random() * 18;
      const sGeo = new THREE.BoxGeometry(sSize, sSize * 0.5, sSize * 0.3);
      const sMat = new THREE.MeshPhongMaterial({
        color: 0x5d4037,
        emissive: 0x2a1500,
        transparent: true,
        shininess: 10,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);

      const angle = Math.random() * Math.PI * 2;
      const force = 18 + Math.random() * 22;
      const vel = new THREE.Vector3(
        Math.cos(angle) * force,
        Math.random() * 20 + 12,
        Math.sin(angle) * force
      );

      (sMesh.userData as { rotationVel?: THREE.Vector3 }).rotationVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );

      this.scene.add(sMesh);
      sMesh.position.copy(pos);
      this.shards.push({ mesh: sMesh, velocity: vel, life: 1.8, type: 'shard' });
    }

    if (box.reward) {
      this.callbacks.onCoin?.();
      const coinCount = 14 + Math.floor(Math.random() * 6);
      for (let i = 0; i < coinCount; i++) {
      const cGeo = new THREE.CylinderGeometry(8, 8, 3, 12, 1);
      const cMat = new THREE.MeshPhongMaterial({
        color: 0xfacc15,
        emissive: 0xf97316,
        emissiveIntensity: 0.6,
        shininess: 320,
        transparent: true,
      });
        const cMesh = new THREE.Mesh(cGeo, cMat);
        cMesh.rotation.x = Math.PI / 2;

        const angle = Math.random() * Math.PI * 2;
        const force = 10 + Math.random() * 16;
        const vel = new THREE.Vector3(
          Math.cos(angle) * force,
          55 + Math.random() * 35,
          Math.sin(angle) * force
        );

        (cMesh.userData as { rotationSpeed?: number }).rotationSpeed = (Math.random() - 0.5) * 0.45;

        this.scene.add(cMesh);
        cMesh.position.copy(pos);
        this.shards.push({
          mesh: cMesh,
          velocity: vel,
          life: 3.2,
          type: 'coin',
        });
      }
    }

    if (box.mesh.parent) box.mesh.parent.remove(box.mesh);
    this.boxes.splice(index, 1);
  }

  update(
    dt60: number,
    currentSpeed: number,
    currentLevelNum: number,
    playerZ: number,
    playerX: number
  ): void {
    const worldPos = new THREE.Vector3();

    for (let i = this.boxes.length - 1; i >= 0; i--) {
      const box = this.boxes[i];
      if (!box.mesh) {
        this.boxes.splice(i, 1);
        continue;
      }
      box.mesh.rotation.y += 0.015 * dt60;
      box.mesh.getWorldPosition(worldPos);

      if (worldPos.z >= DESTROY_Z) {
        this.destroyBox(box, i, currentLevelNum);
      } else if (worldPos.z > CLEANUP_Z) {
        if (box.mesh.parent) box.mesh.parent.remove(box.mesh);
        this.boxes.splice(i, 1);
      }
    }

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      const vel = s.velocity.clone().multiplyScalar(dt60);
      s.mesh.position.add(vel);

      s.velocity.y -= (s.type === 'coin' ? 0.35 : 0.45) * dt60;
      s.velocity.multiplyScalar(Math.pow(0.97, dt60));
      s.life -= (s.type === 'coin' ? 0.012 : 0.028) * dt60;

      const ud = s.mesh.userData as { rotationVel?: THREE.Vector3; rotationSpeed?: number };
      if (ud.rotationVel) {
        s.mesh.rotation.x += ud.rotationVel.x * dt60;
        s.mesh.rotation.y += ud.rotationVel.y * dt60;
        s.mesh.rotation.z += ud.rotationVel.z * dt60;
      } else if (ud.rotationSpeed) {
        s.mesh.rotation.z += ud.rotationSpeed * dt60;
      }

      if ((s.mesh.material as THREE.MeshPhongMaterial).transparent) {
        (s.mesh.material as THREE.MeshPhongMaterial).opacity = Math.max(0, s.life);
      }

      const scaleFactor = Math.max(0.35, s.life);
      s.mesh.scale.setScalar(scaleFactor);

      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.shards.splice(i, 1);
      }
    }

    const warnDistanceZ = currentSpeed * 50 * 60 * UFO_WARN_SEC;
    for (let i = this.ufos.length - 1; i >= 0; i--) {
      const ufo = this.ufos[i];
      // UFO는 다리의 자식이라 다리와 함께 이동. 별도 position 갱신 없음
      ufo.mesh.getWorldPosition(worldPos);
      const warnZ = UFO_DUCK_START_Z - warnDistanceZ;
      if (!ufo.warned && worldPos.z >= warnZ) {
        ufo.warned = true;
        this.callbacks.onUfoWarn?.();
      }
      // A-2: Duck 시작 (UFO가 멀리 있을 때)
      if (!ufo.duckStarted && worldPos.z >= UFO_DUCK_START_Z) {
        ufo.duckStarted = true;
        this.callbacks.onUfoDuckStart?.();
      }
      
      // 통과 완료 (효과음만)
      if (!ufo.passed && worldPos.z > UFO_PASS_Z) {
        ufo.passed = true;
        this.callbacks.onUfoPassed?.();
      }
      
      if (worldPos.z > 3000) {
        ufo.mesh.parent?.remove(ufo.mesh);
        this.ufos.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const b of this.boxes) {
      if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
      b.mesh.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          (o.material as THREE.Material)?.dispose();
        }
      });
    }
    this.boxes.length = 0;
    for (const s of this.shards) {
      this.scene.remove(s.mesh);
      s.mesh.geometry?.dispose();
      (s.mesh.material as THREE.Material)?.dispose();
    }
    this.shards.length = 0;
    for (const u of this.ufos) {
      u.mesh.parent?.remove(u.mesh);
      u.mesh.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry?.dispose();
          (o.material as THREE.Material)?.dispose();
        }
      });
    }
    this.ufos.length = 0;
  }
}
