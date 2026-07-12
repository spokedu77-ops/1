/**
 * BridgeRenderer — 브릿지 Mesh 생성·제거 전담
 *
 * - legacy 모드: 원본 수치 완전 동일
 * - enhanced BoxGeometry: SF 네이비 상판 + 레인별 네온 레일/화살표 + 측면 구조 빔
 *   + cyan 베이스라인 (하부 분위기 네온)
 * - enhanced GLB: dive_track_segment.glb 10개 타일링
 *   · 레일(EMISSIVE_RAIL_*): 레인 색 네온
 *   · 화살표(ARROW_*): 레인 색 네온, position.y+0.8, renderOrder=3
 *   · 트랙 바디: bodyMat (SF 네이비 메탈)
 *   · PAD: 숨김
 *   · 추가 procedural 화살표 (chevron ×10) + cyan 베이스라인
 *
 * removeBridge — GLB 모드에서 pad + 오버레이(userData.ownGeo) geometry 개별 dispose
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

// deck 상면 Y (브릿지 그룹 local) — 화살표·베이스라인 배치 기준
const DECK_SURFACE_Y   = 44.5;   // TRACK_SEG_Y + ~7.5 (GLB deck 두께)
const BASE_NEON_Y      = TRACK_SEG_Y - 8; // 브릿지 하부 분위기 베이스라인

// ─── 타입 ────────────────────────────────────────────────────────────────────

const ENHANCED_DECK_W  = LANE_WIDTH - 5;
const ENHANCED_RAIL_X  = ENHANCED_DECK_W / 2 - 3;
const ENHANCED_BEAM_W  = 4;
const ENHANCED_BEAM_X  = ENHANCED_DECK_W / 2 - ENHANCED_BEAM_W / 2;
const END_PLATE_DEPTH  = 90;
const END_PLATE_Z      = BRIDGE_LENGTH / 2 - END_PLATE_DEPTH / 2;

export interface BridgeCreateInput {
  lane: 0 | 1 | 2;
  x:    number;
  z:    number;
  colorGateDeck?: {
    gateLocalZ: number;
    color: number;
  };
}

export interface BridgeVisual {
  mesh:               THREE.Group;
  padMesh:            THREE.Mesh;
  padDepth:           number;
  colorGateDeckMesh?: THREE.Mesh;
}

// ─── BridgeRenderer ──────────────────────────────────────────────────────────

export class BridgeRenderer {
  private scene:    THREE.Scene;
  private enhanced: boolean;

  // enhanced 공유 material
  private bodyMat:     THREE.MeshStandardMaterial | null = null;
  private sideMat:     THREE.MeshStandardMaterial | null = null;
  private divMat:      THREE.MeshStandardMaterial | null = null;
  // 레인별 네온 (레일 + 화살표 공용) — MeshStandardMaterial, toneMapped=false, emissiveIntensity>1 → bloom 발동
  private laneNeonMats: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial, THREE.MeshStandardMaterial] | null = null;
  // cyan 베이스라인 네온
  private baseCyanMat: THREE.MeshStandardMaterial | null = null;

  private trackGlbScene: THREE.Object3D | null = null;
  private hasGlb = false;

  constructor(scene: THREE.Scene, enhanced = false, trackGlbScene: THREE.Object3D | null = null) {
    this.scene    = scene;
    this.enhanced = enhanced;

    if (enhanced && trackGlbScene) {
      this.trackGlbScene = trackGlbScene;
      this.hasGlb = true;
    }

    if (enhanced) {
      this.bodyMat = new THREE.MeshStandardMaterial({
        color: 0x081a35, metalness: 0.45, roughness: 0.42,
        emissive: 0x020916, emissiveIntensity: 0.12,
      });
      this.sideMat = new THREE.MeshStandardMaterial({
        color: 0x050c1b, metalness: 0.65, roughness: 0.38,
        emissive: 0x01040a, emissiveIntensity: 0.08,
      });
      this.divMat = new THREE.MeshStandardMaterial({
        color: 0x061b3d, metalness: 0.35, roughness: 0.5,
        emissive: 0x010714, emissiveIntensity: 0.1,
      });
      // 레인별 네온 — MeshStandardMaterial + emissiveIntensity 색상별 최솟값
      // 픽셀 휘도 = L(color) × intensity > 0.85(threshold) 로 bloom 발동
      // green(L≈0.608)×1.5→0.91, red(L≈0.409)×2.2→0.90, yellow(L≈0.755)×1.2→0.91, cyan(L≈0.686)×1.4→0.96
      // bodyMat·sideMat(emissiveIntensity 0.08~0.12)·GLB obstacle 재질은 threshold 미달 유지 → bloom 미적용
      this.laneNeonMats = [
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: LANE_COLORS[0], emissiveIntensity: 1.5, roughness: 1, metalness: 0, toneMapped: false }),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: LANE_COLORS[1], emissiveIntensity: 2.2, roughness: 1, metalness: 0, toneMapped: false }),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: LANE_COLORS[2], emissiveIntensity: 1.2, roughness: 1, metalness: 0, toneMapped: false }),
      ];
      // cyan 베이스라인 — 분위기 네온
      this.baseCyanMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x22d3ee, emissiveIntensity: 1.4, roughness: 1, metalness: 0, toneMapped: false });
    }
  }

  private addColorGateDeck(
    group: THREE.Group,
    gateLocalZ: number,
    color: number,
    width: number,
    y: number,
  ): THREE.Mesh | undefined {
    const startZ = -BRIDGE_LENGTH / 2;
    const endZ = Math.min(gateLocalZ - 8, BRIDGE_LENGTH / 2);
    const depth = endZ - startZ;
    if (depth <= 1) return undefined;

    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 2, depth), mat);
    mesh.position.set(0, y, startZ + depth / 2);
    mesh.visible = false;
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    mesh.userData['ownGeo'] = true;
    mesh.userData['ownMat'] = true;
    mesh.userData['colorGateDeck'] = true;
    group.add(mesh);
    return mesh;
  }

  createBridge(input: BridgeCreateInput): BridgeVisual {
    if (!this.scene) {
      throw new Error('BridgeRenderer: scene is not available');
    }
    const { lane, x, z } = input;
    const g = new THREE.Group();

    // ── enhanced + GLB 트랙 스킨 ─────────────────────────────────────────────
    if (this.hasGlb && this.trackGlbScene && this.laneNeonMats && this.bodyMat && this.baseCyanMat) {
      const neonMat = this.laneNeonMats[lane]!;
      const bMat    = this.bodyMat;

      for (let i = 0; i < TRACK_SEGS; i++) {
        const seg = this.trackGlbScene.clone(true);
        const localZ = -(BRIDGE_LENGTH / 2) + TRACK_SEG_LEN * i + TRACK_SEG_LEN / 2;
        seg.position.set(0, TRACK_SEG_Y, localZ);
        seg.frustumCulled = false;
        seg.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (!m.isMesh) return;
          m.frustumCulled = false;

          if (m.name === TRACK_PAD_NAME) {
            m.visible = false;
          } else if (TRACK_RAIL_NAMES.has(m.name)) {
            m.material = neonMat;   // 레일: 레인 색 네온
            m.visible  = true;
          } else if (m.name.startsWith('ARROW_')) {
            m.material      = neonMat;  // GLB 내장 화살표: 레인 색
            m.rotation.y   += Math.PI;  // 전방(-Z) 방향 보정
            m.position.y   += 0.8;      // z-fighting 방지
            m.renderOrder   = 3;
            m.frustumCulled = false;
            m.visible       = true;
          } else {
            m.material = bMat;  // 트랙 바디: SF 네이비 메탈
            m.visible  = true;
          }
        });
        g.add(seg);
      }

      // ── 프로시저럴 오버레이 (브릿지 그룹 직접 자식) ──────────────────────────
      // 화살표가 GLB에 없거나 너무 작아도 반드시 표시되도록 항상 생성

      // cyan 베이스라인 — 브릿지 하부 분위기 네온 (중심 얇은 선)
      const baseGeo = new THREE.BoxGeometry(8, 3, BRIDGE_LENGTH);
      const baseNeon = new THREE.Mesh(baseGeo, this.baseCyanMat);
      baseNeon.position.set(0, BASE_NEON_Y, 0);
      baseNeon.userData['ownGeo'] = true;
      g.add(baseNeon);

      // 레인 색 filled 화살표 ×10 — ShapeGeometry (두께 0, 사이드 없음 → T 현상 완전 제거)
      // tip +Y → rotation.x=-π/2 후 -Z (씬 안쪽), shaft +Z (카메라 방향)
      // AH=SL=50 이므로 Z 중심=0 → offset 불필요
      {
        const A_AW = 68, A_AH = 50, A_SW = 24, A_SL = 50;
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(-A_SW / 2, -A_SL);
        arrowShape.lineTo(-A_SW / 2,  0);
        arrowShape.lineTo(-A_AW / 2,  0);
        arrowShape.lineTo( 0,         A_AH);
        arrowShape.lineTo( A_AW / 2,  0);
        arrowShape.lineTo( A_SW / 2,  0);
        arrowShape.lineTo( A_SW / 2, -A_SL);
        arrowShape.closePath();
        const numArrows = 10;
        const aStep = BRIDGE_LENGTH / numArrows;
        for (let i = 0; i < numArrows; i++) {
          const az = -BRIDGE_LENGTH / 2 + aStep * (i + 0.5);
          const arrowGeo  = new THREE.ShapeGeometry(arrowShape);
          const arrowMesh = new THREE.Mesh(arrowGeo, neonMat);
          arrowMesh.rotation.x        = -Math.PI / 2;
          arrowMesh.position.set(0, DECK_SURFACE_Y + 0.5, az);
          arrowMesh.renderOrder        = 3;
          arrowMesh.userData['ownGeo'] = true;
          g.add(arrowMesh);
        }
      }

      // 시작/끝 발판
      for (const side of [1, -1] as const) {
        const pg = new THREE.BoxGeometry(ENHANCED_DECK_W, 16, END_PLATE_DEPTH);
        const pm = new THREE.Mesh(pg, bMat);
        pm.position.set(0, TRACK_SEG_Y, side * END_PLATE_Z);
        pm.userData['ownGeo'] = true;
        g.add(pm);
      }

      // 점프 패드 (판정 전용 — 시각 비활성)
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH),
        this.bodyMat,
      );
      pad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
      pad.visible = false;
      g.add(pad);

      const colorGateDeckMesh = input.colorGateDeck
        ? this.addColorGateDeck(
          g,
          input.colorGateDeck.gateLocalZ,
          input.colorGateDeck.color,
          ENHANCED_DECK_W,
          DECK_SURFACE_Y + 0.8,
        )
        : undefined;

      g.position.set(x, 0, z);
      this.scene.add(g);
      return { mesh: g, padMesh: pad, padDepth: PAD_DEPTH, colorGateDeckMesh };
    }

    // ── enhanced BoxGeometry (GLB 없을 때 폴백) ──────────────────────────────
    if (this.enhanced && this.bodyMat && this.laneNeonMats && this.sideMat && this.divMat && this.baseCyanMat) {
      const neonMat = this.laneNeonMats[lane]!;

      // 상판 (SF 네이비)
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(ENHANCED_DECK_W, 8, BRIDGE_LENGTH),
        this.bodyMat,
      );
      base.position.y = 40;
      g.add(base);

      // 좌우 레인 색 네온 레일
      const leftRail = new THREE.Mesh(new THREE.BoxGeometry(3, 4, BRIDGE_LENGTH), neonMat);
      leftRail.position.set(-ENHANCED_RAIL_X, 45, 0);
      g.add(leftRail);
      const rightRail = new THREE.Mesh(new THREE.BoxGeometry(3, 4, BRIDGE_LENGTH), neonMat);
      rightRail.position.set(ENHANCED_RAIL_X, 45, 0);
      g.add(rightRail);

      // cyan 베이스라인 — 상판 하부 분위기 네온
      const baseNeon = new THREE.Mesh(
        new THREE.BoxGeometry(8, 3, BRIDGE_LENGTH),
        this.baseCyanMat,
      );
      baseNeon.position.set(0, 34, 0);
      g.add(baseNeon);

      // 좌우 구조 빔
      const leftBeam = new THREE.Mesh(
        new THREE.BoxGeometry(ENHANCED_BEAM_W, 26, BRIDGE_LENGTH), this.sideMat,
      );
      leftBeam.position.set(-ENHANCED_BEAM_X, 28, 0);
      g.add(leftBeam);
      const rightBeam = new THREE.Mesh(
        new THREE.BoxGeometry(ENHANCED_BEAM_W, 26, BRIDGE_LENGTH), this.sideMat,
      );
      rightBeam.position.set(ENHANCED_BEAM_X, 28, 0);
      g.add(rightBeam);

      // 점프 패드 (판정 전용)
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_WIDTH - 10, 6, PAD_DEPTH),
        this.bodyMat,
      );
      pad.position.set(0, 44, -(BRIDGE_LENGTH / 2 + PAD_DEPTH / 2));
      pad.visible = false;
      g.add(pad);

      // 구분 크로스빔 (숨김)
      const divStep = BRIDGE_LENGTH / 3;
      for (let i = 0; i < 3; i++) {
        const div = new THREE.Mesh(new THREE.BoxGeometry(LANE_WIDTH - 2, 3, 6), this.divMat);
        div.position.set(0, 44, -BRIDGE_LENGTH / 2 + divStep * (i + 0.5));
        div.visible = false;
        g.add(div);
      }

      // 레인 색 filled 화살표 ×8 — ShapeGeometry (BoxGeometry 폴백 경로)
      {
        const A_AW = 68, A_AH = 50, A_SW = 24, A_SL = 50;
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(-A_SW / 2, -A_SL);
        arrowShape.lineTo(-A_SW / 2,  0);
        arrowShape.lineTo(-A_AW / 2,  0);
        arrowShape.lineTo( 0,         A_AH);
        arrowShape.lineTo( A_AW / 2,  0);
        arrowShape.lineTo( A_SW / 2,  0);
        arrowShape.lineTo( A_SW / 2, -A_SL);
        arrowShape.closePath();
        const numArrows = 8;
        const aStep = BRIDGE_LENGTH / (numArrows + 1);
        for (let i = 0; i < numArrows; i++) {
          const az = -BRIDGE_LENGTH / 2 + aStep * (i + 1);
          const arrowGeo  = new THREE.ShapeGeometry(arrowShape);
          const arrowMesh = new THREE.Mesh(arrowGeo, neonMat);
          arrowMesh.rotation.x = -Math.PI / 2;
          arrowMesh.position.set(0, 44.5 + 0.5, az);
          arrowMesh.renderOrder = 3;
          g.add(arrowMesh);
        }
      }

      // 시작/끝 발판
      for (const side of [1, -1] as const) {
        const pg = new THREE.BoxGeometry(ENHANCED_DECK_W, 16, END_PLATE_DEPTH);
        const pm = new THREE.Mesh(pg, this.bodyMat);
        pm.position.set(0, 36, side * END_PLATE_Z);
        g.add(pm);
      }

      const colorGateDeckMesh = input.colorGateDeck
        ? this.addColorGateDeck(
          g,
          input.colorGateDeck.gateLocalZ,
          input.colorGateDeck.color,
          ENHANCED_DECK_W,
          45.8,
        )
        : undefined;

      g.position.set(x, 0, z);
      this.scene.add(g);
      return { mesh: g, padMesh: pad, padDepth: PAD_DEPTH, colorGateDeckMesh };
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

    const sideGeo  = new THREE.BoxGeometry(6, 25, BRIDGE_LENGTH);
    const sMat     = new THREE.MeshPhongMaterial({ color: 0x222222, emissive: 0x111111 });
    const leftB    = new THREE.Mesh(sideGeo, sMat);
    const rightB   = new THREE.Mesh(sideGeo, sMat);
    leftB.position.set(-(LANE_WIDTH / 2 - 4), 30, 0);
    rightB.position.set( (LANE_WIDTH / 2 - 4), 30, 0);
    g.add(leftB, rightB);

    const colorGateDeckMesh = input.colorGateDeck
      ? this.addColorGateDeck(
        g,
        input.colorGateDeck.gateLocalZ,
        input.colorGateDeck.color,
        LANE_WIDTH - 5,
        45.2,
      )
      : undefined;

    g.position.set(x, 0, z);
    this.scene.add(g);
    return { mesh: g, padMesh: legacyPad, padDepth: PAD_DEPTH, colorGateDeckMesh };
  }

  revealColorGateDeck(visual: BridgeVisual): void {
    if (visual.colorGateDeckMesh) {
      visual.colorGateDeckMesh.visible = true;
    }
  }

  removeBridge(visual: BridgeVisual): void {
    const { mesh } = visual;
    if (this.hasGlb) {
      // GLB 공유 geometry: dispose 금지
      // pad + 오버레이(userData.ownGeo) geometry만 개별 dispose
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
        if (m.material && (!this.enhanced || (m.userData['ownMat'] as boolean))) {
          (Array.isArray(m.material) ? m.material : [m.material])
            .forEach((mat) => (mat as THREE.Material).dispose());
        }
      });
    }
    this.scene.remove(mesh);
  }

  dispose(): void {
    if (!this.enhanced) return;
    this.bodyMat?.dispose();
    this.sideMat?.dispose();
    this.divMat?.dispose();
    this.baseCyanMat?.dispose();
    if (this.laneNeonMats) { for (const m of this.laneNeonMats) m.dispose(); }
    this.bodyMat      = null;
    this.sideMat      = null;
    this.divMat       = null;
    this.baseCyanMat  = null;
    this.laneNeonMats = null;
    this.trackGlbScene = null;
    this.hasGlb        = false;
  }
}
