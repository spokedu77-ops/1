import type { SpomoveCompletionReason } from '@/app/spokedu-master/spomove/session/sessionResultModel';

export const GLASS_BRIDGE_COLORS = ['red', 'yellow', 'blue', 'green'] as const;
export type GlassBridgeColor = typeof GLASS_BRIDGE_COLORS[number];
export type GlassBridgeLength = 4 | 5 | 6;
export type GlassBridgePhase = 'READY' | 'SHOWING' | 'WAITING' | 'SUCCESS' | 'REVEAL' | 'SHATTER' | 'COMPLETED' | 'STOPPED';
export type GlassBridgeResult = {
  startLength: GlassBridgeLength;
  lastLength: number;
  presentedRounds: number;
  successRounds: number;
  failureRounds: number;
  teacherFailed: boolean;
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
};

export function normalizeGlassBridgeLength(value?: number): GlassBridgeLength {
  return value === 4 || value === 6 ? value : 5;
}
export function normalizeGlassBridgeSeconds(value?: number) {
  return Number.isFinite(value) ? Math.min(10, Math.max(1, Math.round(value! * 2) / 2)) : 2;
}
export function normalizeGlassBridgeRounds(value?: number) { return [10, 15, 20, 30].includes(value ?? 0) ? value! : 20; }

export function createGlassBridgePattern(length: number, random = Math.random): GlassBridgeColor[] {
  const pattern: GlassBridgeColor[] = [];
  for (let i = 0; i < Math.min(10, Math.max(4, length)); i++) {
    const pool = GLASS_BRIDGE_COLORS.filter(color => color !== pattern[i - 1]);
    pattern.push(pool[Math.floor(random() * pool.length)]!);
  }
  return pattern;
}

export function createGlassBridgeState(startLength: number, cueSeconds: number, totalRounds: number, now: number, random = Math.random): GlassBridgeState {
  const length = normalizeGlassBridgeLength(startLength);
  return { phase: 'READY', phaseStarted: now, round: 1, length, pattern: createGlassBridgePattern(length, random),
    totalRounds: normalizeGlassBridgeRounds(totalRounds), cueSeconds: normalizeGlassBridgeSeconds(cueSeconds),
    presentationCounted: false,
    result: { startLength: length, lastLength: length, presentedRounds: 0, successRounds: 0, failureRounds: 0, teacherFailed: false } };
}

export function advanceGlassBridge(state: GlassBridgeState, now: number, random = Math.random): GlassBridgeState {
  const elapsed = now - state.phaseStarted;
  if (state.phase === 'READY' && elapsed >= 2500) return { ...state, phase: 'SHOWING', phaseStarted: now };
  if (state.phase === 'SHOWING') {
    const duration = state.pattern.length * state.cueSeconds * 1000;
    let next = state;
    if (elapsed >= duration && !state.presentationCounted) next = { ...state, presentationCounted: true,
      result: { ...state.result, presentedRounds: state.result.presentedRounds + 1 } };
    return elapsed >= duration + 500 ? { ...next, phase: 'WAITING', phaseStarted: now } : next;
  }
  if (state.phase === 'SUCCESS' && elapsed >= 2000) {
    if (state.result.successRounds >= state.totalRounds) return { ...state, phase: 'COMPLETED', phaseStarted: now };
    const length = Math.min(10, state.length + 1);
    return { ...state, phase: 'READY', phaseStarted: now, round: state.round + 1, length,
      pattern: createGlassBridgePattern(length, random), presentationCounted: false,
      result: { ...state.result, lastLength: length } };
  }
  if (state.phase === 'REVEAL' && elapsed >= 2000) return { ...state, phase: 'SHATTER', phaseStarted: now };
  if (state.phase === 'SHATTER' && elapsed >= 5000) return { ...state, phase: 'STOPPED', phaseStarted: now };
  return state;
}

export function judgeGlassBridge(state: GlassBridgeState, success: boolean, now: number): GlassBridgeState {
  if (state.phase !== 'WAITING') return state;
  return { ...state, phase: success ? 'SUCCESS' : 'REVEAL', phaseStarted: now,
    result: { ...state.result, successRounds: state.result.successRounds + (success ? 1 : 0),
      failureRounds: state.result.failureRounds + (success ? 0 : 1), teacherFailed: !success } };
}

export function glassBridgeLitIndex(state: GlassBridgeState, now: number) {
  if (state.phase !== 'SHOWING') return -1;
  const elapsed = Math.max(0, now - state.phaseStarted);
  const cycle = state.cueSeconds * 1000;
  const index = Math.floor(elapsed / cycle);
  return index < state.pattern.length && elapsed % cycle < cycle * 0.75 ? index : -1;
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
