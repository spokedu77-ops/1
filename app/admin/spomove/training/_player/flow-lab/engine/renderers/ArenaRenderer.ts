/**
 * ArenaRenderer — 좌우 측면 아레나 장식 담당
 *
 * 책임:
 *   - 좌우 측면 플랫폼 (GLB clone pool 우선 / InstancedMesh 폴백)
 *   - 레인 색상 발광 링 (3색 InstancedMesh)
 *   - 운석 (InstancedMesh)
 *   - 장식용 UFO (단일 Mesh)
 *   - 모든 오브젝트가 브릿지와 같은 방향으로 스크롤 · 재순환
 *   - quality tier별 인스턴스 수 조절
 *
 * 중앙 플레이 경로(x ±120)와 충돌 없음 — 순수 장식
 */

import * as THREE from 'three';
import type { QualityTier } from '../AdaptiveQuality';
import { LANE_COLORS } from './BridgeRenderer';

// 스크롤 상수 (FlowEngine bridgeMove = speed * 50 * dt60M 동일)
const RECYCLE_Z   = 950;   // 카메라(z=600) 너머
const CYCLE_DEPTH = 22000; // 전체 순환 범위

// 플랫폼 인스턴스 수
const PLAT_HIGH = 6;
const PLAT_MED  = 4;
const PLAT_LOW  = 3;

// 링 인스턴스 수 (per color)
const RING_HIGH = 3;
const RING_MED  = 2;
const RING_LOW  = 0;

// 운석 인스턴스 수
const METEOR_HIGH = 10;
const METEOR_MED  = 5;
const METEOR_LOW  = 0;

// dive_side_platform.glb 발광 메시 (레인/비콘 tinting)
const PLAT_GLB_PRIMARY = new Set(['EMISSIVE_PRIMARY_LEFT', 'EMISSIVE_PRIMARY_RIGHT', 'EMISSIVE_FRONT']);
const PLAT_GLB_BEACON  = 'BEACON';

export class ArenaRenderer {
  private scene: THREE.Scene;

  // 플랫폼 — InstancedMesh 경로 (GLB 없을 때)
  private platLeft:  THREE.InstancedMesh | null = null;
  private platRight: THREE.InstancedMesh | null = null;
  private platGeo:   THREE.BufferGeometry | null = null;

  // 플랫폼 — GLB clone 경로
  private hasGlbPlatforms = false;
  private glbPlatLeft:  THREE.Group[] = [];
  private glbPlatRight: THREE.Group[] = [];
  private glbPlatCount = 0;
  private glbPlatLMat:  THREE.MeshPhongMaterial | null = null;
  private glbPlatRMat:  THREE.MeshPhongMaterial | null = null;
  private glbBeaconMat: THREE.MeshPhongMaterial | null = null;

  // 링 (레인 3색)
  private ringsGreen:  THREE.InstancedMesh;
  private ringsRed:    THREE.InstancedMesh;
  private ringsYellow: THREE.InstancedMesh;
  private ringGeo:     THREE.BufferGeometry;

  // 운석
  private meteors:    THREE.InstancedMesh;
  private meteorGeo:  THREE.BufferGeometry;

  // UFO 장식
  private ufo: THREE.Mesh;

  // 위치 캐시 (per instance)
  private platLX:  Float32Array;
  private platLY:  Float32Array;
  private platLZ:  Float32Array;
  private platRX:  Float32Array;
  private platRY:  Float32Array;
  private platRZ:  Float32Array;

  private ringGZ:   Float32Array;
  private ringRZ:   Float32Array;
  private ringYZ:   Float32Array;
  private ringGRot: Float32Array;
  private ringRRot: Float32Array;
  private ringYRot: Float32Array;

