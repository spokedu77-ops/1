import { movementDisplayLabel } from '../movements/movementLabels';
import type { MovementPick, MovementProfile } from '../movements/movementTypes';

/** Start 화면 움직임 요약 — disabled 안전 기본값을 노출하지 않음 */
export function resolveStartMovementSummary(
  profile: MovementProfile | null | undefined,
  pick: MovementPick | null | undefined,
): string | null {
  if (!profile) return pick ? movementDisplayLabel(pick) : null;
  if (profile.id === 'diveBuiltIn') return null;
  if (profile.id === 'bodyCueBuiltIn') return '화면이 사용할 손과 발을 직접 안내';
  if (profile.selectionMode === 'fixed') return '발 터치 · 화면 지정 방식';
  if (profile.selectionMode === 'disabled') return null;
  return pick ? movementDisplayLabel(pick) : null;
}
