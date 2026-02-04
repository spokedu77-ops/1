/**
 * Stroboscopic Binary Engine
 * RequestAnimationFrame을 사용하여 디바이스 주사율과 동기화된 정밀 Hz 제어
 */

import { DeviceFPSDetector } from './DeviceFPSDetector';

export class StroboscopicEngine {
  private frequency: number; // Hz (기본 12Hz)
  private phase: 'off' | 'on' = 'off';
  private rafId: number | null = null;
  private lastToggleTime: number = 0;
  private onToggleCallback?: (phase: 'off' | 'on') => void;
  private deviceFPS: number = 60; // 기본값
  private frameInterval: number; // ms (정확한 프레임 간격)
  private syncLock: boolean = false; // 동기화 락
  private timerCallback?: (remaining: number) => void;
  private startTime: number = 0;
  private duration: number = 0;
  private isRunning: boolean = false;
  private frameCounter: number = 0;
  private targetFrameInterval: number = 0;

  constructor(frequency: number = 12) {
    this.frequency = frequency;
    this.frameInterval = 1000 / this.deviceFPS; // 16.67ms @ 60Hz
  }

  /**
   * 디바이스 FPS 감지 및 설정
   */
  async detectFPS(): Promise<number> {
    const fps = await DeviceFPSDetector.detectFPSAsync();
    this.deviceFPS = fps;
    this.frameInterval = 1000 / this.deviceFPS;
    return fps;
  }

  /**
   * 정밀 주파수 보정: Refresh Rate의 약수/정수 배수로 Snap
   * f_sync = Refresh Rate / (2 × N)
   * 60Hz 환경에서 지터(Jitter) 방지를 위한 정밀 보정
   */
  static snapToRefreshRate(requestedHz: number, refreshRate: number = 60): number {
    // N을 계산: N = Refresh Rate / (2 × requestedHz)
    const idealN = refreshRate / (2 * requestedHz);
    
    // 가장 가까운 정수 N 선택
    const N = Math.round(idealN);
    const clampedN = Math.max(1, Math.min(30, N)); // 1~30 범위 제한
    
    // 보정된 주파수 계산
    const snappedHz = refreshRate / (2 * clampedN);
    
    // 8-15Hz 범위로 클램핑
    return Math.max(8, Math.min(15, snappedHz));
  }

  /**
   * Hz를 FPS의 정수 배수로 보정 (Snap-to-Grid)
   * @deprecated Use snapToRefreshRate instead for more precise correction
   */
  snapToGrid(requestedHz: number): number {
    const divisor = Math.round(this.deviceFPS / requestedHz);
    const snappedHz = this.deviceFPS / divisor;
    return Math.max(8, Math.min(15, snappedHz));
  }

  /**
   * 타이머 콜백 등록 (동기화용)
   */
  setTimerCallback(callback: (remaining: number) => void) {
    this.timerCallback = callback;
  }

  /**
   * Stroboscopic 시작 (RAF 기반)
   */
  start(
    onToggle?: (phase: 'off' | 'on') => void,
    duration?: number
  ) {
    this.onToggleCallback = onToggle;
    this.duration = duration || 0;
    this.startTime = performance.now();
    this.isRunning = true;

    // FPS 감지 (비동기)
    this.detectFPS().then(() => {
      // 정밀 Hz 보정 (새로운 공식 사용)
      this.frequency = StroboscopicEngine.snapToRefreshRate(this.frequency, this.deviceFPS);
      
      const intervalMs = 1000 / this.frequency; // Hz → ms
      let expectedTime = performance.now() + intervalMs;

      const tick = (currentTime: number) => {
        if (!this.isRunning) return;

        // Self-correcting timer (Drift 보정)
        const drift = currentTime - expectedTime;
        
        if (drift >= intervalMs) {
          // Sync Lock: 깜빡임 주기 안에서만 타이머 업데이트
          this.syncLock = true;

          // Phase 전환
          this.phase = this.phase === 'off' ? 'on' : 'off';
          this.lastToggleTime = currentTime;
          this.onToggleCallback?.(this.phase);

          // 타이머 콜백 호출 (동기화된 시점)
          if (this.timerCallback && this.duration > 0) {
            const elapsed = (currentTime - this.startTime) / 1000;
            const remaining = Math.max(0, this.duration - elapsed);
            this.timerCallback(remaining);
          }

          // 다음 예상 시간 계산 (Drift 보정)
          expectedTime = currentTime + intervalMs - (drift % intervalMs);
          
          // Sync Lock 해제
          this.syncLock = false;
        }
        
        this.rafId = requestAnimationFrame(tick);
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getPhase(): 'off' | 'on' {
    return this.phase;
  }

  /**
   * 정밀 Hz 제어 (수식 기반)
   * Interval = CurrentFPS / TargetHz
   * N프레임마다 정확히 이미지 교체
   */
  async setPreciseFrequency(targetHz: number) {
    const fps = await this.detectFPS();
    this.deviceFPS = fps;
    
    // 정밀 보정 적용
    const correctedHz = StroboscopicEngine.snapToRefreshRate(targetHz, fps);
    this.frequency = correctedHz;
    
    // N프레임 계산
    const N = Math.round(fps / (2 * correctedHz));
    this.targetFrameInterval = N;
    this.frameCounter = 0;
  }

  /**
   * 주파수 실시간 업데이트 (엔진 재시작 없이)
   * 싱글턴 패턴에서 파라미터 변경 시 사용
   */
  async updateFrequency(newHz: number) {
    const fps = await this.detectFPS();
    this.deviceFPS = fps;
    
    // 정밀 보정 적용
    const correctedHz = StroboscopicEngine.snapToRefreshRate(newHz, fps);
    this.frequency = correctedHz;
    
    // N프레임 계산
    const N = Math.round(fps / (2 * correctedHz));
    this.targetFrameInterval = N;
    this.frameCounter = 0;
    
    // 실행 중인 경우 intervalMs는 다음 tick에서 자동으로 반영됨
    // (start() 메서드의 tick 함수에서 intervalMs = 1000 / this.frequency를 사용)
  }

  /**
   * 동적 주파수 조정 (난이도에 따라)
   * @deprecated Use updateFrequency instead (싱글턴 패턴)
   */
  async adjustFrequency(newFrequency: number) {
    await this.updateFrequency(newFrequency);
  }

  /**
   * 일시정지
   */
  pause() {
    this.isRunning = false;
  }

  /**
   * 재개
   */
  resume() {
    if (!this.isRunning && this.rafId === null) {
      // 재시작
      const onToggle = this.onToggleCallback;
      const duration = this.duration;
      this.start(onToggle, duration);
    }
  }
}
