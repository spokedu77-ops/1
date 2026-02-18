/**
 * Flow Phase Engine - Constants (SSOT)
 * Phase B-1: 모든 매직넘버를 단일 소스로 통합
 * v2.1 - 체감 증폭 (bounce/shake)
 */

// ============ Jump ============
export const JUMP_DURATION: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0.72,
  2: 0.7,
  3: 0.64,
  4: 0.62,
  5: 0.62,
};

export const JUMP_HEIGHT: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 98,
  2: 98,
  3: 98,
  4: 98,
  5: 98,
};

// ============ Bridge ============
export const BRIDGE_LENGTH = 3500;
export const BRIDGE_GAP = 450;
export const LANE_WIDTH = 80;
export const PAD_DEPTH = 200;
/** FPS 기반 적응형 품질: 이 값 미만이면 1초 누적 시 tier 다운 */
export const ADAPTIVE_FPS_THRESHOLD = 45;
/** 저 FPS 누적 시간 (초) 후 tier 1단계 다운 */
export const ADAPTIVE_LOW_DURATION_SEC = 1;
/** tier 변경 후 쿨다운 (초) */
export const ADAPTIVE_TIER_COOLDOWN_SEC = 3;

/** 다음 다리 패드 프리 하이라이트 지속 시간 (ms) */
export const PAD_HIGHLIGHT_MS = 300;

/** 브리지 제거(prune) Z 임계치 by 레벨. LV1 낮출수록 동시에 보이는 다리 수 감소 */
export const BRIDGE_PRUNE_Z_BY_LEVEL: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 4000,
  2: 5000,
  3: 6000,
  4: 6000,
  5: 6000,
};

// ============ Player ============
export const PLAYER_Z = 400;
export const GROUND_Y = 30;
export const PAD_TRIGGER_RATIO = 0.65;

// ============ Speed ============
export const BASE_SPEED = 0.6;
export const SPEED_MULTIPLIERS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0.8,
  2: 1.0,
  3: 1.0,
  4: 1.25,
  5: 1.25,
};
/** LV1 달리기 시작 시 가속 곡선 구간 (초). 이 시간 동안 0→1 smoothstep 적용 */
export const LV1_START_ACCEL_DURATION_SEC = 1.0;

// ============ Camera ============
export const CAMERA_BASE_HEIGHT = 130;
export const CAMERA_BASE_Z = 600;
/** Camera far by 레벨. LV1 낮출수록 원거리 오브젝트 컬링 */
export const CAMERA_FAR_BY_LEVEL: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 7500,
  2: 12000,
  3: 20000,
  4: 30000,
  5: 30000,
};
export const CAMERA_LAG_SPEED = 6.32;
export const FOV_MIN = 58;
export const FOV_MAX = 72;
export const FOV_SPEED_MIN = 0.3;
export const FOV_SPEED_MAX = 0.9;
export const HIGH_SPEED_SHAKE_THRESHOLD = 0.7;
export const HIGH_SPEED_SHAKE_X_AMP = 0.65;
export const HIGH_SPEED_SHAKE_Y_AMP = 0.45;
export const HIGH_SPEED_SHAKE_FREQ_X = 4.6;
export const HIGH_SPEED_SHAKE_FREQ_Y = 5.3;
/** LV1 달리기 흔들림 (미끄러짐→달리기 체감) */
export const LV1_RUN_SHAKE_FREQ = 12;
export const LV1_RUN_SHAKE_AMP = 1.2;
/** runBob 마스킹 가중치: 점프/패드 중 (0~1) */
export const RUNBOB_SCALE_JUMP_PAD = 0.4;
/** runBob 마스킹 가중치: duck 중 (0~1) */
export const RUNBOB_SCALE_DUCK = 0.25;
/** runBob channel smoothing: per-60fps-frame alpha (dt60-compensated in engine) */
export const RUNBOB_ALPHA = 0.4;

// ============ Landing Impact ============
export const LANDING_IMPACT_Y = -2.4;
export const LANDING_IMPACT_Z = -7.5;
export const LANDING_STABILITY_DURATION = 0.12;
export const MICROJOLT_AMOUNT = 0.65;
export const JOLT_DECAY = 8.0;
export const DUCK_DIP_TARGET = -80;
export const DUCK_PITCH_TARGET = 0.55;
export const DUCK_RECOVER_RATE_POS = 0.12;
export const DUCK_RECOVER_RATE_ROT = 0.15;
/** UFO 통과 후 튀어오르는 Y 오프셋. 클수록 더 강함 */
export const DUCK_BOUNCE_AFTER_PASS = 50;
/** 튀어오르기 감쇠 (작을수록 오래 유지). 0.02~0.05 권장 */
export const DUCK_BOUNCE_DECAY_RATE = 0.01;

// ============ Background ============
/** Fog far by 레벨. LV1 낮출수록 원거리 다리 숨김 (브리지/트랙만 적용, 파노는 fog=false) */
export const FOG_FAR_BY_LEVEL: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 2500,
  2: 3200,
  3: 3800,
  4: 4200,
  5: 4200,
};
export const FOG_NEAR = 500;
export const STAR_COUNT = 45000;
export const STAR_SIZE = 2.2;
export const STAR_OPACITY = 0.8;

export const SPEEDLINE_COUNT = 250;
export const SPEEDLINE_BASE_SPEED = 260;
export const SPEEDLINE_LEVEL_MULT = 38;

export const PLANET_EARTH_POS = { x: 3500, y: 1500, z: -12000 };
export const PLANET_EARTH_RADIUS = 1200;
export const PLANET_BLACKHOLE_POS = { x: 1500, y: 3000, z: -25000 };

