/**
 * PLAY v1 엔진 규칙 상수
 * rules/timeline/renderer 분리 원칙: timeline은 이 값만 참조
 */

export const PLAY_RULES = {
  /** BPM (beats per minute) */
  BPM: 120,
  /** tick당 밀리초 (BPM 120 → 2 beat/sec → 0.5s = 500ms per tick) */
  TICK_MS: 500,
  /** 구간별 tick 수 */
  TICKS: {
    EXPLAIN: 5,
    SET: 20,
    TRANSITION: 5,
    BLOCKS: 5,
  },
} as const;

export type PlayRules = typeof PLAY_RULES;
