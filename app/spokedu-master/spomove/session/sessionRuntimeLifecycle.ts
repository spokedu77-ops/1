export type SpomoveRuntimeState = 'idle' | 'running' | 'paused' | 'done' | 'ended';

export function canPauseSpomoveRuntime(state: SpomoveRuntimeState): boolean {
  return state === 'running';
}

export function canResumeSpomoveRuntime(state: SpomoveRuntimeState): boolean {
  return state === 'paused';
}

export function isTerminalSpomoveRuntime(state: SpomoveRuntimeState): boolean {
  return state === 'done' || state === 'ended';
}
