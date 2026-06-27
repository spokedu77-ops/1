/**
 * PostProcessingRenderer — enhanced 모드 Bloom 후처리
 *
 * Three.js 내장 모듈만 사용:
 *   EffectComposer → RenderPass → UnrealBloomPass
 *
 * - legacy 모드: 사용하지 않음 (FlowEngine이 renderer.render 직접 호출)
 * - enhanced 모드: this.render()가 renderer.render 대체
 * - LOW quality: bloom 강도 0 → UnrealBloomPass 미생성
 * - UI(React overlay)는 Three.js 캔버스 위에 CSS로 올라가므로 bloom 미적용
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { QualityTier } from '../AdaptiveQuality';

// 품질별 bloom 강도 (0 = 비활성화)
// 임계값을 높여 어두운 파노라마 배경은 bloom 제외, 네온 발광체(emissiveIntensity 0.85+)만 bloom
const BLOOM_STRENGTH: Record<QualityTier, number> = {
  HIGH: 0.45,
  MED:  0.32,
  LOW:  0,
};
const BLOOM_RADIUS    = 0.22;
const BLOOM_THRESHOLD = 0.85; // 0.85 이상만 번짐 — 어두운 우주 배경·기반판 제외, 네온 레일·링만 적용

export class PostProcessingRenderer {
  private composer: EffectComposer;

  constructor(
    renderer:     THREE.WebGLRenderer,
    scene:        THREE.Scene,
    camera:       THREE.Camera,
    width:        number,
    height:       number,
    qualityTier:  QualityTier,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    const strength = BLOOM_STRENGTH[qualityTier];
    if (strength > 0) {
      this.composer.addPass(
        new UnrealBloomPass(
          new THREE.Vector2(width, height),
          strength,
          BLOOM_RADIUS,
          BLOOM_THRESHOLD,
        ),
      );
    }
  }

  render(): void {
    this.composer.render();
  }

  resize(w: number, h: number): void {
    this.composer.setSize(w, h);
  }

  dispose(): void {
    this.composer.dispose();
  }
}
