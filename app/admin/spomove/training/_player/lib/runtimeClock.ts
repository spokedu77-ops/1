type PauseListener = (paused: boolean) => void;

const rawNow = () => (typeof performance === 'undefined' ? Date.now() : performance.now());
const nativeSetTimeout = (...args: Parameters<typeof globalThis.setTimeout>) => globalThis.setTimeout(...args);
const nativeClearTimeout = (id: ReturnType<typeof globalThis.setTimeout>) => globalThis.clearTimeout(id);
let paused = false;
let pausedAt = 0;
let totalPausedMs = 0;
let nextTimerId = 1;
const listeners = new Set<PauseListener>();
const timers = new Map<number, ReturnType<typeof globalThis.setTimeout>>();
const frames = new Map<number, number>();

export function spomoveRuntimeNow(): number {
  const now = rawNow();
  return now - totalPausedMs - (paused ? now - pausedAt : 0);
}

export const spomovePerformance = { now: spomoveRuntimeNow } as Pick<Performance, 'now'>;
export const spomoveDate = {
  now: () => Date.now() - totalPausedMs - (paused ? rawNow() - pausedAt : 0),
} as Pick<DateConstructor, 'now'>;

export function isSpomoveRuntimePaused(): boolean {
  return paused;
}

export function setSpomoveRuntimePaused(nextPaused: boolean): boolean {
  if (paused === nextPaused) return false;
  const now = rawNow();
  if (nextPaused) pausedAt = now;
  else totalPausedMs += Math.max(0, now - pausedAt);
  paused = nextPaused;
  listeners.forEach((listener) => listener(paused));
  return true;
}

export function resetSpomoveRuntimeClock(): void {
  timers.forEach((nativeId) => nativeClearTimeout(nativeId));
  timers.clear();
  if (typeof cancelAnimationFrame !== 'undefined') {
    frames.forEach((nativeId) => cancelAnimationFrame(nativeId));
  }
  frames.clear();
  paused = false;
  pausedAt = 0;
  totalPausedMs = 0;
  listeners.forEach((listener) => listener(false));
}

export function subscribeSpomoveRuntimePause(listener: PauseListener): () => void {
  listeners.add(listener);
  listener(paused);
  return () => listeners.delete(listener);
}

export function spomoveSetTimeout(handler: TimerHandler, delay = 0, ...args: unknown[]): number {
  const id = nextTimerId++;
  const deadline = spomoveRuntimeNow() + Math.max(0, delay);
  const tick = () => {
    if (!timers.has(id)) return;
    const remaining = deadline - spomoveRuntimeNow();
    if (paused || remaining > 4) {
      timers.set(id, nativeSetTimeout(tick, paused ? 50 : Math.max(1, remaining)));
      return;
    }
    timers.delete(id);
    if (typeof handler === 'function') handler(...args);
  };
  timers.set(id, nativeSetTimeout(tick, Math.max(0, delay)));
  return id;
}

export function spomoveClearTimeout(id: number | undefined | null): void {
  if (id == null) return;
  const nativeId = timers.get(id);
  if (nativeId !== undefined) nativeClearTimeout(nativeId);
  timers.delete(id);
}

export function spomoveSetInterval(handler: TimerHandler, delay = 0, ...args: unknown[]): number {
  const id = nextTimerId++;
  const step = Math.max(1, delay);
  let deadline = spomoveRuntimeNow() + step;
  const tick = () => {
    if (!timers.has(id)) return;
    const remaining = deadline - spomoveRuntimeNow();
    if (paused || remaining > 4) {
      timers.set(id, nativeSetTimeout(tick, paused ? 50 : Math.max(1, remaining)));
      return;
    }
    if (typeof handler === 'function') handler(...args);
    deadline += step;
    timers.set(id, nativeSetTimeout(tick, Math.max(1, deadline - spomoveRuntimeNow())));
  };
  timers.set(id, nativeSetTimeout(tick, step));
  return id;
}

export function spomoveClearInterval(id: number | undefined | null): void {
  if (id == null) return;
  spomoveClearTimeout(id);
}

export function spomoveRequestAnimationFrame(callback: FrameRequestCallback): number {
  const id = nextTimerId++;
  const schedule = () => {
    if (typeof requestAnimationFrame === 'undefined') return;
    const nativeId = requestAnimationFrame(() => {
      if (!frames.has(id)) return;
      if (paused) {
        schedule();
        return;
      }
      frames.delete(id);
      callback(spomoveRuntimeNow());
    });
    frames.set(id, nativeId);
  };
  schedule();
  return id;
}

export function spomoveCancelAnimationFrame(id: number | undefined | null): void {
  if (id == null) return;
  const nativeId = frames.get(id);
  if (nativeId !== undefined && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(nativeId);
  frames.delete(id);
}
