import * as THREE from 'three';
import {
  COLOR_GATE_FIXED_COLOR_ID,
  GATE_COLORS,
  buildColorGateSilhouetteCanvas,
  type GateColorId,
} from '../modules/colorGateGuides';

const GATE_W = 260;
const GATE_H = 210;
const SILHOUETTE_W = 150;
const SILHOUETTE_H = 188;
const GATE_CENTER_Y = 155;
const GATE_SPAWN_Z = -2800;
const GATE_DESPAWN_OFFSET_Z = 900;
const FIRST_SPAWN_DELAY_SEC = 1.6;
const SPAWN_INTERVAL_SEC = 4.25;
const HUD_VISIBLE_DISTANCE = 3200;
const APPROACH_Z = -520;
const PASS_Z = 320;
const SCALE_LERP = 8;

interface ColorGateEntity {
  group: THREE.Group;
  panel: THREE.Mesh;
  silhouette: THREE.Mesh;
  gateColorId: GateColorId;
  scaleSmoothed: number;
  passed: boolean;
}

function targetScaleFromDelta(delta: number): number {
  if (delta <= 0 && delta >= APPROACH_Z) {
    const t = (delta - APPROACH_Z) / -APPROACH_Z;
    const eased = t * t * (3 - 2 * t);
    return 1 + eased * 0.14;
  }
  if (delta > 0 && delta < PASS_Z) {
    const t = delta / PASS_Z;
    const eased = t * t * (3 - 2 * t);
    return 1.14 + eased * 0.32;
  }
  if (delta >= PASS_Z) return 1.46;
  return 1;
}

function disposeMeshMaterial(mesh: THREE.Mesh): void {
  const mat = mesh.material;
  if (Array.isArray(mat)) {
    for (const m of mat) m.dispose();
  } else {
    mat.dispose();
  }
}

export class ColorGateManager {
  private scene: THREE.Scene | null = null;
  private gates: ColorGateEntity[] = [];
  private poseImages: HTMLImageElement[] = [];
  private silhouetteTextures: THREE.CanvasTexture[] = [];
  private spawnTimer = 0;
  private readonly lowRes: boolean;
  private lastNearestGate: ColorGateEntity | null = null;

  constructor(lowRes = false) {
    this.lowRes = lowRes;
  }

  setScene(scene: THREE.Scene | null): void {
    this.scene = scene;
  }

  isReady(): boolean {
    return this.silhouetteTextures.length > 0;
  }

  setPoseImage(img: HTMLImageElement | null): void {
    this.setPoseImages(img ? [img] : []);
  }

  setPoseImages(images: HTMLImageElement[]): void {
    this.poseImages = images;
    this.clearTextureCache();
    if (this.poseImages.length > 0) {
      this.silhouetteTextures = this.poseImages.map((img) => this.buildSilhouetteTexture(img));
    }
    for (const gate of this.gates) {
      this.swapSilhouetteMaterial(gate);
    }
  }

  resetRun(): void {
    this.clearAll();
    this.spawnTimer = FIRST_SPAWN_DELAY_SEC;
  }

  update(
    playerZ: number,
    dt: number,
    travel: number,
    onHudColor?: (gateColorId: GateColorId | null) => void,
    onGatePassed?: (gateColorId: GateColorId) => void,
  ): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn(COLOR_GATE_FIXED_COLOR_ID);
      this.spawnTimer += SPAWN_INTERVAL_SEC;
    }

    const lerpK = Math.min(1, dt * SCALE_LERP);
    let nearest: ColorGateEntity | null = null;
    let nearestDist = Infinity;

    for (let i = this.gates.length - 1; i >= 0; i--) {
      const gate = this.gates[i]!;
      gate.group.position.z += travel;

      const delta = gate.group.position.z - playerZ;
      const absDist = Math.abs(delta);
      if (delta <= 0 && absDist < HUD_VISIBLE_DISTANCE && absDist < nearestDist) {
        nearestDist = absDist;
        nearest = gate;
      }

      const target = targetScaleFromDelta(delta);
      gate.scaleSmoothed += (target - gate.scaleSmoothed) * lerpK;
      gate.silhouette.scale.set(gate.scaleSmoothed, gate.scaleSmoothed, 1);

      if (!gate.passed && delta > PASS_Z) {
        gate.passed = true;
        onGatePassed?.(gate.gateColorId);
      }

      if (delta > GATE_DESPAWN_OFFSET_Z) {
        this.removeGate(i);
      }
    }

    if (nearest && onHudColor && nearest !== this.lastNearestGate) {
      this.lastNearestGate = nearest;
      onHudColor(nearest.gateColorId);
    } else if (!nearest && this.lastNearestGate) {
      this.lastNearestGate = null;
      onHudColor?.(null);
    }
  }

  clearAll(): void {
    for (let i = this.gates.length - 1; i >= 0; i--) {
      this.removeGate(i);
    }
    this.lastNearestGate = null;
  }

  dispose(): void {
    this.clearAll();
    this.clearTextureCache();
    this.poseImages = [];
    this.scene = null;
  }

  private spawn(gateColorId: GateColorId): void {
    if (!this.scene || !this.isReady()) return;

    const group = new THREE.Group();
    group.position.set(0, GATE_CENTER_Y, GATE_SPAWN_Z);

    const panelGeo = new THREE.PlaneGeometry(GATE_W, GATE_H);
    const panel = new THREE.Mesh(panelGeo, this.makePanelMaterial(gateColorId));
    panel.renderOrder = 4;
    panel.frustumCulled = false;
    group.add(panel);

    const silhouetteGeo = new THREE.PlaneGeometry(SILHOUETTE_W, SILHOUETTE_H);
    const silhouette = new THREE.Mesh(silhouetteGeo, this.makeSilhouetteMaterial());
    silhouette.position.z = 1;
    silhouette.renderOrder = 5;
    silhouette.frustumCulled = false;
    group.add(silhouette);

    this.scene.add(group);
    this.gates.push({
      group,
      panel,
      silhouette,
      gateColorId,
      scaleSmoothed: 1,
      passed: false,
    });
  }

  private removeGate(index: number): void {
    const gate = this.gates[index];
    if (!gate) return;
    gate.group.parent?.remove(gate.group);
    gate.panel.geometry.dispose();
    gate.silhouette.geometry.dispose();
    disposeMeshMaterial(gate.panel);
    disposeMeshMaterial(gate.silhouette);
    if (this.lastNearestGate === gate) {
      this.lastNearestGate = null;
    }
    this.gates.splice(index, 1);
  }

  private clearTextureCache(): void {
    for (const tex of this.silhouetteTextures) tex.dispose();
    this.silhouetteTextures = [];
  }

  private buildSilhouetteTexture(poseImage: HTMLImageElement): THREE.CanvasTexture {
    const canvas = buildColorGateSilhouetteCanvas(poseImage, this.lowRes);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  private makePanelMaterial(gateColorId: GateColorId): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: GATE_COLORS[gateColorId].hex,
      toneMapped: false,
      fog: false,
      side: THREE.DoubleSide,
    });
  }

  private makeSilhouetteMaterial(): THREE.MeshBasicMaterial {
    const texture = this.silhouetteTextures.length > 0
      ? this.silhouetteTextures[Math.floor(Math.random() * this.silhouetteTextures.length)]
      : undefined;
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      toneMapped: false,
      fog: false,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });
  }

  private swapSilhouetteMaterial(gate: ColorGateEntity): void {
    disposeMeshMaterial(gate.silhouette);
    gate.silhouette.material = this.makeSilhouetteMaterial();
  }
}
