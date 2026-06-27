/**
 * BridgeRenderer — 브릿지 Mesh 생성·제거 전담
 *
 * - legacy 모드: 원본 수치 완전 동일, 브릿지마다 개별 material
 * - enhanced 모드 (BoxGeometry): 어두운 금속 기반 + 레인별 네온 레일 + 발광 점프 패드 + 구분 패널
 *   공유 material (darkMat + neonMats[3] + padMats[3] + sideMat + divMat)
 *   geometry는 브릿지마다 개별 생성·개별 dispose (removeBridge에서 처리)
 * - enhanced + GLB 모드: dive_track_segment.glb를 10개 타일링 (420×10=4200)
 *   GLB geometry/material은 템플릿 공유 — removeBridge에서 pad geometry만 dispose
 */

import * as THREE from 'three';

// ─── 브릿지 치수 상수 (FlowEngine과 공유; 원본 수치 그대로) ─────────────────

export const LANE_COLORS: [number, number, number] = [0x22c55e, 0xef4444, 0xfbbf24];
export const LANE_WIDTH    = 80;
export const BRIDGE_LENGTH = 4200;
export const PAD_DEPTH     = 200;

// ─── GLB 트랙 스킨 상수 ───────────────────────────────────────────────────────
// dive_track_segment.glb: 420 units long × 80 wide, pivot center, forward -Z
// 10개 타일 × 420 = BRIDGE_LENGTH(4200)
const TRACK_SEG_LEN  = 420;
const TRACK_SEGS     = 10;
// Y 오프셋: GLB deck 상면 Y_max=7.1 → 브릿지 로직 발판 높이 44에 맞춤 (44-7.1=36.9)
const TRACK_SEG_Y    = 37;
// 발광 메시 이름 (레인 색상 tinting 대상)
const TRACK_NEON_NAMES = new Set(['EMISSIVE_RAIL_LEFT', 'EMISSIVE_RAIL_RIGHT', 'ARROW_00', 'ARROW_01']);
const TRACK_PAD_NAME   = 'PAD';

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
  private scene:    THREE.Scene;
  private enhanced: boolean;

  // enhanced 공유 material (생성자에서 1회 생성, dispose()에서 일괄 해제)
  private darkMat:  THREE.MeshPhongMaterial | null = null;
  private neonMats: [THREE.MeshPhongMaterial, THREE.MeshPhongMaterial, THREE.MeshPhongMaterial] | null = null;
  private padMats:  [THREE.MeshPhongMaterial, THREE.MeshPhongMaterial, THREE.MeshPhongMaterial] | null = null;
  private sideMat:  THREE.MeshPhongMaterial | null = null;
  private divMat:   THREE.MeshPhongMaterial | null = null;

  // GLB 트랙 스킨 (optional — FlowEngine이 로드해서 전달)
  private trackGlbScene: THREE.Object3D | null = null;
  private hasGlb = false;
  // GLB 비명칭 메시용 베이스 재질 (네이비 블루 — enhanced 공유)
  private trackBaseMat: THREE.MeshPhongMaterial | null = null;

  constructor(scene: THREE.Scene, enhanced = false, trackGlbScene: THREE.Object3D | null = null) {
    this.scene    = scene;
    this.enhanced = enhanced;

    if (enhanced && trackGlbScene) {
      this.trackGlbScene = trackGlbScene;
      this.hasGlb = true;
    }

    if (enhanced) {
      // 어두운 금속 기반 (모든 레인 공유)
      this.darkMat = new THREE.MeshPhongMaterial({
        color: 0x080f1e, emissive: 0x010306, emissiveIntensity: 1.0, shininess: 90, specular: 0x304080,
      });
      // GLB 기본 메시용 네이비 블루 (명칭 없는 트랙 바디)
      this.trackBaseMat = new THREE.MeshPhongMaterial({
        color: 0x0b1e3f, emissive: 0x040c1a, emissiveIntensity: 0.4, shininess: 80, specular: 0x1a3060,
      });

      // 레인별 네온 (레일 + 화살표용)
      this.neonMats = [
        new THREE.MeshPhongMaterial({ color: LANE_COLORS[0], emissive: LANE_COLORS[0], emissiveIntensity: 0.85, shininess: 40 }),
        new THREE.MeshPhongMaterial({ color: LANE_COLORS[1], emissive: LANE_COLORS[1], emissiveIntensity: 0.85, shininess: 40 }),
        new THREE.MeshPhongMaterial({ color: LANE_COLORS[2], emissive: LANE_COLORS[2], emissiveIntensity: 0.85, shininess: 40 }),
      ];

      // 레인별 점프 패드 (더 밝게)
      this.padMats = [
        new THREE.MeshPhongMaterial({ color: LANE_COLORS[0], emissive: LANE_COLORS[0], emissiveIntensity: 1.2, shininess: 80, transparent: true, opacity: 0.92 }),
        new THREE.MeshPhongMaterial({ color: LANE_COLORS[1], emissive: LANE_COLORS[1], emissiveIntensity: 1.2, shininess: 80, transparent: true, opacity: 0.92 }),
        new THREE.MeshPhongMaterial({ color: LANE_COLORS[2], emissive: LANE_COLORS[2], emissiveIntensity: 1.2, shininess: 80, transparent: true, opacity: 0.92 }),
      ];

      // 구조 빔 (어두운 측면)
      this.sideMat = new THREE.MeshPhongMaterial({
        color: 0x0a1220, emissive: 0x060c18, emissiveIntensity: 1.0, shininess: 60, specular: 0x1a3060,
      });

      // 구분 패널 크로스빔
      this.divMat = new THREE.MeshPhongMaterial({
        color: 0x121c2e, emissive: 0x080e1c, emissiveIntensity: 1.0, shininess: 30,
      });
    }
  }

  createBridge(input: BridgeCreateInput): BridgeVisual {
    const { lane, x, z } = input;
    const g = new THREE.Group();

    // ── enhanced + GLB 트랙 스킨 ─────────────────────────────────────────────
    if (this.hasGlb && this.trackGlbScene && this.neonMats && this.padMats && this.trackBaseMat) {
      const neonMat    = this.neonMats[lane]!;
      const padMat     = this.padMats[lane]!;
      const baseMat    = this.trackBaseMat;

      for (let i = 0; i < TRACK_SEGS; i++) {
        const seg = this.trackGlbScene.clone(true);
        const localZ = -(BRIDGE_LENGTH / 2) + TRACK_SEG_LEN * i + TRACK_SEG_LEN / 2;
        seg.position.set(0, TRACK_SEG_Y, localZ);
        seg.rotation.y = Math.PI; // 화살표 전방(-Z) 방향 맞춤
        seg.frustumCulled = false;
        seg.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (!m.isMesh) return;
          m.frustumCulled = false;
          if (TRACK_NEON_NAMES.has(m.name)) {
            m.material = neonMat;           // 레인 색 네온 (레일·화살표)
          } else if (m.name === TRACK_PAD_NAME) {
            m.material = padMat;            // 레인 색 패드
          } else {
            m.material = baseMat;           // 네이비 블루 트랙 바디
          }
        });
        g.add(seg);
      }

      // 점프 패드 (z=-2200, 트랙 외부 — 로직 + 시각 가이드)
      const pad = new THREE.Mesh(new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH), padMat);
      pad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
      g.add(pad);
      g.position.set(x, 0, z);
      this.scene.add(g);
      return { mesh: g, padMesh: pad, padDepth: PAD_DEPTH };
    }

    // ── enhanced BoxGeometry (GLB 없을 때 폴백) ──────────────────────────────
    if (this.enhanced && this.darkMat && this.neonMats && this.padMats && this.sideMat && this.divMat) {
      const neonMat = this.neonMats[lane]!;
      const padMat  = this.padMats[lane]!;

      // 0: 어두운 금속 기반 상판
      const base = new THREE.Mesh(new THREE.BoxGeometry(LANE_WIDTH - 5, 8, BRIDGE_LENGTH), this.darkMat);
      base.position.y = 40;
      g.add(base);

      // 1: 좌측 네온 레일
      const leftRail = new THREE.Mesh(new THREE.BoxGeometry(4, 6, BRIDGE_LENGTH), neonMat);
      leftRail.position.set(-36, 46, 0);
      g.add(leftRail);

      // 2: 우측 네온 레일
      const rightRail = new THREE.Mesh(new THREE.BoxGeometry(4, 6, BRIDGE_LENGTH), neonMat);
      rightRail.position.set(36, 46, 0);
      g.add(rightRail);

      // 3: 좌측 구조 빔
      const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(7, 26, BRIDGE_LENGTH + PAD_DEPTH), this.sideMat);
      leftBeam.position.set(-40, 28, -PAD_DEPTH / 2);
      g.add(leftBeam);

      // 4: 우측 구조 빔
      const rightBeam = new THREE.Mesh(new THREE.BoxGeometry(7, 26, BRIDGE_LENGTH + PAD_DEPTH), this.sideMat);
      rightBeam.position.set(40, 28, -PAD_DEPTH / 2);
      g.add(rightBeam);

      // 5: 발광 점프 패드
      const pad = new THREE.Mesh(new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH), padMat);
      pad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
      g.add(pad);

      // 6~8: 구분 크로스빔 3개 (균등 배치)
      const divStep = BRIDGE_LENGTH / 3;
      for (let i = 0; i < 3; i++) {
        const div = new THREE.Mesh(new THREE.BoxGeometry(LANE_WIDTH - 2, 3, 6), this.divMat);
        div.position.set(0, 44, -BRIDGE_LENGTH / 2 + divStep * (i + 0.5));
        g.add(div);
      }

      g.position.set(x, 0, z);
      this.scene.add(g);
      return { mesh: g, padMesh: pad, padDepth: PAD_DEPTH };
    }

    // ── legacy 브릿지 (원본 동일) ────────────────────────────────────────────
    const bridgeColor = LANE_COLORS[lane]!;

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 5, 8, BRIDGE_LENGTH),
      new THREE.MeshBasicMaterial({ color: bridgeColor }),
    );
    top.position.y = 40;
    g.add(top);

    const legacyPad = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    legacyPad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
    g.add(legacyPad);

    const sideGeo   = new THREE.BoxGeometry(6, 25, BRIDGE_LENGTH + PAD_DEPTH);
    const sideMat   = new THREE.MeshPhongMaterial({ color: 0x222222, emissive: 0x111111 });
    const leftBeam  = new THREE.Mesh(sideGeo, sideMat);
    const rightBeam = new THREE.Mesh(sideGeo, sideMat);
    leftBeam.position.set(-(LANE_WIDTH / 2 - 4), 30, -PAD_DEPTH / 2);
    rightBeam.position.set( (LANE_WIDTH / 2 - 4), 30, -PAD_DEPTH / 2);
    g.add(leftBeam, rightBeam);

    g.position.set(x, 0, z);
    this.scene.add(g);
    return { mesh: g, padMesh: legacyPad, padDepth: PAD_DEPTH };
  }

  removeBridge(visual: BridgeVisual): void {
    const { mesh } = visual;

    if (this.hasGlb) {
      // GLB geometry/material은 템플릿과 공유 — 패드 BoxGeometry만 개별 dispose
      visual.padMesh.geometry.dispose();
    } else {
      mesh.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        // enhanced 공유 material은 dispose()에서 일괄 처리; legacy는 여기서 개별 dispose
        if (!this.enhanced && m.material) {
          (Array.isArray(m.material) ? m.material : [m.material])
            .forEach((mat) => (mat as THREE.Material).dispose());
        }
      });
    }

    this.scene.remove(mesh);
  }

  dispose(): void {
    if (!this.enhanced) return;
    this.darkMat?.dispose();
    if (this.neonMats) { for (const m of this.neonMats) m.dispose(); }
    if (this.padMats)  { for (const m of this.padMats)  m.dispose(); }
    this.sideMat?.dispose();
    this.divMat?.dispose();
    this.darkMat       = null;
    this.neonMats      = null;
    this.padMats       = null;
    this.sideMat       = null;
    this.divMat        = null;
    // GLB 템플릿은 FlowEngine이 소유 — 참조만 해제
    this.trackGlbScene = null;
    this.hasGlb        = false;
    this.trackBaseMat?.dispose();
    this.trackBaseMat  = null;
  }
}
