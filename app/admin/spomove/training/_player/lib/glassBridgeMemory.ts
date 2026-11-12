import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';
import { ADMIN_TRAINING_ROUNDS } from './adminTrainingRounds';
import { REACT_TRAIN_START_COUNTDOWN_SEC } from './reactTrainStartCountdown';

export const GLASS_BRIDGE_COLORS = ['red', 'yellow', 'blue', 'green'] as const;
export type GlassBridgeColor = typeof GLASS_BRIDGE_COLORS[number];
export type GlassBridgeDifficulty = 'easy' | 'hard';
export function normalizeGlassBridgeDifficulty(value?: string): GlassBridgeDifficulty { return value === 'hard' ? 'hard' : 'easy'; }
/** Old start lengths remain readable in historical results. New runs always start at 3. */
export type GlassBridgeLength = 3 | 4 | 5 | 6;
export type GlassBridgePhase = 'READY' | 'SHOWING' | 'WAITING' | 'SUCCESS' | 'REVEAL' | 'SHATTER' | 'COMPLETED' | 'STOPPED';
export type GlassBridgeResult = {
  startLength: GlassBridgeLength;
  lastLength: number;
  presentedRounds: number;
  successRounds: number;
  failureRounds: number;
  teacherFailed: boolean;
  /** Absent on historical teacher-judged results. */
  scoringMode?: 'color-choice';
  completedRounds?: number;
  correctSteps?: number;
  incorrectSteps?: number;
  difficulty?: GlassBridgeDifficulty;
};
export type GlassBridgeComplete = GlassBridgeResult & { completionReason: SpomoveCompletionReason };
export type GlassBridgeState = {
  phase: GlassBridgePhase;
  phaseStarted: number;
  round: number;
  length: number;
  pattern: GlassBridgeColor[];
  totalRounds: number;
  cueSeconds: number;
  result: GlassBridgeResult;
  presentationCounted: boolean;
  answerIndex: number;
  answers: GlassBridgeColor[];
  roundHadError: boolean;
  difficulty: GlassBridgeDifficulty;
};

export function normalizeGlassBridgeLength(_value?: number): 3 {
  return 3;
}
export function normalizeGlassBridgeSeconds(value?: number, difficulty: GlassBridgeDifficulty = 'hard') {
  return Number.isFinite(value) ? Math.min(difficulty === 'easy' ? 10 : 6, Math.max(difficulty === 'easy' ? 2 : 1, Math.round(value! * 2) / 2)) : 2;
}
export const GLASS_BRIDGE_ROUNDS = ADMIN_TRAINING_ROUNDS;
export function normalizeGlassBridgeRounds(value?: number) { return (GLASS_BRIDGE_ROUNDS as readonly number[]).includes(value ?? 0) ? value! : 20; }

export function glassBridgeRoundLength(round: number, totalRounds: number) {
  return Math.min(7, 3 + Math.floor((Math.max(1, round) - 1) / (normalizeGlassBridgeRounds(totalRounds) / 5)));
}

export function createGlassBridgePattern(length: number, random = Math.random): GlassBridgeColor[] {
  const pattern: GlassBridgeColor[] = [];
  for (let i = 0; i < Math.min(7, Math.max(3, length)); i++) {
    const pool = GLASS_BRIDGE_COLORS.filter(color => color !== pattern[i - 1]);
    pattern.push(pool[Math.floor(random() * pool.length)]!);
  }
  return pattern;
}

export function createGlassBridgeState(startLength: number, cueSeconds: number, totalRounds: number, now: number, random = Math.random, difficulty: GlassBridgeDifficulty = 'hard'): GlassBridgeState {
  const length = normalizeGlassBridgeLength(startLength);
  return { phase: 'READY', phaseStarted: now, round: 1, length, pattern: createGlassBridgePattern(length, random),
    totalRounds: normalizeGlassBridgeRounds(totalRounds), cueSeconds: normalizeGlassBridgeSeconds(cueSeconds, difficulty),
    presentationCounted: false, answerIndex: 0, answers: [], roundHadError: false, difficulty,
    result: { startLength: length, lastLength: length, presentedRounds: 0, successRounds: 0, failureRounds: 0, teacherFailed: false,
      scoringMode: 'color-choice', completedRounds: 0, correctSteps: 0, incorrectSteps: 0, difficulty } };
}

