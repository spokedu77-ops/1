/**
 * FlowCamera — 카메라 서브시스템
 *
 * FlowEngine에서 분리된 카메라 전담 클래스.
 * 모든 수치·수식·연산 순서는 원본 updateCamera() 와 동일.
 */

import * as THREE from 'three';
import type { FlowGamePhase } from './FlowEngine';

// ─── 카메라 전용 상수 (원본 FlowEngine 상수 이전) ─────────────────────────

const CAMERA_BASE_HEIGHT = 130;
const CAMERA_BASE_Z      = 600;
const CAMERA_LAG_SPEED   = 6.32;
const RUNBOB_ALPHA       = 0.4;
const RUN_BOB_FREQ       = 12;
const RUN_BOB_AMP        = 1.2;
const RUNBOB_ALPHA_BASE  = 0.15;
const FOV_MIN            = 54;
const FOV_MAX            = 82;
const FOV_SPEED_MIN      = 0.3;
const FOV_SPEED_MAX      = 0.9;
const HIGH_SPEED_SHAKE_THRESHOLD = 0.7;
const HIGH_SPEED_SHAKE_X_AMP    = 0.65;
const HIGH_SPEED_SHAKE_Y_AMP    = 0.45;
const HIGH_SPEED_SHAKE_FREQ_X   = 4.6;
const HIGH_SPEED_SHAKE_FREQ_Y   = 5.3;
const LANDING_IMPACT_Y  = -2.4;
const LANDING_IMPACT_Z  = -7.5;
const JOLT_DECAY        = 8.0;
const SPRING_K          = 150.0;
const SPRING_DAMPING    = 0.88;

// ─── 입력 타입 ────────────────────────────────────────────────────────────

export interface FlowCameraUpdateInput {
  dtM:            number;
  dt60M:          number;
  dtWall:         number;
  speed:          number;
  phase:          FlowGamePhase;
  gameTime:       number;
  isJumping:      boolean;
  jumpProgress:   number;
  playerJumpY:    number;
  isOnBridge:     boolean;
  isOnPad:        boolean;
  isChangingLane: boolean;
  targetX:        number;
  activeBridgeX:  number | null;
  groundY:        number;
}

// ─── FlowCamera ───────────────────────────────────────────────────────────

export class FlowCamera {
  private cam: THREE.PerspectiveCamera;
  private groundBaseY: number;

  // X 래그
  private visualX    = 0;
  private cameraLagX = 0;

  // Y
  private camYBase = 0;
  private camYBob  = 0;

  // FOV
  private currentFov = 60;
  private targetFov  = 60;

  // 기울기
  private cameraTiltZ = 0;

  // 착지 임팩트 스프링
  private landingImpactY    = 0;
  private landingImpactZ    = 0;
  private landingImpactYVel = 0;
  private landingImpactZVel = 0;
  private impactYTimer      = 0;
  private impactZTimer      = 0;
  private landingStabilityTimer = 0;

  // 마이크로 졸트
  private microJolt    = 0;
  private landingShake = 0;

  // 히트 쉐이크
  private hitShakeRemaining = 0;
  private hitShakeIntensity = 0;
  private hitShakeDuration  = 0;

  // 덕
  private duckDipOffset    = 0;
  private duckBounceOffset = 0;
  private duckPitchX       = 0;
  private duckHold         = false;

  constructor(cam: THREE.PerspectiveCamera, groundBaseY: number) {
    this.cam         = cam;
    this.groundBaseY = groundBaseY;
    this.reset();
  }

  /** 완전 초기화 (init3D 호출 시) */
  reset(): void {
    this.visualX    = 0;
    this.cameraLagX = 0;
    this.camYBase   = CAMERA_BASE_HEIGHT + this.groundBaseY;
    this.camYBob    = 0;
    this.currentFov = 60;
    this.targetFov  = 60;
    this.cameraTiltZ = 0;
    this.landingImpactY    = 0;
    this.landingImpactZ    = 0;
    this.landingImpactYVel = 0;
    this.landingImpactZVel = 0;
    this.impactYTimer      = 0;
    this.impactZTimer      = 0;
    this.landingStabilityTimer = 0;
    this.microJolt    = 0;
    this.landingShake = 0;
    this.hitShakeRemaining = 0;
    this.hitShakeIntensity = 0;
    this.hitShakeDuration  = 0;
    this.duckDipOffset    = 0;
    this.duckBounceOffset = 0;
    this.duckPitchX       = 0;
    this.duckHold         = false;

    this.cam.position.set(0, CAMERA_BASE_HEIGHT + this.groundBaseY, CAMERA_BASE_Z);
    this.cam.lookAt(0, this.groundBaseY + 45, -1500);
  }

