/**
 * 색 포즈 관문 — 브릿지 위 3레인 폭 문(게이트) + 포즈 패널
 */

import * as THREE from 'three';
import type { FlowBridge } from './ObstacleManager';
import { LANE_WIDTH, BRIDGE_LENGTH } from '../renderers/BridgeRenderer';
import type { FlowModuleKey } from '../modules/flowModules';
import {
  GATE_COLOR_IDS,
  buildColorGatePanelCanvas,
  COLOR_GATE_ACTION_SEQUENCE,
  type GateColorId,
} from '../modules/colorGateGuides';

const GATE_SPAN_W     = LANE_WIDTH * 3;
const GATE_H          = 210;
const GATE_FRAME_D    = 10;
const GATE_PANEL_D    = 4;
const BRIDGE_DECK_Y   = 40;
const GATE_LOCAL_Z    = -(BRIDGE_LENGTH * 0.22);

interface ColorGateEntity {
  mesh: THREE.Group;
  bridgeRef: FlowBridge;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

function getPanelTexture(
  action: FlowModuleKey,
  gateColorId: GateColorId,
  poseImage: HTMLImageElement | null,
  lowRes: boolean,
): THREE.CanvasTexture {
  const key = `${action}:${gateColorId}:${lowRes ? 'lo' : 'hi'}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = buildColorGatePanelCanvas(gateColorId, action, poseImage, lowRes);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

const panelMaterialCache = new Map<string, THREE.MeshBasicMaterial>();

function getPanelMaterial(
  action: FlowModuleKey,
  gateColorId: GateColorId,
  poseImage: HTMLImageElement | null,
  lowRes: boolean,
): THREE.MeshBasicMaterial {
  const key = `${action}:${gateColorId}:${lowRes ? 'lo' : 'hi'}`;
  const cached = panelMaterialCache.get(key);
  if (cached) return cached;
  const mat = new THREE.MeshBasicMaterial({
    map: getPanelTexture(action, gateColorId, poseImage, lowRes),
    toneMapped: false,
  });
  panelMaterialCache.set(key, mat);
  return mat;
}

/** 초기화 시 4색 텍스처 선생성 — 브릿지 스폰 중 getImageData 렉 방지 */
export function prewarmColorGateTextures(
  poseImage: HTMLImageElement | null,
  lowRes: boolean,
): void {
  const action = COLOR_GATE_ACTION_SEQUENCE[0] ?? 'reach';
  for (const gateColorId of GATE_COLOR_IDS) {
    getPanelMaterial(action, gateColorId, poseImage, lowRes);
  }
}

export interface ColorGateAttachConfig {
  gateColorId: GateColorId;
  action: FlowModuleKey;
}

export class ColorGateManager {
  private gates: ColorGateEntity[] = [];
  private lowRes: boolean;
  private poseImage: HTMLImageElement | null;

  constructor(lowRes = false, poseImage: HTMLImageElement | null = null) {
    this.lowRes = lowRes;
    this.poseImage = poseImage;
  }

  attach(bridge: FlowBridge, bridgeX: number, config: ColorGateAttachConfig): void {
    if (bridge.hasBox) return;
    bridge.hasBox = true;

    const group = new THREE.Group();
    group.position.set(-bridgeX, 0, GATE_LOCAL_Z);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.55,
      roughness: 0.35,
    });
    const postW = 14;
    const postGeo = new THREE.BoxGeometry(postW, GATE_H, GATE_FRAME_D);
    postGeo.userData['ownGeo'] = true;

    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-GATE_SPAN_W / 2 + postW / 2, BRIDGE_DECK_Y + GATE_H / 2, 0);
    group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(GATE_SPAN_W / 2 - postW / 2, BRIDGE_DECK_Y + GATE_H / 2, 0);
    group.add(rightPost);

    const beamGeo = new THREE.BoxGeometry(GATE_SPAN_W, 12, GATE_FRAME_D);
    beamGeo.userData['ownGeo'] = true;
    const topBeam = new THREE.Mesh(beamGeo, frameMat);
    topBeam.position.set(0, BRIDGE_DECK_Y + GATE_H + 6, 0);
    group.add(topBeam);

    const panelW = GATE_SPAN_W - postW * 2 - 8;
    const panelH = GATE_H - 16;
    const panelMat = getPanelMaterial(
      config.action,
      config.gateColorId,
      this.poseImage,
      this.lowRes,
    );
    const panelGeo = new THREE.BoxGeometry(panelW, panelH, GATE_PANEL_D);
    panelGeo.userData['ownGeo'] = true;
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, BRIDGE_DECK_Y + GATE_H / 2, GATE_FRAME_D / 2 + 2);
    panel.rotation.y = Math.PI;
    group.add(panel);

    bridge.mesh.add(group);
    this.gates.push({ mesh: group, bridgeRef: bridge });
  }

  clearAll(): void {
    for (const g of this.gates) {
      g.mesh.parent?.remove(g.mesh);
      g.mesh.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry?.userData['ownGeo']) m.geometry.dispose();
      });
    }
    this.gates = [];
  }
}
