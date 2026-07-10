/**
 * Wormhole 스타일 색상 스피드라인 — DIVE 배경 몰입용.
 * 레인 3색(좌 초록 · 중 빨강 · 우 노랑) 기준 vertex color.
 */

import * as THREE from 'three';
import { LANE_WIDTH } from './BridgeRenderer';
import type { QualityTier } from '../AdaptiveQuality';

const LANE_COLORS_HEX = [0x22c55e, 0xef4444, 0xfbbf24] as const;
const LINE_LEN = 80;
const WRAP_Z = 3200;

function lineCountForTier(tier: QualityTier): number {
  if (tier === 'LOW') return 300;
  if (tier === 'MED') return 900;
  return 1800;
}

function pickLaneColor(x: number): THREE.Color {
  const laneColors = LANE_COLORS_HEX.map((h) => new THREE.Color(h));
  if (x < -LANE_WIDTH * 0.5) return laneColors[0]!;
  if (x > LANE_WIDTH * 0.5) return laneColors[2]!;
  return laneColors[1]!;
}

export class ColoredSpeedLines {
  private mesh: THREE.LineSegments;
  private positions: THREE.BufferAttribute;
  private lineSpeed = 8;

  constructor(scene: THREE.Scene, tier: QualityTier) {
    const lineCount = lineCountForTier(tier);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(lineCount * 6);
    const colorAttr = new Float32Array(lineCount * 6);

    for (let i = 0; i < lineCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 500;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (Math.random() - 0.5) * 3000;
      const color = pickLaneColor(x);

      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + LINE_LEN;

      for (let v = 0; v < 2; v++) {
        const base = i * 6 + v * 3;
        colorAttr[base] = color.r;
        colorAttr[base + 1] = color.g;
        colorAttr[base + 2] = color.b;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.LineSegments(geometry, material);
    this.positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    scene.add(this.mesh);
  }

  update(currentSpeed: number, stageIdx: number, dt60: number): void {
    const speed = (this.lineSpeed + currentSpeed * 45 + stageIdx * 6) * dt60;
    const posArr = this.positions.array as Float32Array;
    for (let i = 0; i < posArr.length / 6; i++) {
      posArr[i * 6 + 2] += speed;
      posArr[i * 6 + 5] += speed;
      if (posArr[i * 6 + 2] > 200) {
        posArr[i * 6 + 2] -= WRAP_Z;
        posArr[i * 6 + 5] -= WRAP_Z;
      }
    }
    this.positions.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
