/**
 * DIVE 배경 장식용 소행성 — 판정·게임플레이 없음.
 */

import * as THREE from 'three';
import type { QualityTier } from '../AdaptiveQuality';

function capForTier(tier: QualityTier): number {
  if (tier === 'LOW') return 2;
  if (tier === 'MED') return 5;
  return 8;
}

function createRockGeometry(seed: number, low: boolean): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, low ? 0 : 1);
  const pos = geometry.attributes.position;
  if (!pos) return geometry;

  let state = seed >>> 0 || 1;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967295;
  };

  const vertex = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    const bump = 0.75 + rnd() * 0.45;
    vertex.multiplyScalar(bump);
    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

type DecoRock = {
  group: THREE.Group;
  vz: number;
  rot: THREE.Vector3;
};

export class DecorativeAsteroids {
  private scene: THREE.Scene;
  private rocks: DecoRock[] = [];
  private readonly maxCount: number;
  private readonly lowDetail: boolean;
  private spawnCooldown = 0;
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly sharedMats: THREE.Material[] = [];

  constructor(scene: THREE.Scene, tier: QualityTier) {
    this.scene = scene;
    this.maxCount = capForTier(tier);
    this.lowDetail = tier === 'LOW';
  }

  update(dt60: number, gameSpeed: number): void {
    this.spawnCooldown -= dt60;
    if (this.spawnCooldown <= 0 && this.rocks.length < this.maxCount) {
      this.spawnCooldown = 40 + Math.random() * 80;
      this.spawnOne();
    }

    const moveZ = (18 + gameSpeed * 55) * dt60;
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i]!;
      r.group.position.z += moveZ;
      r.group.rotation.x += r.rot.x * dt60;
      r.group.rotation.y += r.rot.y * dt60;
      r.group.rotation.z += r.rot.z * dt60;
      if (r.group.position.z > 900) {
        this.scene.remove(r.group);
        this.rocks.splice(i, 1);
      }
    }
  }

  private spawnOne(): void {
    const seed = Math.floor(Math.random() * 999983);
    const geo = createRockGeometry(seed, this.lowDetail);
    this.sharedGeos.push(geo);
    const tint = new THREE.Color().setHSL(0.08 + Math.random() * 0.06, 0.35, 0.45 + Math.random() * 0.15);
    const mat = new THREE.MeshStandardMaterial({
      color: tint,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });
    this.sharedMats.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    const group = new THREE.Group();
    group.add(mesh);

    const side = Math.random() < 0.5 ? -1 : 1;
    group.position.set(
      side * (120 + Math.random() * 280),
      40 + Math.random() * 120,
      -2800 - Math.random() * 1200,
    );
    const scale = 8 + Math.random() * 18;
    group.scale.setScalar(scale);

    this.scene.add(group);
    this.rocks.push({
      group,
      vz: 0,
      rot: new THREE.Vector3(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
      ),
    });
  }

  dispose(): void {
    for (const r of this.rocks) {
      this.scene.remove(r.group);
    }
    this.rocks = [];
    for (const g of this.sharedGeos) g.dispose();
    for (const m of this.sharedMats) m.dispose();
    this.sharedGeos.length = 0;
    this.sharedMats.length = 0;
  }
}
