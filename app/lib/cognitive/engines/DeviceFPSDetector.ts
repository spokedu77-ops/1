/**
 * DeviceFPSDetector
 * 디바이스 실제 FPS 감지 및 캐싱
 */

export class DeviceFPSDetector {
  private static cachedFPS: number | null = null;
  private static detectionPromise: Promise<number> | null = null;

  /**
   * 백그라운드에서 미리 FPS 감지 (EntryScreen 렌더링 시점)
   */
  static async detectFPSAsync(): Promise<number> {
    // 이미 감지 중이면 기존 Promise 반환
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    // 캐시된 값이 있으면 즉시 반환
    if (this.cachedFPS !== null) {
      return Promise.resolve(this.cachedFPS);
    }

    // 새로 감지 시작
    this.detectionPromise = new Promise((resolve) => {
      let frameCount = 0;
      let lastTime = performance.now();
      const samples: number[] = [];

      const measure = (currentTime: number) => {
        frameCount++;
        const delta = currentTime - lastTime;
        
        if (frameCount < 100) {
          samples.push(1000 / delta);
          lastTime = currentTime;
          requestAnimationFrame(measure);
        } else {
          const sorted = samples.sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          this.cachedFPS = Math.round(median);
          this.detectionPromise = null;
          resolve(this.cachedFPS);
        }
      };

      requestAnimationFrame(measure);
    });

    return this.detectionPromise;
  }

  /**
   * 감지 진행 상태 확인
   */
  static isDetecting(): boolean {
    return this.detectionPromise !== null && this.cachedFPS === null;
  }

  /**
   * Hz를 FPS의 정수 배수로 보정 (Snap-to-Grid)
   */
  static snapToGrid(requestedHz: number, deviceFPS: number = 60): number {
    const divisor = Math.round(deviceFPS / requestedHz);
    const snappedHz = deviceFPS / divisor;
    return Math.max(8, Math.min(15, snappedHz));
  }

  /**
   * 캐시된 FPS 값 가져오기
   */
  static getCachedFPS(): number | null {
    return this.cachedFPS;
  }
}
