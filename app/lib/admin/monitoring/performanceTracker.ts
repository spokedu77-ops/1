/**
 * Phase Performance Monitor
 * FPS 및 Tick Drift 측정 (12Hz 정밀도 보장)
 */

export interface PerformanceMetrics {
  fps: number;
  tickDrift: number; // ms (실제 간격 - 예상 간격)
  targetHz: number;
  actualHz: number;
  isQualityAcceptable: boolean;
}

export class PhasePerformanceMonitor {
  private targetHz: number;
  private expectedInterval: number; // ms
  private lastTickTime: number = 0;
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private currentFps: number = 0;
  private tickDriftSamples: number[] = [];
  private maxSamples: number = 60; // 1초간 샘플 (60fps 기준)
  
  constructor(targetHz: number = 12) {
    this.targetHz = targetHz;
    this.expectedInterval = 1000 / targetHz; // 예: 12Hz = 83.33ms
  }

  /**
   * Tick 시작 (각 toggle 시 호출)
   */
  recordTick(): void {
    const now = performance.now();
    
    if (this.lastTickTime > 0) {
      const actualInterval = now - this.lastTickTime;
      const drift = actualInterval - this.expectedInterval;
      
      // 샘플 저장 (최근 N개만 유지)
      this.tickDriftSamples.push(drift);
      if (this.tickDriftSamples.length > this.maxSamples) {
        this.tickDriftSamples.shift();
      }
    }
    
    this.lastTickTime = now;
  }

  /**
   * Frame 업데이트 (RAF 루프에서 호출)
   */
  recordFrame(): void {
    const now = performance.now();
    this.frameCount++;
    
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  /**
   * 현재 성능 메트릭 반환
   */
  getMetrics(): PerformanceMetrics {
    // 평균 Tick Drift 계산
    const avgDrift = this.tickDriftSamples.length > 0
      ? this.tickDriftSamples.reduce((a, b) => a + b, 0) / this.tickDriftSamples.length
      : 0;

    // 실제 Hz 계산 (최근 샘플 기반)
    const recentInterval = this.tickDriftSamples.length > 0
      ? this.expectedInterval + avgDrift
      : this.expectedInterval;
    const actualHz = recentInterval > 0 ? 1000 / recentInterval : this.targetHz;

    // 품질 판정: FPS >= 55 && Tick Drift < 5ms
    const isQualityAcceptable = 
      this.currentFps >= 55 && 
      Math.abs(avgDrift) < 5;

    return {
      fps: this.currentFps,
      tickDrift: avgDrift,
      targetHz: this.targetHz,
      actualHz: Math.round(actualHz * 10) / 10,
      isQualityAcceptable
    };
  }

  /**
   * 리셋
   */
  reset(): void {
    this.lastTickTime = 0;
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.tickDriftSamples = [];
    this.currentFps = 0;
  }

  /**
   * Target Hz 변경
   */
  setTargetHz(hz: number): void {
    this.targetHz = hz;
    this.expectedInterval = 1000 / hz;
    this.reset();
  }
}
