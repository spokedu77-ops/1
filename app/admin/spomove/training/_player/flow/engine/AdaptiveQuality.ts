/**
 * Flow 2.0 — 적응형 품질
 * FPS 측정 → HIGH / MED / LOW 3단계 자동 전환
 */

export type QualityTier = 'HIGH' | 'MED' | 'LOW';

const FPS_SAMPLE = 60;   // 측정 샘플 수
const DROP_TO_MED = 40;  // fps < 이 값이면 MED로
const DROP_TO_LOW = 25;  // fps < 이 값이면 LOW로
const RECOVER_TO_HIGH = 55;
const RECOVER_TO_MED = 35;

export class AdaptiveQuality {
  private tier: QualityTier = 'HIGH';
  private fpsBuf: number[] = [];
  private lastTime = 0;

  update(dt: number): void {
    if (dt <= 0) return;
    this.fpsBuf.push(1 / dt);
    if (this.fpsBuf.length > FPS_SAMPLE) this.fpsBuf.shift();
    if (this.fpsBuf.length < 20) return;

    const avg = this.fpsBuf.reduce((a, b) => a + b, 0) / this.fpsBuf.length;
    if (this.tier === 'HIGH' && avg < DROP_TO_MED) this.tier = 'MED';
    else if (this.tier === 'MED' && avg < DROP_TO_LOW) this.tier = 'LOW';
    else if (this.tier === 'LOW' && avg > RECOVER_TO_MED) this.tier = 'MED';
    else if (this.tier === 'MED' && avg > RECOVER_TO_HIGH) this.tier = 'HIGH';
    this.lastTime = avg;
  }

  getTier(): QualityTier { return this.tier; }

  /** Three.js renderer.setPixelRatio 상한 */
  getPixelRatioMax(): number {
    if (this.tier === 'LOW') return 1;
    if (this.tier === 'MED') return 1.5;
    return 2;
  }

  /** 별 개수 배율 */
  getStarCountScale(): number {
    if (this.tier === 'LOW') return 0.25;
    if (this.tier === 'MED') return 0.55;
    return 1;
  }

  /** 파편/코인 개수 배율 */
  getShardScale(): number {
    if (this.tier === 'LOW') return 0.3;
    if (this.tier === 'MED') return 0.6;
    return 1;
  }

  /** 2D 속도선 최대 개수 (0 = 무제한) */
  getSpeedLineCap(): number {
    if (this.tier === 'LOW') return 6;
    if (this.tier === 'MED') return 12;
    return 0;
  }

  /** 파티클 링 세그먼트 수 */
  getParticleSegments(): number {
    if (this.tier === 'LOW') return 8;
    if (this.tier === 'MED') return 16;
    return 24;
  }
}
