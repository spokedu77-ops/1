/**
 * 마스터 수치 테이블
 * 개발자가 여기서 숫자를 직접 수정하여 전체 시스템에 반영
 */

import { DeviceFPSDetector } from '@/app/lib/cognitive/engines/DeviceFPSDetector';

/**
 * 정밀 주파수 보정 함수
 * f_sync = Refresh Rate / (2 × N)
 * 60Hz 환경에서 지터(Jitter) 방지를 위한 정밀 보정
 */
export async function snapToRefreshRate(requestedHz: number): Promise<number> {
  const refreshRate = await DeviceFPSDetector.detectFPSAsync();
  const idealN = refreshRate / (2 * requestedHz);
  const N = Math.round(idealN);
  const clampedN = Math.max(1, Math.min(30, N)); // 1~30 범위 제한
  const snappedHz = refreshRate / (2 * clampedN);
  return Math.max(8, Math.min(15, snappedHz));
}

// 타겟별 Hz 설정 (보정 전 원본 값)
export const TARGET_FREQUENCIES_RAW = {
  junior: 8,
  senior: 12,
  mixed: 10
} as const;

// 타겟별 Hz 설정 (보정 후 실제 사용 값)
// 실제 값은 snapToRefreshRate()로 계산됨
export const TARGET_FREQUENCIES = {
  junior: 8,    // 보정 후 실제 값
  senior: 12,   // 보정 후 실제 값
  mixed: 10     // 보정 후 실제 값
} as const;

// 정지 상태 비율 (NEW)
// 시니어: 빠른 전환 (30% 정지, 70% 액션)
// 아동: 느린 전환 (70% 정지, 30% 액션)
export const STATIC_DURATION_RATIOS = {
  junior: 0.7,   // 70% 정지, 30% 액션 (느린 전환)
  senior: 0.3,   // 30% 정지, 70% 액션 (빠른 전환)
  mixed: 0.5     // 50% 정지, 50% 액션 (균형)
} as const;

// 난이도별 속도 배율
export const DIFFICULTY_SPEED_MULTIPLIERS = {
  easy: 0.5,
  medium: 1.0,
  hard: 1.5
} as const;

// Flow Phase 공간 왜곡률
export const SPATIAL_DISTORTION_LEVELS = {
  easy: 0.1,    // 10% 왜곡
  medium: 0.3,  // 30% 왜곡
  hard: 0.5     // 50% 왜곡
} as const;

// Flow Phase 박스 등장률
export const BOX_SPAWN_RATES = {
  LV3: 0.40,
  LV4: 0.45
} as const;

// Think Phase 라운드 설정
export const THINK_PHASE_CONFIG = {
  totalRounds: 10,
  objectSpawnInterval: 2000,  // ms
  objectLifetime: 3000         // ms
} as const;

// 동작 간 전이 시간 (초)
export const TRANSITION_INTERVALS = {
  junior: 0.5,
  senior: 1.5,
  mixed: 1.0
} as const;

// 난이도별 매핑 테이블
export const DIFFICULTY_MAPPING = {
  1: { 
    hz: 8, 
    boxRate: { lv3: 0.30, lv4: 0.35 },
    speed: 0.5,
    distortion: 0.1,
    stroopCongruentRatio: 0.8
  },
  2: { 
    hz: 12, 
    boxRate: { lv3: 0.40, lv4: 0.40 },
    speed: 1.0,
    distortion: 0.3,
    stroopCongruentRatio: 0.5
  },
  3: { 
    hz: 15, 
    boxRate: { lv3: 0.45, lv4: 0.45 },
    speed: 1.5,
    distortion: 0.5,
    stroopCongruentRatio: 0.3
  }
} as const;

// ================================================================
// I.I.Warm-up 동작 타입 및 이름 정의
// ================================================================

// ✅ ActionKey는 "절대 바뀌면 안 되는 고정 식별자"
// Source of Truth: 이 파일이 진짜, DB는 라벨만 관리
export const ACTION_KEYS = [
  'POINT',   // 콕 찌르기
  'TURN',    // 몸 돌리기
  'THROW',   // 던지기
  'PUNCH',   // 펀치 펑!
  'WALK',    // 제자리 걷기
  'JUMP',    // 점프
  'PULL',    // 줄 당기기
  'KNOCK',   // 노크
  'CLAP',    // 박수
  'CHOP',    // 장작 패기
  'RIDE',    // 타기
  'SAY_HI',  // 안녕 흔들기
  'WIPE',    // 닦기
  'SPREAD',  // 문 열기
  'CUT',     // 자르기
  'STAMP',   // 쾅 찍기
  'CRUSH',   // 으깨기
  'HAMMER',  // 박기
  'SQUASH',  // 납작하게 누르기
  'SWING',   // 휘두르기
] as const;

export type ActionKey = (typeof ACTION_KEYS)[number];

// 기본 라벨(초기값) — 실제 운영은 DB action_catalog에서 변경 권장
export const DEFAULT_ACTION_LABELS: Record<ActionKey, string> = {
  POINT: '콕 찌르기',
  TURN: '몸 돌리기',
  THROW: '던지기',
  PUNCH: '펀치 펑!',
  WALK: '제자리 걷기',
  JUMP: '점프',
  PULL: '줄 당기기',
  KNOCK: '노크',
  CLAP: '박수',
  CHOP: '장작 패기',
  RIDE: '타기',
  SAY_HI: '안녕 흔들기',
  WIPE: '닦기',
  SPREAD: '문 열기',
  CUT: '자르기',
  STAMP: '쾅 찍기',
  CRUSH: '으깨기',
  HAMMER: '박기',
  SQUASH: '납작하게 누르기',
  SWING: '휘두르기',
};

// 하위 호환성을 위한 별칭 (deprecated, 점진적 마이그레이션용)
/** @deprecated Use ACTION_KEYS instead */
export const ACTION_TYPES = ACTION_KEYS;
/** @deprecated Use DEFAULT_ACTION_LABELS instead */
export const ACTION_NAMES: Record<string, string> = DEFAULT_ACTION_LABELS;

// Asset 변형 타입 (확장 가능)
export const ASSET_VARIANTS = ['off', 'on'] as const;
export type AssetVariant = (typeof ASSET_VARIANTS)[number];
// 향후 확장 예: ['off', 'on', 'hit'] 등

// 총 프로그램 시간
export const TOTAL_DURATION_SECONDS = 600; // 10분
