/**
 * SPOMOVE 신호 속도(초): 값이 작을수록 신호가 빠름 → 시지각 반응 내부 속도 Lv.1(쉬움)~7(어려움)
 *
 * 과거 `8-speed`는 2초(중고등 프리셋)·3초(초등 고학년)까지 거의 최상위 난이도로 올라가
 * FLOW 등에서 블록이 과도하게 쏟아졌다. 초등 중심 SPEED_PRESETS(2~5초대)가 Lv 전역을
 * 완만하게 덮도록 선형 완화한다.
 */
export function mapSpomoveSpeedToReactTrainSpd(speedSec: number): number {
  const s = Number(speedSec);
  if (!Number.isFinite(s)) return 4;
  const clamped = Math.max(2, Math.min(6, s));
  if (clamped >= 5.2) return 1;
  if (clamped >= 4.5) return 2;
  if (clamped >= 3.8) return 3;
  if (clamped >= 3.2) return 4;
  if (clamped >= 2.7) return 5;
  if (clamped >= 2.3) return 6;
  return 7;
}