  private meteorX:   Float32Array;
  private meteorY:   Float32Array;
  private meteorZ:   Float32Array;
  private meteorScl: Float32Array;

  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, qualityTier: QualityTier, platformGlbScene?: THREE.Object3D | null) {
    this.scene = scene;

    const platCount   = qualityTier === 'HIGH' ? PLAT_HIGH  : qualityTier === 'MED' ? PLAT_MED  : PLAT_LOW;
    const ringCount   = qualityTier === 'HIGH' ? RING_HIGH  : qualityTier === 'MED' ? RING_MED  : RING_LOW;
    const meteorCount = qualityTier === 'HIGH' ? METEOR_HIGH : qualityTier === 'MED' ? METEOR_MED : METEOR_LOW;

    // 위치 배열 초기화 (두 경로 모두 사용)
    this.platLX = new Float32Array(Math.max(1, platCount));
    this.platLY = new Float32Array(Math.max(1, platCount));
    this.platLZ = new Float32Array(Math.max(1, platCount));
    this.platRX = new Float32Array(Math.max(1, platCount));
    this.platRY = new Float32Array(Math.max(1, platCount));
    this.platRZ = new Float32Array(Math.max(1, platCount));

    // ── 플랫폼 ─────────────────────────────────────────────────────────────
    if (platformGlbScene && platformGlbScene.children.length > 0) {
      // GLB clone pool 경로
      this.hasGlbPlatforms = true;
      this.glbPlatCount = platCount;

      // dive_side_platform.glb bounds: y[-39..+77] → pivot 39 above bottom
      // X: -(300~500) for left, +(300~500) for right — 플레이 경로(±120) 충분히 외부
      for (let i = 0; i < platCount; i++) {
        this.platLX[i] = -(300 + Math.random() * 200);
        this.platLY[i] = 39;  // 하단이 바닥(Y=0)에 맞닿도록
        this.platLZ[i] = -(Math.random() * CYCLE_DEPTH);
        this.platRX[i] = 300 + Math.random() * 200;
        this.platRY[i] = 39;
        this.platRZ[i] = -(Math.random() * CYCLE_DEPTH);
      }

      this.glbPlatLMat  = new THREE.MeshPhongMaterial({ color: LANE_COLORS[0], emissive: LANE_COLORS[0], emissiveIntensity: 0.85, shininess: 60 });
      this.glbPlatRMat  = new THREE.MeshPhongMaterial({ color: LANE_COLORS[1], emissive: LANE_COLORS[1], emissiveIntensity: 0.85, shininess: 60 });
      this.glbBeaconMat = new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.0, shininess: 80 });

      const tintClone = (isLeft: boolean, i: number): THREE.Group => {
        const clone = platformGlbScene.clone(true) as THREE.Group;
        const primaryMat = isLeft ? this.glbPlatLMat! : this.glbPlatRMat!;
        clone.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (!m.isMesh) return;
          m.frustumCulled = false;
          if (PLAT_GLB_PRIMARY.has(m.name)) {
            m.material = primaryMat;
          } else if (m.name === PLAT_GLB_BEACON) {
            m.material = this.glbBeaconMat!;
          }
        });
        clone.frustumCulled = false;
        clone.position.set(
          isLeft ? this.platLX[i]! : this.platRX[i]!,
          isLeft ? this.platLY[i]! : this.platRY[i]!,
          isLeft ? this.platLZ[i]! : this.platRZ[i]!,
        );
        clone.rotation.y = isLeft ? 0 : Math.PI; // 우측은 트랙 방향으로 미러
        scene.add(clone);
        return clone;
      };

      for (let i = 0; i < platCount; i++) {
        this.glbPlatLeft.push(tintClone(true, i));
        this.glbPlatRight.push(tintClone(false, i));
      }
    } else {
      // InstancedMesh 폴백 (테스트·GLB 없는 환경)
      for (let i = 0; i < platCount; i++) {
        this.platLX[i] = -(240 + Math.random() * 320);
        this.platLY[i] = 15 + Math.random() * 20;
        this.platLZ[i] = -(Math.random() * CYCLE_DEPTH);
        this.platRX[i] = 240 + Math.random() * 320;
        this.platRY[i] = 15 + Math.random() * 20;
        this.platRZ[i] = -(Math.random() * CYCLE_DEPTH);
      }

      this.platGeo = new THREE.BoxGeometry(210, 18, 450);
      const platMat = new THREE.MeshPhongMaterial({
        color: 0x0b1220, emissive: 0x050a18, emissiveIntensity: 1.0, shininess: 75, specular: 0x203060,
      });

      this.platLeft  = new THREE.InstancedMesh(this.platGeo, platMat, Math.max(1, platCount));
      this.platRight = new THREE.InstancedMesh(this.platGeo, platMat, Math.max(1, platCount));
      this.platLeft.count  = platCount;
      this.platRight.count = platCount;
      this.platLeft.frustumCulled  = false;
      this.platRight.frustumCulled = false;

      this.updatePlatMatrices(platCount);
      scene.add(this.platLeft, this.platRight);
    }

    // ── 링 (3색) ───────────────────────────────────────────────────────────
    this.ringGeo = new THREE.TorusGeometry(72, 5.5, 12, 28);

    const ringMatGreen  = new THREE.MeshPhongMaterial({ color: LANE_COLORS[0], emissive: LANE_COLORS[0], emissiveIntensity: 1.0, shininess: 40 });
    const ringMatRed    = new THREE.MeshPhongMaterial({ color: LANE_COLORS[1], emissive: LANE_COLORS[1], emissiveIntensity: 1.0, shininess: 40 });
    const ringMatYellow = new THREE.MeshPhongMaterial({ color: LANE_COLORS[2], emissive: LANE_COLORS[2], emissiveIntensity: 1.0, shininess: 40 });

    this.ringsGreen  = new THREE.InstancedMesh(this.ringGeo, ringMatGreen,  Math.max(1, ringCount));
    this.ringsRed    = new THREE.InstancedMesh(this.ringGeo, ringMatRed,    Math.max(1, ringCount));
    this.ringsYellow = new THREE.InstancedMesh(this.ringGeo, ringMatYellow, Math.max(1, Math.ceil(ringCount * 0.67)));
    this.ringsGreen.count  = ringCount;
    this.ringsRed.count    = ringCount;
    this.ringsYellow.count = Math.ceil(ringCount * 0.67);
    this.ringsGreen.frustumCulled  = false;
    this.ringsRed.frustumCulled    = false;
    this.ringsYellow.frustumCulled = false;

    const rGCount = Math.max(1, ringCount);
    const rYCount = Math.max(1, Math.ceil(ringCount * 0.67));
    this.ringGZ   = new Float32Array(rGCount);
    this.ringRZ   = new Float32Array(rGCount);
    this.ringYZ   = new Float32Array(rYCount);
    this.ringGRot = new Float32Array(rGCount);
    this.ringRRot = new Float32Array(rGCount);
    this.ringYRot = new Float32Array(rYCount);

    for (let i = 0; i < ringCount; i++) {
      this.ringGZ[i]   = -(500 + Math.random() * (CYCLE_DEPTH - 500));
      this.ringRZ[i]   = -(500 + Math.random() * (CYCLE_DEPTH - 500));
      this.ringGRot[i] = Math.random() * Math.PI * 2;
      this.ringRRot[i] = Math.random() * Math.PI * 2;
    }
    for (let i = 0; i < this.ringsYellow.count; i++) {
      this.ringYZ[i]   = -(500 + Math.random() * (CYCLE_DEPTH - 500));
      this.ringYRot[i] = Math.random() * Math.PI * 2;
    }
    this.updateRingMatrices(ringCount, this.ringsYellow.count);
    scene.add(this.ringsGreen, this.ringsRed, this.ringsYellow);

    // ── 운석 ──────────────────────────────────────────────────────────────
    this.meteorGeo = new THREE.IcosahedronGeometry(30, 1);
    const meteorMat = new THREE.MeshPhongMaterial({
      color: 0x1a1f2e, emissive: 0x0a0d15, emissiveIntensity: 1.0, shininess: 20,
    });
    this.meteors = new THREE.InstancedMesh(this.meteorGeo, meteorMat, Math.max(1, meteorCount));
    this.meteors.count = meteorCount;
    this.meteors.frustumCulled = false;

    this.meteorX   = new Float32Array(Math.max(1, meteorCount));
    this.meteorY   = new Float32Array(Math.max(1, meteorCount));
    this.meteorZ   = new Float32Array(Math.max(1, meteorCount));
    this.meteorScl = new Float32Array(Math.max(1, meteorCount));

    for (let i = 0; i < meteorCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      this.meteorX[i]   = side * (800 + Math.random() * 3000);
      this.meteorY[i]   = -30 + Math.random() * 300;
      this.meteorZ[i]   = -(500 + Math.random() * CYCLE_DEPTH);
      this.meteorScl[i] = 0.5 + Math.random() * 1.5;
    }
    this.updateMeteorMatrices(meteorCount);
    scene.add(this.meteors);

    // ── UFO (장식, 1개) ────────────────────────────────────────────────────
    const ufoBody = new THREE.CylinderGeometry(70, 55, 10, 16);
    const ufoDome = new THREE.SphereGeometry(35, 12, 8);
    const ufoMat  = new THREE.MeshPhongMaterial({
      color: 0x1a2440, emissive: 0x0a3060, emissiveIntensity: 0.6, shininess: 90, specular: 0x4080c0,
    });
    const ufoGlow = new THREE.MeshBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: 0.55,
    });
    const ufoGroup = new THREE.Group();
    ufoGroup.add(new THREE.Mesh(ufoBody, ufoMat));
    const dome = new THREE.Mesh(ufoDome, ufoGlow);
    dome.position.y = 12;
    ufoGroup.add(dome);
    ufoGroup.position.set(950, 280, -12000);
    this.ufo = ufoGroup as unknown as THREE.Mesh;
    scene.add(ufoGroup);

    // ── 이번 단계: 모든 장식 오브젝트 비활성화 ────────────────────────────────
    // 조잡한 주변 장식 제거 — 브릿지/장애물 집중 목표
    // 테스트: scene.children 수·InstancedMesh.count·getPlatLZ 구조는 그대로 유지
    if (this.platLeft)   this.platLeft.visible  = false;
    if (this.platRight)  this.platRight.visible  = false;
    for (const g of this.glbPlatLeft)  g.visible = false;
    for (const g of this.glbPlatRight) g.visible = false;
    this.ringsGreen.visible  = false;
    this.ringsRed.visible    = false;
    this.ringsYellow.visible = false;
    this.meteors.visible     = false;
    (this.ufo as unknown as THREE.Group).visible = false;
  }

  private updatePlatMatrices(count: number): void {
    for (let i = 0; i < count; i++) {
      this.dummy.position.set(this.platLX[i]!, this.platLY[i]!, this.platLZ[i]!);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.platLeft!.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(this.platRX[i]!, this.platRY[i]!, this.platRZ[i]!);
      this.dummy.updateMatrix();
      this.platRight!.setMatrixAt(i, this.dummy.matrix);
    }
    this.platLeft!.instanceMatrix.needsUpdate  = true;
    this.platRight!.instanceMatrix.needsUpdate = true;
  }

  private updateRingMatrices(gRCount: number, yCount: number): void {
    const ringY  = [100, 155, 115];
    const ringYX = [290, -420]; // yellow positions

    for (let i = 0; i < gRCount; i++) {
      const gx = (i % 2 === 0 ? -1 : 1) * (280 + i * 50);
      const gy = ringY[i % 3]!;
      this.dummy.position.set(gx, gy, this.ringGZ[i]!);
      this.dummy.rotation.set(0.3 + i * 0.2, this.ringGRot[i]!, 0.1 * i);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.ringsGreen.setMatrixAt(i, this.dummy.matrix);

      const rx = (i % 2 === 0 ? 1 : -1) * (300 + i * 45);
      const ry = ringY[(i + 1) % 3]!;
      this.dummy.position.set(rx, ry, this.ringRZ[i]!);
      this.dummy.rotation.set(0.2 + i * 0.3, this.ringRRot[i]!, -0.1 * i);
      this.dummy.updateMatrix();
      this.ringsRed.setMatrixAt(i, this.dummy.matrix);
    }
    for (let i = 0; i < yCount; i++) {
      const yx = ringYX[i % 2]!;
      this.dummy.position.set(yx, 130 + i * 30, this.ringYZ[i]!);
      this.dummy.rotation.set(0.15, this.ringYRot[i]!, 0.2);
      this.dummy.updateMatrix();
      this.ringsYellow.setMatrixAt(i, this.dummy.matrix);
    }
    this.ringsGreen.instanceMatrix.needsUpdate  = true;
    this.ringsRed.instanceMatrix.needsUpdate    = true;
    this.ringsYellow.instanceMatrix.needsUpdate = true;
  }

  private updateMeteorMatrices(count: number): void {
    for (let i = 0; i < count; i++) {
      this.dummy.position.set(this.meteorX[i]!, this.meteorY[i]!, this.meteorZ[i]!);
      this.dummy.rotation.set(i * 0.8, i * 0.5, i * 0.3);
      this.dummy.scale.setScalar(this.meteorScl[i]!);
      this.dummy.updateMatrix();
      this.meteors.setMatrixAt(i, this.dummy.matrix);
    }
    this.meteors.instanceMatrix.needsUpdate = true;
  }

  update(speed: number, dt60M: number): void {
    const moveZ = speed * 50 * dt60M;

    if (this.hasGlbPlatforms) {
      // GLB clone 경로: 위치 배열 갱신 후 Group.position.z 직접 세팅
      for (let i = 0; i < this.glbPlatCount; i++) {
        this.platLZ[i]! += moveZ;
        if (this.platLZ[i]! > RECYCLE_Z) this.platLZ[i] = RECYCLE_Z - CYCLE_DEPTH;
        this.platRZ[i]! += moveZ;
        if (this.platRZ[i]! > RECYCLE_Z) this.platRZ[i] = RECYCLE_Z - CYCLE_DEPTH;

        this.glbPlatLeft[i]!.position.z  = this.platLZ[i]!;
        this.glbPlatRight[i]!.position.z = this.platRZ[i]!;
      }
    } else {
      const pc = this.platLeft?.count ?? 0;
      for (let i = 0; i < pc; i++) {
        this.platLZ[i]! += moveZ;
        if (this.platLZ[i]! > RECYCLE_Z) this.platLZ[i] = RECYCLE_Z - CYCLE_DEPTH;
        this.platRZ[i]! += moveZ;
        if (this.platRZ[i]! > RECYCLE_Z) this.platRZ[i] = RECYCLE_Z - CYCLE_DEPTH;
      }
      if (pc > 0) this.updatePlatMatrices(pc);
    }

    const grc = this.ringsGreen.count;
    const yrc = this.ringsYellow.count;
    const spinRate = 0.012 * dt60M;
    for (let i = 0; i < grc; i++) {
      this.ringGZ[i]! += moveZ;
      if (this.ringGZ[i]! > RECYCLE_Z) this.ringGZ[i] = RECYCLE_Z - CYCLE_DEPTH;
      this.ringRZ[i]! += moveZ;
      if (this.ringRZ[i]! > RECYCLE_Z) this.ringRZ[i] = RECYCLE_Z - CYCLE_DEPTH;
      this.ringGRot[i]! += spinRate;
      this.ringRRot[i]! += spinRate * 0.8;
    }
    for (let i = 0; i < yrc; i++) {
      this.ringYZ[i]! += moveZ;
      if (this.ringYZ[i]! > RECYCLE_Z) this.ringYZ[i] = RECYCLE_Z - CYCLE_DEPTH;
      this.ringYRot[i]! += spinRate * 1.1;
    }
    if (grc > 0 || yrc > 0) this.updateRingMatrices(grc, yrc);

    const mc = this.meteors.count;
    if (mc > 0) {
      for (let i = 0; i < mc; i++) {
        this.meteorZ[i]! += moveZ * 0.4;
        if (this.meteorZ[i]! > RECYCLE_Z) this.meteorZ[i] = RECYCLE_Z - CYCLE_DEPTH;
      }
      this.updateMeteorMatrices(mc);
    }

    (this.ufo as unknown as THREE.Group).rotation.y += 0.003 * dt60M;
  }

  /** 테스트용 getter */
  getPlatLZ(i: number): number { return this.platLZ[i] ?? 0; }

  dispose(): void {
    if (this.hasGlbPlatforms) {
      for (const g of this.glbPlatLeft)  this.scene.remove(g);
      for (const g of this.glbPlatRight) this.scene.remove(g);
      // GLB geometry는 FlowEngine 소유 템플릿 공유 — 여기서 dispose 안 함
      this.glbPlatLMat?.dispose();
      this.glbPlatRMat?.dispose();
      this.glbBeaconMat?.dispose();
      this.glbPlatLeft  = [];
      this.glbPlatRight = [];
    } else {
      if (this.platLeft)  this.scene.remove(this.platLeft);
      if (this.platRight) this.scene.remove(this.platRight);
      this.platGeo?.dispose();
      if (this.platLeft) (this.platLeft.material  as THREE.Material).dispose();
      // platRight shares same material as platLeft — disposed above
    }

    this.scene.remove(this.ringsGreen, this.ringsRed, this.ringsYellow);
    this.scene.remove(this.meteors);
    this.scene.remove(this.ufo as unknown as THREE.Object3D);

    this.ringGeo.dispose();
    (this.ringsGreen.material  as THREE.Material).dispose();
    (this.ringsRed.material    as THREE.Material).dispose();
    (this.ringsYellow.material as THREE.Material).dispose();

    this.meteorGeo.dispose();
    (this.meteors.material as THREE.Material).dispose();

    (this.ufo as unknown as THREE.Group).traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
  }
}
