/**
 * Flow 2.0 — 스테이지별 장애물 스케줄 생성 (순수 함수)
 *
 * 알고리즘:
 *   1. 필수 이벤트 먼저 (단일 특기 ≥2회, 보너스는 각 타입 1회 이상)
 *   2. reach 벽 세션 제한 (REACH_CAP_SESSION) 적용 (보너스는 최대 3회 별도 허용)
 *   3. 필수 이벤트를 셔플해 짝수 위치(0,2,4...)에 배치 — 엄격한 교대 패턴
 *   4. 나머지 짝수 위치를 확정 채움 (타입만 랜덤) — 밀도 2브릿지당 1개 보장
 */

import type { FlowModuleKey } from './flowModules';

export type ObstacleSlot =
  | 'box'   // punch 박스
  | 'reach' // 펀치 벽 (reach 모듈)
  | 'ufo'   // UFO 숙이기 (duck 모듈)
  | 'kick'  // 롤링 배럴 (kick 모듈)
  | null;

// ─── 상수 ────────────────────────────────────────────────────────────────────

const BASE_SPEED          = 0.6;
const BRIDGE_TOTAL_UNITS  = 4200 + 200 + 450; // BRIDGE_LENGTH + PAD_DEPTH + BRIDGE_GAP
const FRAMES_PER_SEC      = 60;
const UNITS_PER_FRAME_DIV = 50; // currentSpeed * 50 * dt60

/** 세션 전체 reach 허용 횟수 */
const REACH_CAP_SESSION = 6;
/** 보너스 스테이지 reach 허용 횟수 (세션 한도 무관) */
const REACH_CAP_BONUS = 3;

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function estimateBridgeCount(durationSec: number, speedMult: number): number {
  // faster는 각 스테이지 후반 자동 적용 — 기본 속도(1.0x)로 보수적 계산 (슬롯 여유 확보)
  const unitsPerSec = BASE_SPEED * speedMult * 1.0 * UNITS_PER_FRAME_DIV * FRAMES_PER_SEC;
  const bridgePeriodSec = BRIDGE_TOTAL_UNITS / unitsPerSec;
  return Math.max(4, Math.ceil(durationSec / bridgePeriodSec));
}

function buildObstaclePool(
  hasDuck: boolean,
  hasPunch: boolean,
  hasKick: boolean,
  canReach: boolean,
): NonNullable<ObstacleSlot>[] {
  const pool: NonNullable<ObstacleSlot>[] = [];
  if (hasPunch) pool.push('box');
  if (hasKick) pool.push('kick');
  if (hasDuck) pool.push('ufo');
  if (canReach) pool.push('reach');
  return pool;
}

function pickRandomObstacle(pool: NonNullable<ObstacleSlot>[]): ObstacleSlot {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

export interface ObstacleScheduleOptions {
  activeModules: Set<FlowModuleKey>;
  durationSec: number;
  /** SPEED_MULTS[stageIdx] */
  speedMult: number;
  /** 이번 세션에서 지금까지 배치된 reach 벽 수 */
  sessionReachPlaced: number;
  isBonus: boolean;
}

/**
 * 스테이지 시작 시 호출. 각 브릿지 슬롯에 어떤 장애물을 붙일지 순서대로 반환한다.
 */
export function generateObstacleSchedule(opts: ObstacleScheduleOptions): ObstacleSlot[] {
  const { activeModules, durationSec, speedMult, sessionReachPlaced, isBonus } = opts;

  const hasPunch = activeModules.has('punch');
  const hasReach = activeModules.has('reach');
  const hasDuck  = activeModules.has('duck');
  const hasKick  = activeModules.has('kick');

  // 장애물 모듈 없음
  if (!hasPunch && !hasReach && !hasDuck && !hasKick) return [];

  // reach 예산: 보너스는 세션 한도 무관하게 REACH_CAP_BONUS, 일반은 세션 잔여량
  const reachBudget = isBonus
    ? REACH_CAP_BONUS
    : Math.max(0, REACH_CAP_SESSION - sessionReachPlaced);

  const bridgeCount = estimateBridgeCount(durationSec, speedMult);

  // ── 1. 필수 이벤트 목록 ────────────────────────────────────────────────────
  const required: ObstacleSlot[] = [];

  const activeCount = [hasDuck, hasPunch, hasReach, hasKick].filter(Boolean).length;

  if (isBonus) {
    if (hasPunch) required.push('box');
    if (hasKick)  required.push('kick');
    if (hasDuck)  required.push('ufo');
    if (hasReach && reachBudget > 0) required.push('reach');
  } else {
    if (activeCount === 1) {
      // 단일 특기: 최소 2회 보장
      if (hasPunch) { required.push('box', 'box'); }
      if (hasKick)  { required.push('kick', 'kick'); }
      if (hasDuck)  { required.push('ufo', 'ufo'); }
      if (hasReach) {
        const n = Math.min(2, reachBudget);
        for (let k = 0; k < n; k++) required.push('reach');
      }
    } else {
      // 복수 특기: 각 타입 최소 1회
      if (hasPunch) { required.push('box'); }
      if (hasKick)  { required.push('kick'); }
      if (hasDuck)  { required.push('ufo'); }
      if (hasReach && reachBudget > 0) required.push('reach');
    }
  }

  shuffleInPlace(required);

  // ── 2. 스케줄 조립 (엄격한 교대 패턴: 나오고-안나오고-나오고-안나오고) ───
  const schedule: ObstacleSlot[] = new Array(bridgeCount).fill(null) as ObstacleSlot[];
  let reachInSchedule = 0;

  // required 배치 (짝수 위치)
  for (let k = 0; k < required.length; k++) {
    const pos = k * 2;
    if (pos >= bridgeCount) break;
    const req = required[k]!;
    schedule[pos] = req;
    if (req === 'reach') reachInSchedule++;
  }

  // 빈 슬롯 채움 (연속 방지 + 타입 랜덤, 밀도는 확정적)
  for (let i = 0; i < bridgeCount; i++) {
    if (schedule[i] !== null) continue;
    const prev = i > 0 ? schedule[i - 1] : null;
    if (prev !== null) continue;

    const canReach = hasReach && reachInSchedule < reachBudget;
    const pool = buildObstaclePool(hasDuck, hasPunch, hasKick, canReach);
    const type = pickRandomObstacle(pool);

    if (type === null) continue;
    if (type === 'reach') reachInSchedule++;
    schedule[i] = type;
  }

  return schedule;
}

/** 스케줄에서 배치 예정인 reach 수를 반환 (세션 카운터 갱신용) */
export function countReachInSchedule(schedule: ObstacleSlot[]): number {
  return schedule.filter((s) => s === 'reach').length;
}
