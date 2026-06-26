/**
 * BridgeRenderer — 브릿지 Mesh 생성·제거 전담
 *
 * FlowEngine이 "언제·어디에" 배치할지 결정하고,
 * BridgeRenderer는 "어떻게 생성·표시할지"만 담당한다.
 * geometry·material·수치는 원본 FlowEngine.spawnBridge() 와 완전 동일.
 */

import * as THREE from 'three';

// ─── 브릿지 치수 상수 (FlowEngine과 공유; 원본 수치 그대로) ─────────────────

export const LANE_COLORS: [number, number, number] = [0x22c55e, 0xef4444, 0xfbbf24];
export const LANE_WIDTH    = 80;
export const BRIDGE_LENGTH = 4200;
export const PAD_DEPTH     = 200;

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface BridgeCreateInput {
  lane: 0 | 1 | 2;
  x:    number;
  z:    number;
}

export interface BridgeVisual {
  mesh:     THREE.Group;
  padMesh:  THREE.Mesh;
  padDepth: number;
}

// ─── BridgeRenderer ──────────────────────────────────────────────────────────

export class BridgeRenderer {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * 브릿지 Group을 생성하고 scene에 추가한 뒤 BridgeVisual을 반환한다.
   * geometry·material·계층 구조는 원본 spawnBridge() 와 완전 동일.
   */
  createBridge(input: BridgeCreateInput): BridgeVisual {
    const { lane, x, z } = input;
    const bridgeColor = LANE_COLORS[lane]!;
    const g = new THREE.Group();

    // 상판
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 5, 8, BRIDGE_LENGTH),
      new THREE.MeshBasicMaterial({ color: bridgeColor }),
    );
    top.position.y = 40;
    g.add(top);

    // 점프 패드 (흰색)
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    pad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
    g.add(pad);

    // 측면 빔 (좌·우 공유 geometry)
    const sideGeo  = new THREE.BoxGeometry(6, 25, BRIDGE_LENGTH + PAD_DEPTH);
    const sideMat  = new THREE.MeshPhongMaterial({ color: 0x222222, emissive: 0x111111 });
    const leftBeam  = new THREE.Mesh(sideGeo, sideMat);
    const rightBeam = new THREE.Mesh(sideGeo, sideMat);
    leftBeam.position.set(-(LANE_WIDTH / 2 - 4), 30, -PAD_DEPTH / 2);
    rightBeam.position.set( (LANE_WIDTH / 2 - 4), 30, -PAD_DEPTH / 2);
    g.add(leftBeam, rightBeam);

    g.position.set(x, 0, z);
    this.scene.add(g);

    return { mesh: g, padMesh: pad, padDepth: PAD_DEPTH };
  }

  /** 브릿지를 scene에서 제거하고 geometry·material을 dispose한다. */
  removeBridge(visual: BridgeVisual): void {
    const { mesh } = visual;
    mesh.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        (Array.isArray(m.material) ? m.material : [m.material])
          .forEach((mat) => (mat as THREE.Material).dispose());
      }
    });
    this.scene.remove(mesh);
  }

  dispose(): void {
    // geometry·material 정리는 FlowEngine.dispose()의 scene traverse에서 처리
  }
}