  /** 덕 애니메이션 상태만 초기화 (스테이지 전환 시) */
  resetAnimState(): void {
    this.duckHold         = false;
    this.duckDipOffset    = 0;
    this.duckPitchX       = 0;
    this.duckBounceOffset = 0;
  }

  resize(w: number, h: number): void {
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  // ── 이벤트 ────────────────────────────────────────────────────────────────

  onDuckStart(): void {
    this.duckDipOffset = -120;
    this.duckPitchX    = 0.70;
    this.duckHold      = true;
  }

  onDuckEnd(): void {
    this.duckHold         = false;
    this.duckBounceOffset = 90;
    this.duckPitchX       = -0.18;
  }

  addMicroJolt(amount: number): void {
    this.microJolt += amount;
  }

  addHitShake(intensity: number, ms: number): void {
    this.hitShakeRemaining = ms;
    this.hitShakeIntensity = intensity;
    this.hitShakeDuration  = ms;
  }

  onLanding(isMini: boolean): void {
    this.landingStabilityTimer = isMini ? 0.06 : 0.12;
    this.impactYTimer  = isMini ? 0.04 : 0.05;
    this.impactZTimer  = isMini ? 0.03 : 0.04;
    this.landingImpactY = isMini ? LANDING_IMPACT_Y * 1.4 : LANDING_IMPACT_Y;
    this.landingImpactZ = isMini ? LANDING_IMPACT_Z * 1.4 : LANDING_IMPACT_Z;
    if (isMini) {
      this.microJolt        += 1.0;
      this.hitShakeRemaining = 220;
      this.hitShakeIntensity = 1.2;
      this.hitShakeDuration  = 220;
    }
  }

  // ── 메인 업데이트 (원본 updateCamera + 스프링·덕 시뮬레이션) ───────────────

  update(inp: FlowCameraUpdateInput): void {
    const {
      dtM, dt60M, dtWall, speed, phase, gameTime,
      isJumping, jumpProgress, playerJumpY,
      isOnBridge, isOnPad, isChangingLane,
      targetX, activeBridgeX, groundY,
    } = inp;
    const dt60Wall = dtWall * 60;

    // ── playing 중에만 실행되는 물리 시뮬레이션 ───────────────────────────────
    if (phase === 'playing') {
      // duck dip 회복 — UFO 통과 전까지 홀드, 통과 후 천천히 회복
      if (!this.duckHold) {
        this.duckDipOffset += (0 - this.duckDipOffset) * 0.038 * dt60Wall;
        this.duckPitchX    += (0 - this.duckPitchX)    * 0.042 * dt60Wall;
      }
      this.duckBounceOffset *= Math.pow(0.985, dt60Wall);

      // 착지 임팩트 스프링 (Y)
      if (this.landingStabilityTimer > 0) this.landingStabilityTimer -= dtM;
      if (this.impactYTimer > 0) {
        this.impactYTimer = Math.max(0, this.impactYTimer - dtM);
        this.landingImpactYVel += -this.landingImpactY * SPRING_K * dtM;
        this.landingImpactYVel *= Math.pow(SPRING_DAMPING, dt60M);
        this.landingImpactY    += this.landingImpactYVel * dtM;
      } else {
        this.landingImpactY    = 0;
        this.landingImpactYVel = 0;
      }

      // 착지 임팩트 스프링 (Z)
      if (this.impactZTimer > 0) {
        this.impactZTimer = Math.max(0, this.impactZTimer - dtM);
        this.landingImpactZVel += -this.landingImpactZ * SPRING_K * dtM;
        this.landingImpactZVel *= Math.pow(SPRING_DAMPING, dt60M);
        this.landingImpactZ    += this.landingImpactZVel * dtM;
      } else {
        this.landingImpactZ    = 0;
        this.landingImpactZVel = 0;
      }

      this.microJolt *= Math.exp(-JOLT_DECAY * dtM);
    }

    // ── 카메라 위치·방향 업데이트 (모든 phase) ────────────────────────────────

    // X 래그 (원본 CAMERA_LAG_SPEED=6.32)
    if (isJumping) {
      this.visualX += (targetX - this.visualX) * (1 - Math.exp(-CAMERA_LAG_SPEED * dtM));
    } else {
      this.visualX = activeBridgeX !== null ? activeBridgeX : this.visualX;
    }
    this.cameraLagX += (this.visualX - this.cameraLagX) * (1 - Math.exp(-CAMERA_LAG_SPEED * dtM));

    // Run bob (원본 동일 수치: amp=1.2, alpha=0.4)
    let yOffsetRaw = 0;
    const alphaBob = 1 - Math.pow(1 - RUNBOB_ALPHA, dt60M);
    if (isOnBridge && phase === 'playing') {
      const bobScale = (this.landingStabilityTimer > 0) ? 0 :
                       (isJumping || isOnPad) ? 0.4 : 1;
      yOffsetRaw = Math.sin(gameTime * RUN_BOB_FREQ) * RUN_BOB_AMP * bobScale;
    }
    this.camYBob += (yOffsetRaw - this.camYBob) * alphaBob;

    // Z offset: 점프 초반 살짝 당김 (원본 동일)
    let zOffset = 0;
    if (isJumping) {
      if (jumpProgress < 0.1)        zOffset = (jumpProgress / 0.1) * -15;
      else if (jumpProgress < 0.2)   zOffset = (1 - (jumpProgress - 0.1) / 0.1) * -15;
    }

    // camYBase smooth (원본 alpha=0.15)
    const joltY = this.microJolt * 1.8;
    const joltZ = this.microJolt * -4.2;
    const targetCamY =
      CAMERA_BASE_HEIGHT +
      groundY +
      playerJumpY +
      this.landingImpactY +
      joltY +
      this.duckDipOffset +
      this.duckBounceOffset;

    const alphaBase = 1 - Math.pow(1 - RUNBOB_ALPHA_BASE, dt60M);
    this.camYBase += (targetCamY - this.camYBase) * alphaBase;

    this.cam.position.x = this.cameraLagX;
    this.cam.position.y = this.camYBase + this.camYBob;
    this.cam.position.z = CAMERA_BASE_Z + zOffset + this.landingImpactZ + joltZ;

    // 히트 쉐이크
    if (this.hitShakeRemaining > 0) {
      const ratio = this.hitShakeRemaining / Math.max(1, this.hitShakeDuration);
      const amp   = this.hitShakeIntensity * ratio * 18;
      this.cam.position.x += (Math.random() - 0.5) * 2 * amp;
      this.cam.position.y += (Math.random() - 0.5) * 2 * amp;
      this.hitShakeRemaining -= dtWall * 1000;
      if (this.hitShakeRemaining <= 0) this.hitShakeRemaining = 0;
    }

    // 고속 카메라 흔들림 (원본 동일)
    if (speed > HIGH_SPEED_SHAKE_THRESHOLD) {
      const range  = Math.max(0.0001, FOV_SPEED_MAX - HIGH_SPEED_SHAKE_THRESHOLD);
      const ratio  = Math.min(1, (speed - HIGH_SPEED_SHAKE_THRESHOLD) / range);
      const t      = gameTime;
      this.cam.position.x += Math.sin(t * HIGH_SPEED_SHAKE_FREQ_X) * Math.sin(t * HIGH_SPEED_SHAKE_FREQ_X * 0.37) * HIGH_SPEED_SHAKE_X_AMP * ratio;
      this.cam.position.y += Math.sin(t * HIGH_SPEED_SHAKE_FREQ_Y) * Math.sin(t * HIGH_SPEED_SHAKE_FREQ_Y * 0.53) * HIGH_SPEED_SHAKE_Y_AMP * ratio;
    }

    // FOV (원본 동일)
    const speedRange = Math.max(0.0001, FOV_SPEED_MAX - FOV_SPEED_MIN);
    const speedRatio = Math.min(1, Math.max(0, (speed - FOV_SPEED_MIN) / speedRange));
    this.targetFov = FOV_MIN + (FOV_MAX - FOV_MIN) * speedRatio;
    if (Math.abs(this.currentFov - this.targetFov) > 0.02) {
      this.currentFov += (this.targetFov - this.currentFov) * 0.06 * dt60M;
      this.cam.fov = this.currentFov;
      this.cam.updateProjectionMatrix();
    }

    // 레인 전환 기울기
    let targetTilt = 0;
    if (!isOnPad && isChangingLane && isJumping) {
      if (jumpProgress < 0.15) targetTilt = targetX > this.visualX ? -0.05 : 0.05;
    }
    if (this.landingShake !== 0) {
      targetTilt += this.landingShake;
      this.landingShake *= Math.pow(0.85, dt60M);
      if (Math.abs(this.landingShake) < 0.001) this.landingShake = 0;
    }
    this.cameraTiltZ += (targetTilt - this.cameraTiltZ) * (1 - Math.exp(-10 * dtM));
    this.cam.rotation.z = this.cameraTiltZ;
    this.cam.rotation.x = this.duckPitchX;

    this.cam.lookAt(this.cameraLagX, groundY + 45, -1500);
  }

  dispose(): void { /* camera is owned by FlowEngine */ }
}