// ============ Pano (배경) ============
/** 배경 파노라마 360도 회전: 한 바퀴당 초. 작을수록 빠름. 90초 = 이전(45초) 대비 절반 속도 */
export const PANO_ROTATION_SEC_PER_TURN = 90;
/** dt60 기준 회전 계수 (시계 방향). (2*PI) / (SEC_PER_TURN * 60) */
export const PANO_ROTATION_DT60_CW = (2 * Math.PI) / (PANO_ROTATION_SEC_PER_TURN * 60);

// ============ UFO ============
export const UFO_SPAWN_RATE = 0.55;
/** DUCK 직전 경고 UI/사운드 표시 시점 (초). 0.8 = 약 0.8초 전 */
export const UFO_WARN_SEC = 0.8;
/** DUCK 트리거: UFO가 이 Z에 도달하면 숙이기 시작 (낮을수록 더 일찍). 반드시 UFO_PASS_Z보다 작아야 함. 권장 150~300 */
export const UFO_DUCK_START_Z = 250;
/** UFO 통과 판정: 이 Z를 넘으면 whoosh 재생. DUCK_START_Z보다 커야 함. 권장 450~550 */
export const UFO_PASS_Z = 500;
export const UFO_SPEED_MULT = 1.2;
export const UFO_HEIGHT = 180;

// ============ Box ============
export const LV3_BOX_RATE = 0.6;
export const LV4_BOX_RATE = 0.2;
export const BOX_DESTROY_Z = 380;
export const BOX_CLEANUP_Z = 2000;
/** LV3 박스 파괴 시 시각 정지 프레임 수 (타격감). 적용 레벨 3만 */
export const HIT_STOP_FRAMES = 4;
export const HIT_STOP_LEVEL = 3;

// ============ Beat ============
export const BEAT_BPM = 150;
/** 2 = 8분음표 (60/BPM)/2 초. 결과 0.2초 유지 */
export const BEAT_DIVISION = 2;
export const BEAT_STEP_SEC = (60 / BEAT_BPM) / BEAT_DIVISION;

// ============ Timing ============
export const WELCOME_DURATION = 5000;
export const LV1_GUIDE_DURATION = 10000;

// ============ Level Flow ============
/** LV1(25), LV2(30), REST1(15), LV3(60), REST2(15), LV4(60), LV5(60), END(15) */
export const DURATIONS = [25, 30, 15, 60, 15, 60, 60, 15] as const;
export const DISPLAY_LEVELS = [1, 2, 0, 3, 0, 4, 5, -1] as const;

// ============ 문구 (Intro / Rest / Outro) ============
export const PHRASES = {
  welcome: '우주의 세계에 온 것을 환영해요.<br><span style="font-size:2.2rem;color:#60a5fa;">지금부터 화면을 따라 움직이세요</span>',
  lv1Guide: '<span style="color:#93c5fd;">LEVEL 1</span><br><span style="font-size:2.1rem;">왼쪽/가운데/오른쪽으로 점프하세요.</span>',
  restBreathe:
    '잠시 숨을 고르세요<br><span style="font-size:2.2rem;color:#60a5fa;">들이마시고... 내쉬세요...</span><br><span style="font-size:1.6rem;color:#94a3b8;margin-top:0.5rem;display:block;">잠깐 쉬면 다음 동작에 더 집중할 수 있어요.</span>',
  lv3Intro: '<span style="color:#ef4444;">LEVEL 3</span><br><span style="font-size:2rem;">다가오는 박스를 부수세요!<br><span style="font-size:4rem;">🥊</span></span>',
  lv4Intro: '<span style="color:#f59e0b;">LEVEL 4</span><br><span style="font-size:2rem;">우주선이 지나오면 머리를 숙이세요!<br><span style="font-size:3.5rem;">DUCK!</span></span>',
  lv5Intro:
    '<span style="color:#a78bfa;">LEVEL 5</span><br><span style="font-size:2rem;">박스 부수기 + 우주선 숙이기!<br><span style="font-size:3rem;">🥊 DUCK!</span></span>',
  ending: '<span style="color:#34d399;">수고했어요!</span><br><span style="font-size:2.2rem;color:#60a5fa;">👏👏👏</span>',
} as const;
/** 전체 플로우 시간 (진행바 100% 기준). gameTime은 play 구간에서만 증가 */
export const TOTAL_PLAY_SEC = DURATIONS.filter((_, i) => DISPLAY_LEVELS[i] >= 1 && DISPLAY_LEVELS[i] <= 5).reduce((a, b) => a + b, 0);

// ============ Level effect profile (SSOT, 기존 수치 그대로) ============
/** LV1 안정 / LV2 속도감 / LV3 타격감 / LV4 위협감 / LV5 합주. 몰입 강화용 프로필 조회만, 수치 변경 없음 */
export interface FlowEffectProfile {
  pulseStrength: number;
  speedLineRate: number;
}
export const FLOW_EFFECT_PROFILES: Record<1 | 2 | 3 | 4 | 5, FlowEffectProfile> = {
  1: { pulseStrength: 0.03, speedLineRate: 0.08 },
  2: { pulseStrength: 0.05, speedLineRate: 0.1 },
  3: { pulseStrength: 0.06, speedLineRate: 0.1 },
  4: { pulseStrength: 0.08, speedLineRate: 0.18 },
  5: { pulseStrength: 0.08, speedLineRate: 0.18 },
};

// ============ Visual ============
export const FLOOR_COLOR = 0x3b82f6;
export const LANE_LINE_COLOR = 0x3b82f6;
