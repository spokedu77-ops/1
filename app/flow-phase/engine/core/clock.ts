/**
 * Flow Phase Engine - Clock System (C2)
 * THREE.Clock getDelta() 도입, dt*60 보정으로 프레임 독립적 환경
 * 
 * - getDelta(): 초 단위 delta (THREE.Clock 또는 performance 기반)
 * - getTotalTime(): 경과 시간
 * - dt60(dt): 레거시 "1프레임=1/60" 가정 보정치 (이동/애니메이션에 곱할 값)
 */

import * as THREE from 'three';

/**
 * 60fps 기준 보정치. 이동/애니메이션에 곱하면 프레임 독립.
 * 예: speedPerFrame * dt60(dt) → 초당 비율로 동일한 결과
 */
export function dt60(dt: number): number {
  return dt * 60;
}

export interface ClockOptions {
  /**
   * Maximum dt cap in seconds (default: 0.1)
   * Prevents huge jumps when tab is inactive
   */
  maxDelta?: number;

  /**
   * Fixed time step for substeps (default: null, disabled)
   * When set (e.g. 1/60), getDelta returns variable dt,
   * but you can use getFixedSteps() for stable physics
   */
  fixedStep?: number;

  /**
   * Maximum substeps per frame (default: 3)
   * Prevents spiral of death when dt is too large
   */
  maxSubsteps?: number;
}

export class Clock {
  private lastTime: number = 0;
  private totalTime: number = 0;
  private running: boolean = false;
  private accumulator: number = 0;

  private maxDelta: number;
  private fixedStep: number | null;
  private maxSubsteps: number;

  constructor(options: ClockOptions = {}) {
    this.maxDelta = options.maxDelta ?? 0.1;
    this.fixedStep = options.fixedStep ?? null;
    this.maxSubsteps = options.maxSubsteps ?? 3;
  }

  start(): void {
    this.lastTime = performance.now();
    this.running = true;
    this.accumulator = 0;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.lastTime = performance.now();
    this.totalTime = 0;
    this.accumulator = 0;
  }

  /**
   * Get delta time in seconds since last call
   */
  getDelta(): number {
    if (!this.running) return 0;

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = now;

    // Safety: cap dt to prevent huge jumps (e.g. tab inactive)
    const cappedDt = Math.min(dt, this.maxDelta);

    this.totalTime += cappedDt;

    // If fixed-step is enabled, accumulate dt
    if (this.fixedStep !== null) {
      this.accumulator += cappedDt;
    }

    return cappedDt;
  }

  /**
   * Get fixed-step substeps for stable physics (optional)
   * Returns number of steps to process and consumes accumulator
   * 
   * Usage:
   *   const steps = clock.getFixedSteps();
   *   for (let i = 0; i < steps; i++) {
   *     updatePhysics(clock.getFixedStepSize());
   *   }
   */
  getFixedSteps(): number {
    if (this.fixedStep === null) return 0;

    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < this.maxSubsteps) {
      this.accumulator -= this.fixedStep;
      steps++;
    }

    // Prevent accumulator overflow (spiral of death)
    if (this.accumulator > this.fixedStep * this.maxSubsteps) {
      this.accumulator = 0;
    }

    return steps;
  }

  /**
   * Get fixed step size in seconds (if enabled)
   */
  getFixedStepSize(): number {
    return this.fixedStep ?? 0;
  }

  /**
   * Get total elapsed time in seconds
   */
  getTotalTime(): number {
    return this.totalTime;
  }

  /**
   * Get whether clock is running
   */
  isRunning(): boolean {
    return this.running;
  }
}

/**
 * C2: THREE.Clock 기반 게임 클록
 * getDelta() / getElapsedTime() 사용, 탭 비활성 시 자동 정지
 */
export class GameClockTHREE {
  private clock: THREE.Clock;
  private running = false;
  private totalTime = 0;
  private maxDelta: number;

  constructor(options: { maxDelta?: number } = {}) {
    this.clock = new THREE.Clock();
    this.maxDelta = options.maxDelta ?? 0.1;
  }

  start(): void {
    this.clock.start();
    this.running = true;
    this.totalTime = 0;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.clock = new THREE.Clock();
    this.totalTime = 0;
  }

  /**
   * Delta time in seconds (capped for tab inactive)
   */
  getDelta(): number {
    if (!this.running) return 0;
    const dt = this.clock.getDelta();
    const capped = Math.min(dt, this.maxDelta);
    this.totalTime += capped;
    return capped;
  }

  getTotalTime(): number {
    return this.totalTime;
  }

  isRunning(): boolean {
    return this.running;
  }
}
