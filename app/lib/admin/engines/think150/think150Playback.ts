/**
 * Think 150s 재생 유틸 — findCurrentEvent O(1) (인덱스 유지)
 */

import type { ThinkTimelineEvent } from './types';

const TOTAL_MS = 150000;

/**
 * 현재 ms에 해당하는 이벤트를 반환. indexRef를 유지해 프레임당 상수 시간.
 * 재생이 항상 진행되는 경우 O(1); 되감기 시 구간만 스캔.
 */
export function findCurrentEventO1(
  events: ThinkTimelineEvent[],
  ms: number,
  indexRef: { current: number }
): ThinkTimelineEvent | null {
  if (events.length === 0) return null;
  if (ms >= TOTAL_MS) {
    indexRef.current = events.length - 1;
    return events[events.length - 1]!;
  }
  while (indexRef.current > 0 && events[indexRef.current]!.t0 > ms) {
    indexRef.current--;
  }
  while (indexRef.current + 1 < events.length && events[indexRef.current + 1]!.t0 <= ms) {
    indexRef.current++;
  }
  const e = events[indexRef.current]!;
  if (ms >= e.t0 && ms < e.t1) return e;
  return null;
}

export const THINK150_TOTAL_MS = TOTAL_MS;
