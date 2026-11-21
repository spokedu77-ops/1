import * as THREE from 'three';
import type { QualityTier } from '../AdaptiveQuality';

/** Peripheral fish and rising bubbles. Never registered with obstacle/collision managers. */
export class OceanDecorations {
  private root = new THREE.Group();
  private time = 0;
  constructor(scene: THREE.Scene, tier: QualityTier) {
    this.root.name = 'ocean-decorations';
    const schools = tier === 'LOW' ? 2 : 4;
    const body = new THREE.SphereGeometry(1, 8, 6);
    const tail = new THREE.ConeGeometry(9, 18, 3);
    const colors = [0xffc857, 0x48d6dd, 0xff8f70, 0x72d6ed];
    for (let s = 0; s < schools; s++) {
      const school = new THREE.Group();
      school.position.set((s % 2 ? 1 : -1) * (750 + s * 190), 200 + s * 100, -1000 - s * 800);
      const material = new THREE.MeshBasicMaterial({ color: colors[s], fog: false });
      for (let f = 0; f < 5; f++) {
        const fish = new THREE.Group();
        const mesh = new THREE.Mesh(body, material);
        mesh.scale.set(22, 10, 7);
        const fin = new THREE.Mesh(tail, material);
        fin.rotation.z = Math.PI / 2;
        fin.position.x = -24;
        fish.add(mesh, fin);
        fish.position.set(f * 45, Math.sin(f * 2) * 30, f * -35);
        school.add(fish);
      }
      this.root.add(school);
    }
    const bubbles = new THREE.Group();
    bubbles.name = 'bubbles';
    const geo = new THREE.SphereGeometry(1, 6, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xb6edff, wireframe: true, transparent: true, opacity: 0.3, depthWrite: false, fog: false });
    for (let i = 0; i < (tier === 'LOW' ? 16 : 42); i++) {
      const bubble = new THREE.Mesh(geo, mat);
      bubble.position.set((i % 2 ? 1 : -1) * (650 + Math.random() * 1800), Math.random() * 1800 - 700, -Math.random() * 4000);
      bubble.scale.setScalar(3 + Math.random() * 8);
      bubbles.add(bubble);
    }
    this.root.add(bubbles);
    scene.add(this.root);
  }
  update(dt60: number, speed: number): void {
    this.time += dt60 / 60;
    for (const school of this.root.children) {
      if (school.name === 'bubbles') {
        for (const bubble of school.children) {
          bubble.position.y += dt60 * 1.5;
          if (bubble.position.y > 1200) bubble.position.y = -700;
        }
      } else {
        school.position.z += dt60 * speed * 10;
        if (school.position.z > 500) school.position.z = -4000;
        for (const [i, fish] of school.children.entries()) fish.rotation.y = Math.sin(this.time * 4 + i) * 0.15;
      }
    }
  }
  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.root.traverse(obj => {
      if (obj instanceof THREE.Mesh) { geometries.add(obj.geometry); materials.add(obj.material as THREE.Material); }
    });
    geometries.forEach(geo => geo.dispose());
    materials.forEach(mat => mat.dispose());
    this.root.removeFromParent();
  }
}
