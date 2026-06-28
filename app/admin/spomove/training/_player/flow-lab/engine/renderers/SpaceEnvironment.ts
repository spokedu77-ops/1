import * as THREE from 'three';
import type { QualityTier } from '../AdaptiveQuality';
import type { SpaceEnvUpdateInput } from './EnvironmentThemeConfig';

// HIGH tier 기준 별 수량 (quality에 따라 스케일)
const FAR_COUNT  = 350;
const MID_COUNT  = 100;
const NEAR_COUNT = 28;

const QUALITY_SCALE: Record<QualityTier, number> = {
  HIGH: 1.0,
  MED:  0.40,
  LOW:  0.15,
};

export interface SpaceEnvironmentConfig {
  scene:        THREE.Scene;
  qualityTier:  QualityTier;
  renderer?:    THREE.WebGLRenderer;
  /** 파노라마 초기 정면 방향 오프셋 (°, -180 ~ +180) */
  yawDeg?:      number;
  /** 테스트 전용: THREE.TextureLoader 대체 */
  _loadFn?:     (url: string) => Promise<THREE.Texture>;
}

export class SpaceEnvironment {
  private scene:      THREE.Scene;
  private renderer?:  THREE.WebGLRenderer;
  private tier:       QualityTier;
  private yawDeg:     number;
  private panoTex:    THREE.Texture | null = null;
  private starLayers: THREE.Points[] = [];
  private loadFn:     (url: string) => Promise<THREE.Texture>;

  constructor(cfg: SpaceEnvironmentConfig) {
    this.scene    = cfg.scene;
    this.renderer = cfg.renderer;
    this.tier     = cfg.qualityTier;
    this.yawDeg   = cfg.yawDeg ?? 0;
    this.loadFn   = cfg._loadFn ?? ((url) => new Promise<THREE.Texture>((res, rej) => {
      new THREE.TextureLoader().load(url, res, undefined, rej);
    }));
    // 생성자에서 별/구 없음 — loadPanorama 성공 시 scene.background, 실패 시 별 fallback
  }

  private buildStarLayers(): void {
    const scale = QUALITY_SCALE[this.tier];
    const layers = [
      { count: Math.max(1, Math.round(FAR_COUNT  * scale)), spread: 22000, size: 1.5, opacity: 0.55 },
      { count: Math.max(1, Math.round(MID_COUNT  * scale)), spread: 12000, size: 2.0, opacity: 0.70 },
      { count: Math.max(1, Math.round(NEAR_COUNT * scale)), spread:  6000, size: 2.0, opacity: 0.90 },
    ];
    for (const cfg of layers) {
      const pos = new Float32Array(cfg.count * 3);
      for (let i = 0; i < cfg.count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * cfg.spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * cfg.spread;
        pos[i * 3 + 2] = (Math.random() - 0.5) * cfg.spread;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color: 0xffffff, size: cfg.size, transparent: true, opacity: cfg.opacity }),
      );
      this.scene.add(pts);
      this.starLayers.push(pts);
    }
  }

  async loadPanorama(highUrl?: string, lowUrl?: string): Promise<boolean> {
    if (!highUrl && !lowUrl) return false;

    let tex: THREE.Texture | null = null;
    if (highUrl) {
      try {
        tex = await this.loadFn(highUrl);
      } catch {
        if (lowUrl) {
          try { tex = await this.loadFn(lowUrl); } catch { /* stars fallback */ }
        }
      }
    } else if (lowUrl) {
      try { tex = await this.loadFn(lowUrl); } catch { /* stars fallback */ }
    }

    if (tex) {
      tex.mapping = THREE.EquirectangularReflectionMapping;

      // 이전 텍스처 교체
      if (this.panoTex) {
        this.panoTex.dispose();
      }
      this.panoTex = tex;

      this.scene.background = tex;
      this.scene.backgroundRotation.y = this.yawDeg * Math.PI / 180;

      // PMREMGenerator — metallic GLB 표면 환경 조명
      if (this.renderer) {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromEquirectangular(tex).texture;
        pmrem.dispose();
      }

      return true;
    }

    // 파노라마 로드 실패 → 별 레이어 fallback
    if (this.starLayers.length === 0) {
      this.buildStarLayers();
    }
    return false;
  }

  update(inp: SpaceEnvUpdateInput): void {
    if (inp.isIntroPhase) return;

    // 별 레이어 패럴랙스 (fallback 별이 있을 때만)
    for (let i = 0; i < this.starLayers.length; i++) {
      const layer = this.starLayers[i]!;
      layer.position.x = inp.cameraX * (0.01 + i * 0.015);
    }
  }

  dispose(): void {
    if (this.panoTex) {
      this.scene.background = null;
      this.panoTex.dispose();
      this.panoTex = null;
    }
    for (const pts of this.starLayers) {
      this.scene.remove(pts);
      pts.geometry.dispose();
      (pts.material as THREE.PointsMaterial).dispose();
    }
    this.starLayers = [];
  }

  /** 테스트용 getter */
  getPanoTex(): THREE.Texture | null { return this.panoTex; }
  getStarLayerCount(): number { return this.starLayers.length; }
}
