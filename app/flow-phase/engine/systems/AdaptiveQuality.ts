/**
 * FPS 기반 적응형 품질. tier HIGH = 기존과 동일, 저 FPS 시에만 스케일 다운 (멀미 방지).
 */
import {
  ADAPTIVE_FPS_THRESHOLD,
  ADAPTIVE_LOW_DURATION_SEC,
  ADAPTIVE_TIER_COOLDOWN_SEC,
} from '../core/coordContract';

export type QualityTier = 'HIGH' | 'MED' | 'LOW';

const FPS_SAMPLES = 30;

export class AdaptiveQuality {
  private tier: QualityTier = 'HIGH';
  private deltaHistory: number[] = [];
  private lowFpsAccum = 0;
  private tierChangeTime = 0;

  update(dt: number): void {
    this.deltaHistory.push(dt);
    if (this.deltaHistory.length > FPS_SAMPLES) this.deltaHistory.shift();
    const avgDt = this.deltaHistory.reduce((a, b) => a + b, 0) / this.deltaHistory.length;
    const fps = avgDt > 0 ? 1 / avgDt : 60;

    if (fps < ADAPTIVE_FPS_THRESHOLD) {
      this.lowFpsAccum += dt;
    } else {
      this.lowFpsAccum = 0;
    }

    const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
    if (now - this.tierChangeTime < ADAPTIVE_TIER_COOLDOWN_SEC) return;

    if (this.lowFpsAccum >= ADAPTIVE_LOW_DURATION_SEC) {
      this.lowFpsAccum = 0;
      this.tierChangeTime = now;
      if (this.tier === 'HIGH') this.tier = 'MED';
      else if (this.tier === 'MED') this.tier = 'LOW';
    }
  }

  getTier(): QualityTier {
    return this.tier;
  }

  /** 2D speedLine 스폰 rate에 곱할 계수. HIGH=1, MED=0.7, LOW=0.4 */
  getSpeedLineRateScale(): number {
    switch (this.tier) {
      case 'MED':
        return 0.7;
      case 'LOW':
        return 0.4;
      default:
        return 1;
    }
  }

  /** 파노 비네팅 강도. HIGH=1, MED=0.7, LOW=0.4 */
  getVignetteScale(): number {
    switch (this.tier) {
      case 'MED':
        return 0.7;
      case 'LOW':
        return 0.4;
      default:
        return 1;
    }
  }

  /** 파노 그레인 강도. HIGH=1, MED=0.5, LOW=0 */
  getGrainScale(): number {
    switch (this.tier) {
      case 'MED':
        return 0.5;
      case 'LOW':
        return 0;
      default:
        return 1;
    }
  }
}
