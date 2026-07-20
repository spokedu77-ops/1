import type { MovementAlternative, MovementProfile, MovementProfileId } from './movementTypes';

const SIMPLE_ALTERNATIVES: MovementAlternative[] = [
  { baseMovement: 'footTap', allowedLimbRules: ['free', 'sameSide', 'oppositeSide'] },
  { baseMovement: 'handTouch', allowedLimbRules: ['free', 'sameSide', 'oppositeSide'] },
  { baseMovement: 'stepHold', allowedLimbRules: ['free'] },
  { baseMovement: 'squatTouch', allowedLimbRules: ['free'] },
  { baseMovement: 'lungeReach', allowedLimbRules: ['free'] },
];

const VISUAL_ALTERNATIVES: MovementAlternative[] = [
  { baseMovement: 'footTap', allowedLimbRules: ['free', 'sameSide'] },
  { baseMovement: 'handTouch', allowedLimbRules: ['free', 'sameSide'] },
  { baseMovement: 'stepHold', allowedLimbRules: ['free'] },
  { baseMovement: 'squatTouch', allowedLimbRules: ['free'] },
];

const CHOICE_ALTERNATIVES: MovementAlternative[] = [
  { baseMovement: 'footTap', allowedLimbRules: ['free', 'sameSide'] },
  { baseMovement: 'handTouch', allowedLimbRules: ['free', 'sameSide'] },
  { baseMovement: 'stepHold', allowedLimbRules: ['free'] },
];

const COMPLEX_ALTERNATIVES: MovementAlternative[] = [
  { baseMovement: 'footTap', allowedLimbRules: ['free'] },
  { baseMovement: 'handTouch', allowedLimbRules: ['free', 'sameSide'] },
  { baseMovement: 'stepHold', allowedLimbRules: ['free'] },
];

const SEQUENTIAL_ALTERNATIVES: MovementAlternative[] = [
  { baseMovement: 'footTap', allowedLimbRules: ['free', 'sameSide'] },
  { baseMovement: 'handTouch', allowedLimbRules: ['free'] },
  { baseMovement: 'stepHold', allowedLimbRules: ['free'] },
];

export const MOVEMENT_PROFILES: Record<MovementProfileId, MovementProfile> = {
  simpleColorResponse: {
    id: 'simpleColorResponse',
    selectionMode: 'selectable',
    recommended: { baseMovement: 'footTap', limbRule: 'free' },
    alternatives: SIMPLE_ALTERNATIVES,
    minimumMovementCount: 4,
  },
  visualSearch: {
    id: 'visualSearch',
    selectionMode: 'selectable',
    recommended: { baseMovement: 'footTap', limbRule: 'free' },
    alternatives: VISUAL_ALTERNATIVES,
    minimumMovementCount: 3,
  },
  choiceReaction: {
    id: 'choiceReaction',
    selectionMode: 'selectable',
    recommended: { baseMovement: 'footTap', limbRule: 'free' },
    alternatives: CHOICE_ALTERNATIVES,
    minimumMovementCount: 3,
  },
  complexReaction: {
    id: 'complexReaction',
    selectionMode: 'selectable',
    recommended: { baseMovement: 'footTap', limbRule: 'free' },
    alternatives: COMPLEX_ALTERNATIVES,
    minimumMovementCount: 2,
  },
  sequentialMemory: {
    id: 'sequentialMemory',
    selectionMode: 'selectable',
    recommended: { baseMovement: 'footTap', limbRule: 'free' },
    alternatives: SEQUENTIAL_ALTERNATIVES,
    minimumMovementCount: 2,
  },
  gameSpecific: {
    id: 'gameSpecific',
    selectionMode: 'fixed',
    recommended: { baseMovement: 'footTap', limbRule: 'free' },
    alternatives: [{ baseMovement: 'footTap', allowedLimbRules: ['free'] }],
    minimumMovementCount: 1,
  },
  diveBuiltIn: {
    id: 'diveBuiltIn',
    selectionMode: 'disabled',
    recommended: { baseMovement: 'footTap', limbRule: 'free' },
    alternatives: [],
    minimumMovementCount: 0,
  },
};

export function getMovementProfile(id: MovementProfileId) {
  return MOVEMENT_PROFILES[id];
}
