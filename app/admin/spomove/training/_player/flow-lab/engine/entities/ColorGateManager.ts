/**
 * 색 포즈 관문 — 브릿지 위 단색 벽 + 검정 포즈 실루엣.
 */

import * as THREE from 'three';
import type { FlowBridge } from './ObstacleManager';
import { LANE_WIDTH, BRIDGE_LENGTH } from '../renderers/BridgeRenderer';
import {
  GATE_COLORS,
  buildColorGateSilhouetteCanvas,
  type GateColorId,
} from '../modules/colorGateGuides';

const GATE_SPAN_W   = LANE_WIDTH * 3;
const GATE_H        = 200;
const SILHOUETTE_W  = 152;
const SILHOUETTE_H  = 190;
const BRIDGE_DECK_Y = 44;
export const COLOR_GATE_LOCAL_Z = BRIDGE_LENGTH * 0.32;
const GATE_LOCAL_Z  = COLOR_GATE_LOCAL_Z;
const GATE_CENTER_Y = BRIDGE_DECK_Y + GATE_H / 2;

const APPROACH_Z = -480;
const PASS_Z     = 320;
const PASS_NEAR_DISTANCE = 180;
const PASS_EXIT_DISTANCE = 320;
const SCALE_LERP = 8;
const HUD_VISIBLE_DISTANCE = 2600;

interface ColorGateEntity {
  group: THREE.Group;
  panel: THREE.Mesh;
  silhouette: THREE.Mesh;
  bridgeRef: FlowBridge;
  gateColorId: GateColorId;
  scaleSmoothed: number;
  wasNearPlayer: boolean;
  prevAbsDist: number;
  passed: boolean;
}

function targetScaleFromDelta(delta: number): number {
  if (delta <= 0 && delta >= APPROACH_Z) {
    const t = (delta - APPROACH_Z) / -APPROACH_Z;
    const eased = t * t * (3 - 2 * t);
    return 1 + eased * 0.12;
  }
  if (delta > 0 && delta < PASS_Z) {
    const t = delta / PASS_Z;
    const eased = t * t * (3 - 2 * t);
    return 1.12 + eased * 0.28;
  }
  if (delta >= PASS_Z) return 1.4;
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
  private gates: ColorGateEntity[] = [];
  private lowRes: boolean;
  private poseImages: HTMLImageElement[] = [];
  private silhouetteTextures: THREE.CanvasTexture[] = [];
  private readonly _worldPos = new THREE.Vector3();
  private lastNearestGate: ColorGateEntity | null = null;

  constructor(lowRes = false) {
    this.lowRes = lowRes;
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
      transparent: false,
      depthWrite: true,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
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
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -6,
    });
  }

  private swapSilhouetteMaterial(gate: ColorGateEntity): void {
    disposeMeshMaterial(gate.silhouette);
    gate.silhouette.material = this.makeSilhouetteMaterial();
  }

  attach(
    bridge: FlowBridge,
    bridgeX: number,
    gateColorId: GateColorId,
  ): boolean {
    if (bridge.hasColorGate) return false;
    if (!this.isReady()) return false;
    bridge.hasColorGate = true;

    const group = new THREE.Group();
    group.position.set(-bridgeX, GATE_CENTER_Y, GATE_LOCAL_Z);

    const panelGeo = new THREE.PlaneGeometry(GATE_SPAN_W, GATE_H);
    panelGeo.userData['ownGeo'] = true;
    const panel = new THREE.Mesh(panelGeo, this.makePanelMaterial(gateColorId));
    panel.renderOrder = 4;
    panel.frustumCulled = false;
    group.add(panel);

    const silhouetteGeo = new THREE.PlaneGeometry(SILHOUETTE_W, SILHOUETTE_H);
    silhouetteGeo.userData['ownGeo'] = true;
    const silhouette = new THREE.Mesh(silhouetteGeo, this.makeSilhouetteMaterial());
    silhouette.position.z = 1;
    silhouette.renderOrder = 5;
    silhouette.frustumCulled = false;
    group.add(silhouette);

    bridge.mesh.add(group);

    this.gates.push({
      group,
      panel,
      silhouette,
      bridgeRef: bridge,
      gateColorId,
      scaleSmoothed: 1,
      wasNearPlayer: false,
      prevAbsDist: Infinity,
      passed: false,
    });
    return true;
  }

  update(
    playerZ: number,
    dt: number,
    onHudColor?: (gateColorId: GateColorId | null) => void,
    onGatePassed?: (gateColorId: GateColorId, bridge: FlowBridge) => void,
  ): void {
    const lerpK = Math.min(1, dt * SCALE_LERP);
    let nearest: ColorGateEntity | null = null;
    let nearestDist = Infinity;

    for (const gate of this.gates) {
      const gateZ = gate.panel.getWorldPosition(this._worldPos).z;
      const delta = gateZ - playerZ;
      const absDist = Math.abs(delta);

      if (delta <= 0 && absDist < HUD_VISIBLE_DISTANCE && absDist < nearestDist) {
        nearestDist = absDist;
        nearest = gate;
      }

      const target = targetScaleFromDelta(delta);
      gate.scaleSmoothed += (target - gate.scaleSmoothed) * lerpK;
      gate.silhouette.scale.set(gate.scaleSmoothed, gate.scaleSmoothed, 1);

      if (absDist < PASS_NEAR_DISTANCE) {
        gate.wasNearPlayer = true;
      }

      if (
        !gate.passed
        && gate.wasNearPlayer
        && absDist > PASS_EXIT_DISTANCE
        && absDist > gate.prevAbsDist
      ) {
        gate.passed = true;
        onGatePassed?.(gate.gateColorId, gate.bridgeRef);
      }
      gate.prevAbsDist = absDist;
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
    for (const g of this.gates) {
      g.bridgeRef.hasColorGate = false;
      g.group.parent?.remove(g.group);
      g.panel.geometry.dispose();
      g.silhouette.geometry.dispose();
      disposeMeshMaterial(g.panel);
      disposeMeshMaterial(g.silhouette);
    }
    this.gates = [];
    this.lastNearestGate = null;
  }

  dispose(): void {
    this.clearAll();
    this.clearTextureCache();
    this.poseImages = [];
  }
}
