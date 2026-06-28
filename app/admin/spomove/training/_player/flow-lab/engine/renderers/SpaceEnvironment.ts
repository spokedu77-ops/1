import * as THREE from 'three';
import type { QualityTier } from '../AdaptiveQuality';
import {
  LEGACY_PANO_VERTEX,
  LEGACY_PANO_FRAGMENT,
  LEGACY_PANO_SPHERE_RADIUS,
  LEGACY_PANO_ROTATION_DT60_CW,
} from '../../visuals/LegacyPanoramaShader';
import type { SpaceEnvUpdateInput } from './EnvironmentThemeConfig';
import {
  ENHANCED_VIGNETTE_SCALE,
  ENHANCED_GRAIN_SCALE,
} from './EnvironmentThemeConfig';

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
  scene:       THREE.Scene;
  qualityTier: QualityTier;
  /** 파노라마 초기 정면 방향 오프셋 (°, -180 ~ +180) */
  yawDeg?:     number;
  /** 테스트 전용: THREE.TextureLoader 대체 */
  _loadFn?:    (url: string) => Promise<THREE.Texture>;
}

export class SpaceEnvironment {
  private scene:       THREE.Scene;
  private sphere:      THREE.Mesh | null = null;
  private shaderMat:   THREE.ShaderMaterial | null = null;
  private panoTex:     THREE.Texture | null = null;
  private defaultTex:  THREE.DataTexture | null = null;
  private starLayers:  THREE.Points[] = [];
  private panoRotation = 0;
  private uTime        = 0;
  private loadFn:      (url: string) => Promise<THREE.Texture>;

  constructor(cfg: SpaceEnvironmentConfig) {
    this.scene        = cfg.scene;
    this.panoRotation = ((cfg.yawDeg ?? 0) * Math.PI) / 180;
    this.loadFn  = cfg._loadFn ?? ((url) => new Promise<THREE.Texture>((res, rej) => {
      new THREE.TextureLoader().load(url, res, undefined, rej);
    }));
    this.buildStarLayers(cfg.qualityTier);
    this.buildPanoSphere();
  }

  private buildStarLayers(tier: QualityTier): void {
    const scale = QUALITY_SCALE[tier];
    const layers = [
      { count: Math.max(1, Math.round(FAR_COUNT  * scale)), spread: 22000, size: 1.5, opacity: 0.55 },
      { count: Math.max(1, Math.round(MID_COUNT  * scale)), spread: 12000, size: 2.2, opacity: 0.70 },
      { count: Math.max(1, Math.round(NEAR_COUNT * scale)), spread:  6000, size: 3.5, opacity: 0.90 },
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

  private buildPanoSphere(): void {
    // 기본 텍스처 (파노라마 로딩 전 빈 화면 방지)
    this.defaultTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.defaultTex.needsUpdate = true;

    const geo = new THREE.SphereGeometry(LEGACY_PANO_SPHERE_RADIUS, 64, 32);
    this.shaderMat = new THREE.ShaderMaterial({
      vertexShader:   LEGACY_PANO_VERTEX,
      fragmentShader: LEGACY_PANO_FRAGMENT,
      uniforms: {
        map:            { value: this.defaultTex },
        uTime:          { value: 0 },
        uVignetteScale: { value: ENHANCED_VIGNETTE_SCALE },
        uGrainScale:    { value: ENHANCED_GRAIN_SCALE },
        uPanoRotation:  { value: this.panoRotation },
      },
      side:       THREE.BackSide,
      depthWrite: false,
    });
    this.sphere = new THREE.Mesh(geo, this.shaderMat);
    this.sphere.renderOrder = -1;
    this.scene.add(this.sphere);
  }

  async loadPanorama(highUrl?: string, lowUrl?: string): Promise<void> {
    if (!highUrl && !lowUrl) return;

    let tex: THREE.Texture | null = null;
    if (highUrl) {
      try {
        tex = await this.loadFn(highUrl);
      } catch {
        if (lowUrl) {
          try { tex = await this.loadFn(lowUrl); } catch { /* color fallback */ }
        }
      }
    } else if (lowUrl) {
      try { tex = await this.loadFn(lowUrl); } catch { /* color fallback */ }
    }

    if (!this.shaderMat) {
      // dispose 이후에 텍스처 로드 완료된 경우
      if (tex) tex.dispose();
      return;
    }

    if (tex) {
      if (this.panoTex) {
        this.panoTex.dispose();
      } else if (this.defaultTex) {
        this.shaderMat.uniforms['map'].value = null;
        this.defaultTex.dispose();
        this.defaultTex = null;
      }
      this.panoTex = tex;
      this.shaderMat.uniforms['map'].value = tex;
    }
  }

  update(inp: SpaceEnvUpdateInput): void {
    if (inp.isIntroPhase) return;

    const dt60 = inp.dt * 60;
    this.uTime       += inp.dt;
    this.panoRotation += LEGACY_PANO_ROTATION_DT60_CW * dt60;

    if (this.shaderMat) {
      this.shaderMat.uniforms['uTime'].value         = this.uTime;
      this.shaderMat.uniforms['uPanoRotation'].value = this.panoRotation;
    }
    if (this.sphere) {
      this.sphere.position.x = inp.cameraX * 0.02;
    }

    // 별 레이어별 속도/패럴랙스 차등 (깊이감)
    for (let i = 0; i < this.starLayers.length; i++) {
      const layer = this.starLayers[i]!;
      layer.rotation.y  -= 0.00008 * dt60 * (0.8 + i * 0.4);
      layer.position.x   = inp.cameraX * (0.01 + i * 0.015);
    }
  }

  dispose(): void {
    // 텍스처만 직접 dispose — geometry/material은 FlowEngine.scene.traverse가 처리
    if (this.panoTex) {
      if (this.shaderMat) this.shaderMat.uniforms['map'].value = null;
      this.panoTex.dispose();
      this.panoTex = null;
    }
    if (this.defaultTex) {
      if (this.shaderMat && this.shaderMat.uniforms['map'].value === this.defaultTex) {
        this.shaderMat.uniforms['map'].value = null;
      }
      this.defaultTex.dispose();
      this.defaultTex = null;
    }
    this.shaderMat  = null;
    this.sphere     = null;
    this.starLayers = [];
  }

  /** 테스트용 getter */
  getPanoTex(): THREE.Texture | null { return this.panoTex; }
}
