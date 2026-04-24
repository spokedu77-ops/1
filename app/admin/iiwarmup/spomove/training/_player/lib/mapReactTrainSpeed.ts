/**
 * SPOMOVE 신호 속도(초, 낮을수록 빠른 자극) → REACT TRAIN 자극 속도 Lv.1~7
 */
export function mapSpomoveSpeedToReactTrainSpd(speedSec: number): number {
  return Math.max(1, Math.min(7, Math.round(8 - speedSec)));
}
