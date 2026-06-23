/**
 * Flow 2.0 — 스테이지별 장애물 스케줄 생성 (순수 함수)
 *
 * 알고리즘:
 *   1. 필수 이벤트 먼저 (단일 특기 ≥2회, 보너스는 각 타입 1회 이상)
 *   2. reach 벽 세션 제한 (REACH_CAP_SESSION) 적용
 *   3. 필수 이벤트를 셔플해 배치 — 인접 동일 타입 회피
 *   4. 나머지 브릿지를 무작위 채움 (80% 확률)
 *   5. 인접 동일 타입 재발생 방지
 */

import type { FlowModuleKey } from './flowModules';

export type ObstacleSlot =
  | 'box'   // punch 박스
  | 'reach' // 펀치 벽 (reach 모듈)
  | 'ufo'   // UFO 숙이기 (duck 모듈)
  | null;

// ─── 상수 ────────────────────────────────────────────────────────────────────

const BASE_SPEED          = 0.6;
const BRIDGE_TOTAL_UNITS  = 4200 + 200 + 450; // BRIDGE_LENGTH + PAD_DEPTH + BRIDGE_GAP
const FRAMES_PER_SEC      = 60;
const UNITS_PER_FRAME_DIV = 50; // currentSpeed * 50 * dt60

/** 세션 전체 reach 허용 횟수 (보너스 스테이지는 별도 +1 허용) */
const REACH_CAP_SESSION = 2;

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

function estimateBridgeCount(durationSec: number, speedMult: number, hasFaster: boolean): number {
  const fasterMult = hasFaster ? 1.15 : 1.0;
  const unitsPerSec = BASE_SPEED * speedMult * fasterMult * UNITS_PER_FRAME_DIV * FRAMES_PER_SEC;
  const bridgePeriodSec = BRIDGE_TOTAL_UNITS / unitsPerSec;
  return Math.max(4, Math.ceil(durationSec / bridgePeriodSec));
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
 * 실제 브릿지보다 길면 나머지는 무시, 짧으면 마지막 슬롯 이후는 무작위로 처리.
 */
export function generateObstacleSchedule(opts: ObstacleScheduleOptions): ObstacleSlot[] {
  const { activeModules, durationSec, speedMult, sessionReachPlaced, isBonus } = opts;

  const hasPunch = activeModules.has('punch');
  const hasReach = activeModules.has('reach');
  const hasDuck  = activeModules.has('duck');
  const hasFaster = activeModules.has('faster');

  // 장애물 모듈 없음
  if (!hasPunch && !hasReach && !hasDuck) return [];

  // reach 예산: 보너스는 항상 1 허용(세션 한도 초과 시에도), 일반은 한도 내
  const reachBudget = isBonus
    ? 1
    : Math.max(0, REACH_CAP_SESSION - sessionReachPlaced);

  const bridgeCount = estimateBridgeCount(durationSec, speedMult, hasFaster);

  // ── 1. 필수 이벤트 목록 ────────────────────────────────────────────────────
  const required: ObstacleSlot[] = [];

  if (isBonus) {
    if (hasDuck)  required.push('ufo');
    if (hasPunch) required.push('box');
    if (hasReach && reachBudget > 0) required.push('reach');
  } else {
    const activeCount = [hasDuck, hasPunch, hasReach].filter(Boolean).length;
    if (activeCount === 1) {
      // 단일 특기: 반드시 2회 이상 출현
      if (hasDuck)  { required.push('ufo', 'ufo'); }
      if (hasPunch) { required.push('box', 'box'); }
      if (hasReach) {
        const n = Math.min(2, reachBudget);
        for (let i = 0; i < n; i++) required.push('reach');
      }
    } else {
      // 복수 특기: 각 1회 이상
      if (hasDuck)  required.push('ufo');
      if (hasPunch) required.push('box');
      if (hasReach && reachBudget > 0) required.push('reach');
    }
  }

  shuffleInPlace(required);

  // ── 2. 스케줄 조립 ────────────────────────────────────────────────────────
  const schedule: ObstacleSlot[] = [];
  let reqIdx = 0;
  let reachInSchedule = 0;

  for (let i = 0; i < bridgeCount; i++) {
    const prev = i > 0 ? schedule[i - 1] : null;

    // 필수 이벤트 배치
    if (reqIdx < required.length) {
      let req = required[reqIdx]!;

      // 인접 동일 타입 방지: 다음 필수 이벤트와 스왑 시도
      if (req === prev) {
        let swapped = false;
        for (let j = reqIdx + 1; j < required.length; j++) {
          if (required[j] !== prev) {
            const tmp = required[reqIdx]!;
            required[reqIdx] = required[j]!;
            required[j] = tmp;
            req = required[reqIdx]!;
            swapped = true;
            break;
          }
        }
        if (!swapped) {
          // 스왑 불가 → null 갭 삽입
          schedule.push(null);
          continue;
        }
      }

      schedule.push(req);
      if (req === 'reach') reachInSchedule++;
      reqIdx++;
      continue;
    }

    // ── 3. 무작위 채움 (80%) ───────────────────────────────────────────────
    if (Math.random() >= 0.80) {
      schedule.push(null);
      continue;
    }

    const canReach = hasReach && (reachInSchedule + sessionReachPlaced) < REACH_CAP_SESSION;

    let type: ObstacleSlot = null;

    if (isBonus) {
      const r = Math.random();
      if (r < 0.40 && hasDuck) {
        type = 'ufo';
      } else if (r < 0.80) {
        if (canReach && hasPunch) {
          type = Math.random() < 0.35 ? 'reach' : 'box';
        } else if (canReach) {
          type = 'reach';
        } else if (hasPunch) {
          type = 'box';
        } else {
          type = 'ufo';
        }
      } else if (hasDuck) {
        type = 'ufo';
      }
    } else {
      if (hasDuck && hasPunch) {
        type = Math.random() < 0.5 ? 'ufo' : 'box';
      } else if (hasDuck) {
        type = 'ufo';
      } else if (hasPunch) {
        type = 'box';
      } else if (canReach) {
        type = 'reach';
      }
    }

    // 인접 동일 타입 회피
    if (type !== null && type === prev) type = null;

    if (type === 'reach') reachInSchedule++;
    schedule.push(type);
  }

  return schedule;
}

/** 스케줄에서 배치 예정인 reach 수를 반환 (세션 카운터 갱신용) */
export function countReachInSchedule(schedule: ObstacleSlot[]): number {
  return schedule.filter((s) => s === 'reach').length;
}