export function advanceGlassBridge(state: GlassBridgeState, now: number, random = Math.random): GlassBridgeState {
  const elapsed = now - state.phaseStarted;
  if (state.phase === 'READY' && elapsed >= (state.round === 1 ? REACT_TRAIN_START_COUNTDOWN_SEC * 1000 : 2500)) return { ...state, phase: 'SHOWING', phaseStarted: now };
  if (state.phase === 'SHOWING') {
    const duration = state.difficulty === 'easy' ? state.cueSeconds * 1000 : state.pattern.length * state.cueSeconds * 1000;
    let next = state;
    if (elapsed >= duration && !state.presentationCounted) next = { ...state, presentationCounted: true,
      result: { ...state.result, presentedRounds: state.result.presentedRounds + 1 } };
    return elapsed >= duration + 500 ? { ...next, phase: 'WAITING', phaseStarted: now } : next;
  }
  if ((state.phase === 'SUCCESS' && elapsed >= 2000) || (state.phase === 'SHATTER' && elapsed >= 5000)) {
    if (state.answerIndex < state.length - 1) return { ...state, phase: 'WAITING', phaseStarted: now, answerIndex: state.answerIndex + 1 };
    const result = { ...state.result, completedRounds: (state.result.completedRounds ?? 0) + 1,
      successRounds: state.result.successRounds + (state.roundHadError ? 0 : 1),
      failureRounds: state.result.failureRounds + (state.roundHadError ? 1 : 0) };
    if (state.round >= state.totalRounds) return { ...state, phase: 'COMPLETED', phaseStarted: now, result };
    const round = state.round + 1;
    const length = glassBridgeRoundLength(round, state.totalRounds);
    const pattern = createGlassBridgePattern(length, random);
    // Repeated lengths still receive a new pattern.
    if (pattern.every((color, index) => color === state.pattern[index])) {
      const last = pattern.length - 1;
      pattern[last] = GLASS_BRIDGE_COLORS.find(color => color !== pattern[last] && color !== pattern[last - 1])!;
    }
    return { ...state, phase: 'READY', phaseStarted: now, round, length, pattern, presentationCounted: false,
      answerIndex: 0, answers: [], roundHadError: false, result: { ...result, lastLength: length } };
  }
  return state;
}

export function answerGlassBridge(state: GlassBridgeState, color: GlassBridgeColor, now: number): GlassBridgeState {
  if (state.phase !== 'WAITING') return state;
  const correct = color === state.pattern[state.answerIndex];
  return { ...state, phase: correct ? 'SUCCESS' : 'SHATTER', phaseStarted: now,
    answers: [...state.answers, color], roundHadError: state.roundHadError || !correct,
    result: { ...state.result, correctSteps: (state.result.correctSteps ?? 0) + (correct ? 1 : 0),
      incorrectSteps: (state.result.incorrectSteps ?? 0) + (correct ? 0 : 1) } };
}

export function glassBridgeLitIndex(state: GlassBridgeState, now: number) {
  if (state.phase !== 'SHOWING' || state.difficulty === 'easy') return -1;
  const elapsed = Math.max(0, now - state.phaseStarted);
  const cycle = state.cueSeconds * 1000;
  const index = Math.floor(elapsed / cycle);
  return index < state.pattern.length && elapsed % cycle < cycle * 0.75 ? index : -1;
}

export function glassBridgeShowsAll(state: GlassBridgeState, now: number) {
  return state.phase === 'SHOWING' && state.difficulty === 'easy' && now - state.phaseStarted < state.cueSeconds * 1000;
}

/** First panel is the bottom step. Even ten steps stay within the available height. */
export function glassBridgePanels(count: number, width: number, height: number) {
  const gap = Math.min(height * 0.02, 16);
  const panelHeight = Math.min(height * 0.12, (height * 0.8 - gap * (count - 1)) / count);
  const panelWidth = Math.min(width * 0.8, 600);
  const totalHeight = panelHeight * count + gap * (count - 1);
  return Array.from({ length: count }, (_, index) => ({ x: (width - panelWidth) / 2,
    y: (height + totalHeight) / 2 - panelHeight - index * (panelHeight + gap), width: panelWidth, height: panelHeight }));
}
