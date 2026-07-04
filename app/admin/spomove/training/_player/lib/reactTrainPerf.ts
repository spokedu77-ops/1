'use client';

export type PerfTier = 'high' | 'low';

function detectStaticTier(): PerfTier {
  if (typeof navigator === 'undefined') return 'high';
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return cores <= 4 || mem <= 2 ? 'low' : 'high';
}

/** 앱 시작 시 1회 정적 감지 (CPU 코어 ≤4 또는 RAM ≤2GB → low). SSR 안전. */
export const staticPerfTier: PerfTier = detectStaticTier();

/**
 * RAF 루프 내에서 실제 FPS를 측정해 tier를 동적 조정.
 * 2초 윈도우 평균 FPS가 40 미만이면 low로 전환 (한 번 low가 되면 유지).
 * 이미 low이면 측정 중단.
 */
export class PerfMonitor {
  private samples: number[] = [];
  private readonly windowMs = 2000;
  tier: PerfTier = staticPerfTier;

  tick(nowMs: number) {
    if (this.tier === 'low') return;
    this.samples.push(nowMs);
    const cutoff = nowMs - this.windowMs;
    while (this.samples.length > 1 && this.samples[0]! < cutoff) this.samples.shift();
    if (this.samples.length >= 40) {
      const elapsed = nowMs - this.samples[0]!;
      const fps = (this.samples.length - 1) / (elapsed / 1000);
      if (fps < 40) this.tier = 'low';
    }
  }

  get isLow() {
    return this.tier === 'low';
  }
}
