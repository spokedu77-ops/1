import * as THREE from 'three';
import {
  COLOR_GATE_POSE_SEQUENCE,
  GATE_COLORS,
  PLAYABLE_GATE_COLOR_IDS,
  buildColorGateSilhouetteCanvas,
  type ColorGatePoseKey,
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
const SAME_COLOR_REPEAT_CHANCE = 0.1;

interface ColorGateEntity {
  group: THREE.Group;
  panel: THREE.Mesh;
  silhouette: THREE.Mesh;
  gateColorId: GateColorId;
  pose: ColorGatePoseKey;
  scaleSmoothed: number;
  passed: boolean;
}

export interface ColorGateRuntimeInfo {
  gateColorId: GateColorId;
  pose: ColorGatePoseKey;
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
  private silhouetteTextures = new Map<ColorGatePoseKey, THREE.CanvasTexture>();
  private spawnTimer = 0;
  private readonly lowRes: boolean;
  private lastNearestGate: ColorGateEntity | null = null;
  private lastSpawnColorId: GateColorId | null = null;
  private sameColorRunLength = 0;
  private poseBag: ColorGatePoseKey[] = [];

  constructor(lowRes = false) {
    this.lowRes = lowRes;
  }

  setScene(scene: THREE.Scene | null): void {
    this.scene = scene;
  }

  isReady(): boolean {
    return this.silhouetteTextures.size > 0;
  }

  setPoseImage(img: HTMLImageElement | null): void {
    if (!img) {
      this.clearTextureCache();
      return;
    }
    this.setPoseImagesByPose(new Map([['lunge-reach', img]]));
  }

  setPoseImages(images: HTMLImageElement[]): void {
    if (images.length === 0) this.clearTextureCache();
  }

  setPoseImagesByPose(imagesByPose: Map<ColorGatePoseKey, HTMLImageElement>): void {
    this.clearTextureCache();
    for (const [pose, img] of imagesByPose) {
      this.silhouetteTextures.set(pose, this.buildSilhouetteTexture(img));
    }
    for (const gate of this.gates) {
      this.swapSilhouetteMaterial(gate);
    }
  }

  /** @deprecated setPoseImagesByPose 사용 */
  setPoseImagesByAction(imagesByAction: Map<ColorGatePoseKey, HTMLImageElement>): void {
    this.setPoseImagesByPose(imagesByAction);
  }

  resetRun(): void {
    this.clearAll();
    this.spawnTimer = FIRST_SPAWN_DELAY_SEC;
    this.lastSpawnColorId = null;
    this.sameColorRunLength = 0;
    this.poseBag = [];
  }

  update(
    playerZ: number,
    dt: number,
    travel: number,
    onHudGate?: (gate: ColorGateRuntimeInfo | null) => void,
    onGatePassed?: (gate: ColorGateRuntimeInfo) => void,
  ): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn(this.pickNextGateColor());
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
        onGatePassed?.({ gateColorId: gate.gateColorId, pose: gate.pose });
      }

      if (delta > GATE_DESPAWN_OFFSET_Z) {
        this.removeGate(i);
      }
    }

    if (nearest && onHudGate && nearest !== this.lastNearestGate) {
      this.lastNearestGate = nearest;
      onHudGate({ gateColorId: nearest.gateColorId, pose: nearest.pose });
    } else if (!nearest && this.lastNearestGate) {
      this.lastNearestGate = null;
      onHudGate?.(null);
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
    this.scene = null;
  }

  private spawn(gateColorId: GateColorId): void {
    if (!this.scene) return;

    const pose = this.pickNextPose();
    const group = new THREE.Group();
    group.position.set(0, GATE_CENTER_Y, GATE_SPAWN_Z);

    const panelGeo = new THREE.PlaneGeometry(GATE_W, GATE_H);
    const panel = new THREE.Mesh(panelGeo, this.makePanelMaterial(gateColorId));
    panel.renderOrder = 40;
    panel.frustumCulled = false;
    group.add(panel);

    const silhouetteGeo = new THREE.PlaneGeometry(SILHOUETTE_W, SILHOUETTE_H);
    const silhouette = new THREE.Mesh(silhouetteGeo, this.makeSilhouetteMaterial(pose));
    silhouette.position.z = 1;
    silhouette.renderOrder = 41;
    silhouette.frustumCulled = false;
    group.add(silhouette);

    this.scene.add(group);
    this.gates.push({
      group,
      panel,
      silhouette,
      gateColorId,
      pose,
      scaleSmoothed: 1,
      passed: false,
    });
  }

  private pickNextPose(): ColorGatePoseKey {
    if (this.poseBag.length === 0) {
      this.poseBag = [...COLOR_GATE_POSE_SEQUENCE];
      for (let i = this.poseBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = this.poseBag[i]!;
        this.poseBag[i] = this.poseBag[j]!;
        this.poseBag[j] = tmp;
      }
    }
    return this.poseBag.pop() ?? 'star';
  }

  private pickNextGateColor(): GateColorId {
    const colors = [...PLAYABLE_GATE_COLOR_IDS];
    if (colors.length === 0) return 'blue';
    if (!this.lastSpawnColorId) {
      return this.commitSpawnColor(colors[Math.floor(Math.random() * colors.length)]!);
    }

    const canRepeat = this.sameColorRunLength < 2 && Math.random() < SAME_COLOR_REPEAT_CHANCE;
    const candidates = canRepeat
      ? colors
      : colors.filter((colorId) => colorId !== this.lastSpawnColorId);
    const pool = candidates.length > 0 ? candidates : colors.filter((colorId) => colorId !== this.lastSpawnColorId);
    const picked = pool[Math.floor(Math.random() * pool.length)] ?? colors[0]!;
    return this.commitSpawnColor(picked);
  }

  private commitSpawnColor(colorId: GateColorId): GateColorId {
    if (colorId === this.lastSpawnColorId) {
      this.sameColorRunLength += 1;
    } else {
      this.lastSpawnColorId = colorId;
      this.sameColorRunLength = 1;
    }
    return colorId;
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
    for (const tex of this.silhouetteTextures.values()) tex.dispose();
    this.silhouetteTextures.clear();
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
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
  }

  private makeSilhouetteMaterial(pose: ColorGatePoseKey): THREE.MeshBasicMaterial {
    const texture = this.silhouetteTextures.get(pose);
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      toneMapped: false,
      fog: false,
      transparent: true,
      opacity: texture ? 1 : 0,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      visible: Boolean(texture),
    });
  }

  private swapSilhouetteMaterial(gate: ColorGateEntity): void {
    disposeMeshMaterial(gate.silhouette);
    gate.silhouette.material = this.makeSilhouetteMaterial(gate.pose);
    gate.silhouette.visible = Boolean(this.silhouetteTextures.get(gate.pose));
  }
}
