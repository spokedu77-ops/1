type PauseListener = (paused: boolean) => void;

const rawNow = () => (typeof performance === 'undefined' ? Date.now() : performance.now());
let paused = false;
const listeners = new Set<PauseListener>();

export function spomoveRuntimeNow(): number {
  return rawNow();
}

export const spomovePerformance = { now: spomoveRuntimeNow } as Pick<Performance, 'now'>;
export const spomoveDate = {
  now: () => Date.now(),
} as Pick<DateConstructor, 'now'>;

export function isSpomoveRuntimePaused(): boolean {
  return paused;
}

export function setSpomoveRuntimePaused(nextPaused: boolean): boolean {
  if (paused === nextPaused) return false;
  paused = nextPaused;
  listeners.forEach((listener) => listener(paused));
  return true;
}

export function resetSpomoveRuntimeClock(): void {
  paused = false;
  listeners.forEach((listener) => listener(false));
}

export function subscribeSpomoveRuntimePause(listener: PauseListener): () => void {
  listeners.add(listener);
  listener(paused);
  return () => listeners.delete(listener);
}

export function spomoveSetTimeout(handler: TimerHandler, delay = 0, ...args: unknown[]): number {
  return globalThis.setTimeout(handler, delay, ...args) as unknown as number;
}

export function spomoveClearTimeout(id: number | undefined | null): void {
  if (id == null) return;
  globalThis.clearTimeout(id);
}

export function spomoveSetInterval(handler: TimerHandler, delay = 0, ...args: unknown[]): number {
  return globalThis.setInterval(handler, delay, ...args) as unknown as number;
}

export function spomoveClearInterval(id: number | undefined | null): void {
  if (id == null) return;
  globalThis.clearInterval(id);
}

export function spomoveRequestAnimationFrame(callback: FrameRequestCallback): number {
  return globalThis.requestAnimationFrame(callback);
}

export function spomoveCancelAnimationFrame(id: number | undefined | null): void {
  if (id == null) return;
  globalThis.cancelAnimationFrame(id);
}
