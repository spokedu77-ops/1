import type { MovementPick } from './movementTypes';
import { MOVEMENT_REGISTRY } from './movementRegistry';

const STORAGE_PREFIX = 'spokedu-master.spomove.movement.family.';

function storageKey(activityFamilyId: string) {
  return `${STORAGE_PREFIX}${activityFamilyId}`;
}

export function readFamilyMovement(
  activityFamilyId: string,
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): MovementPick | null {
  if (!storage || !activityFamilyId) return null;
  try {
    const raw = storage.getItem(storageKey(activityFamilyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MovementPick>;
    if (!parsed.baseMovement || !(parsed.baseMovement in MOVEMENT_REGISTRY)) return null;
    const limbRule = parsed.limbRule ?? 'free';
    if (!MOVEMENT_REGISTRY[parsed.baseMovement].supportedLimbRules.includes(limbRule)) return null;
    return { baseMovement: parsed.baseMovement, limbRule };
  } catch {
    return null;
  }
}

export function writeFamilyMovement(
  activityFamilyId: string,
  pick: MovementPick,
  storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
) {
  if (!storage || !activityFamilyId) return;
  try {
    storage.setItem(storageKey(activityFamilyId), JSON.stringify(pick));
  } catch {
    // ignore quota / private mode
  }
}

const INTRO_PREFIX = 'spokedu-master.spomove.movement.intro.';

export function hasSeenMovementIntro(
  activityFamilyId: string,
  pick: MovementPick,
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
) {
  if (!storage) return false;
  try {
    return storage.getItem(`${INTRO_PREFIX}${activityFamilyId}`) === `${pick.baseMovement}:${pick.limbRule}`;
  } catch {
    return false;
  }
}

export function markMovementIntroSeen(
  activityFamilyId: string,
  pick: MovementPick,
  storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
) {
  if (!storage) return;
  try {
    storage.setItem(`${INTRO_PREFIX}${activityFamilyId}`, `${pick.baseMovement}:${pick.limbRule}`);
  } catch {
    // ignore
  }
}
