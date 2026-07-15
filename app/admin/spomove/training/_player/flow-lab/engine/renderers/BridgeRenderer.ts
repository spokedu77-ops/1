/**
 * BridgeRenderer — 브릿지 Mesh 생성·제거 전담
 *
 * - legacy / enhanced 공통: 레인별 단색 상판 (LANE_COLORS) + 어두운 측면
 * - enhanced GLB: dive_track_segment.glb 10개 타일링 (화살표·네온 없음, 레인 색만)
 * - enhanced BoxGeometry 폴백: legacy와 동일한 단색 브릿지
 */

import * as THREE from 'three';

// ─── 브릿지 치수 상수 ─────────────────────────────────────────────────────────

export const LANE_COLORS: [number, number, number] = [0x22c55e, 0xef4444, 0xfbbf24];
export const LANE_WIDTH    = 80;
export const BRIDGE_LENGTH = 4200;
export const PAD_DEPTH     = 200;

// ─── GLB 트랙 스킨 상수 ───────────────────────────────────────────────────────
const TRACK_SEG_LEN  = 420;
const TRACK_SEGS     = 10;
const TRACK_SEG_Y    = 37;
const TRACK_RAIL_NAMES = new Set(['EMISSIVE_RAIL_LEFT', 'EMISSIVE_RAIL_RIGHT']);
const TRACK_PAD_NAME   = 'PAD';
const TRACK_ARROW_PREFIX = 'ARROW_';

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface BridgeCreateInput {
  lane: 0 | 1 | 2;
  x:    number;
  z:    number;
}

export interface BridgeVisual {
  mesh:               THREE.Group;
  padMesh:            THREE.Mesh;
  padDepth:           number;
}

// ─── BridgeRenderer ──────────────────────────────────────────────────────────

export class BridgeRenderer {
  private scene:    THREE.Scene;
  private enhanced: boolean;

  private laneDeckMats: [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial, THREE.MeshBasicMaterial] | null = null;
  private sideMat: THREE.MeshPhongMaterial | null = null;
  private padMat: THREE.MeshBasicMaterial | null = null;

  private trackGlbScene: THREE.Object3D | null = null;
  private hasGlb = false;

  constructor(scene: THREE.Scene, enhanced = false, trackGlbScene: THREE.Object3D | null = null) {
    this.scene    = scene;
    this.enhanced = enhanced;

    if (enhanced && trackGlbScene) {
      this.trackGlbScene = trackGlbScene;
      this.hasGlb = true;
    }

    this.laneDeckMats = [
      new THREE.MeshBasicMaterial({ color: LANE_COLORS[0] }),
      new THREE.MeshBasicMaterial({ color: LANE_COLORS[1] }),
      new THREE.MeshBasicMaterial({ color: LANE_COLORS[2] }),
    ];
    this.sideMat = new THREE.MeshPhongMaterial({ color: 0x222222, emissive: 0x111111 });
    this.padMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  }

  createBridge(input: BridgeCreateInput): BridgeVisual {
    if (!this.scene) {
      throw new Error('BridgeRenderer: scene is not available');
    }
    const { lane, x, z } = input;
    const g = new THREE.Group();
    const deckMat = this.laneDeckMats![lane]!;

    // ── enhanced + GLB 트랙 스킨 (레인 단색, 화살표·네온 없음) ───────────────
    if (this.hasGlb && this.trackGlbScene) {
      for (let i = 0; i < TRACK_SEGS; i++) {
        const seg = this.trackGlbScene.clone(true);
        const localZ = -(BRIDGE_LENGTH / 2) + TRACK_SEG_LEN * i + TRACK_SEG_LEN / 2;
        seg.position.set(0, TRACK_SEG_Y, localZ);
        seg.frustumCulled = false;
        seg.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (!m.isMesh) return;
          m.frustumCulled = false;

          if (m.name === TRACK_PAD_NAME || m.name.startsWith(TRACK_ARROW_PREFIX)) {
            m.visible = false;
          } else {
            m.material = deckMat;
            m.visible  = true;
          }
        });
        g.add(seg);
      }

      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH),
        this.padMat!,
      );
      pad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
      pad.visible = false;
      g.add(pad);

      this.addLegacySideBeams(g);

      g.position.set(x, 0, z);
      this.scene.add(g);
      return { mesh: g, padMesh: pad, padDepth: PAD_DEPTH };
    }

    // ── legacy / enhanced BoxGeometry 폴백 (동일 단색) ───────────────────────
    return this.createLegacyStyleBridge(g, lane, x, z, deckMat);
  }

  private createLegacyStyleBridge(
    g: THREE.Group,
    lane: 0 | 1 | 2,
    x: number,
    z: number,
    deckMat: THREE.MeshBasicMaterial,
  ): BridgeVisual {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 5, 8, BRIDGE_LENGTH),
      deckMat,
    );
    top.position.y = 40;
    g.add(top);

    const legacyPad = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH),
      this.padMat!,
    );
    legacyPad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
    g.add(legacyPad);

    this.addLegacySideBeams(g);

    g.position.set(x, 0, z);
    this.scene.add(g);
    return { mesh: g, padMesh: legacyPad, padDepth: PAD_DEPTH };
  }

  private addLegacySideBeams(g: THREE.Group): void {
    const sideGeo = new THREE.BoxGeometry(6, 25, BRIDGE_LENGTH);
    const leftB   = new THREE.Mesh(sideGeo, this.sideMat!);
    const rightB  = new THREE.Mesh(sideGeo, this.sideMat!);
    leftB.position.set(-(LANE_WIDTH / 2 - 4), 30, 0);
    rightB.position.set( (LANE_WIDTH / 2 - 4), 30, 0);
    g.add(leftB, rightB);
  }

  removeBridge(visual: BridgeVisual): void {
    const { mesh } = visual;
    if (this.hasGlb) {
      visual.padMesh.geometry.dispose();
      mesh.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry && (m.userData['ownGeo'] as boolean)) {
          m.geometry.dispose();
        }
        if (m.material && (m.userData['ownMat'] as boolean)) {
          (Array.isArray(m.material) ? m.material : [m.material])
            .forEach((mat) => (mat as THREE.Material).dispose());
        }
      });
    } else {
      mesh.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    }
    this.scene.remove(mesh);
  }

  dispose(): void {
    if (this.laneDeckMats) {
      for (const m of this.laneDeckMats) m.dispose();
      this.laneDeckMats = null;
    }
    this.sideMat?.dispose();
    this.padMat?.dispose();
    this.sideMat = null;
    this.padMat = null;
    this.trackGlbScene = null;
    this.hasGlb = false;
  }
}
