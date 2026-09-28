import type { MovementPick, MovementProfile } from '../movements/movementTypes';
import { movementPicksEqual } from '../movements/movementResolve';

export type MovementRuntimeSupport = 'supported' | 'unsupported' | 'not_applicable';

export type MovementChangeEvent = {
  from: MovementPick;
  to: MovementPick;
  activeElapsedMs: number;
};

export type SessionMovementState = {
  initialMovement: MovementPick | null;
  currentMovement: MovementPick | null;
  movementChanges: MovementChangeEvent[];
};

export function movementRuntimeSupport(profile: MovementProfile | null): MovementRuntimeSupport {
  if (!profile || profile.selectionMode === 'disabled') return 'not_applicable';
  return profile.selectionMode === 'selectable' ? 'supported' : 'unsupported';
}

export function beginMovementRun(state: SessionMovementState): SessionMovementState {
  return {
    initialMovement: state.currentMovement,
    currentMovement: state.currentMovement,
    movementChanges: [],
  };
}

export function changePausedMovement(
  state: SessionMovementState,
  nextMovement: MovementPick,
  activeElapsedMs: number,
): SessionMovementState {
  if (!state.currentMovement || movementPicksEqual(state.currentMovement, nextMovement)) return state;
  return {
    ...state,
    currentMovement: nextMovement,
    movementChanges: [
      ...state.movementChanges,
      {
        from: state.currentMovement,
        to: nextMovement,
        activeElapsedMs: Math.max(0, activeElapsedMs),
      },
    ],
  };
}
