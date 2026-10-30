type PauseListener = (paused: boolean) => void;

const rawNow = () => (typeof performance === 'undefined' ? Date.now() : performance.now());
let paused = false;
let pausedAt = 0;
let pausedDuration = 0;
const listeners = new Set<PauseListener>();

export function spomoveRuntimeNow(): number {
  return (paused ? pausedAt : rawNow()) - pausedDuration;
}

export const spomovePerformance = { now: spomoveRuntimeNow } as Pick<Performance, 'now'>;
export const spomoveDate = {
  now: () => Date.now() - (rawNow() - spomoveRuntimeNow()),
} as Pick<DateConstructor, 'now'>;

export function isSpomoveRuntimePaused(): boolean {
  return paused;
}

export function setSpomoveRuntimePaused(nextPaused: boolean): boolean {
  if (paused === nextPaused) return false;
  if (nextPaused) pausedAt = rawNow();
  else pausedDuration += rawNow() - pausedAt;
  paused = nextPaused;
  timers.forEach(job => { if (job.native != null) globalThis.clearTimeout(job.native); job.native = null; if (!paused) armTimer(job); });
  frames.forEach(job => { if (job.native != null) globalThis.cancelAnimationFrame(job.native); job.native = null; if (!paused) armFrame(job); });
  listeners.forEach((listener) => listener(paused));
  return true;
}

export function resetSpomoveRuntimeClock(): void {
  const previousNow = spomoveRuntimeNow();
  paused = false;
  pausedDuration = 0;
  timers.forEach(job => { if (job.native != null) globalThis.clearTimeout(job.native); job.native = null; job.due = rawNow() + Math.max(0, job.due - previousNow); armTimer(job); });
  frames.forEach(job => { if (job.native != null) globalThis.cancelAnimationFrame(job.native); job.native = null; armFrame(job); });
  listeners.forEach((listener) => listener(false));
}

export function subscribeSpomoveRuntimePause(listener: PauseListener): () => void {
  listeners.add(listener);
  listener(paused);
  return () => listeners.delete(listener);
}

type TimerJob = { id: number; handler: (...args: unknown[]) => void; args: unknown[]; due: number; repeat: number | null; native: ReturnType<typeof globalThis.setTimeout> | null };
type FrameJob = { id: number; callback: FrameRequestCallback; native: number | null };
let sequence = 0;
const timers = new Map<number, TimerJob>();
const frames = new Map<number, FrameJob>();
function armTimer(job: TimerJob) {
  if (paused) return;
  job.native = globalThis.setTimeout(() => {
    job.native = null;
    if (paused || !timers.has(job.id)) return;
    if (job.repeat == null) timers.delete(job.id);
    else job.due = spomoveRuntimeNow() + job.repeat;
    try { job.handler(...job.args); }
    finally { if (job.repeat != null && timers.has(job.id)) armTimer(job); }
  }, Math.max(0, job.due - spomoveRuntimeNow()));
}
function schedule(handler: TimerHandler, delay: number, repeat: boolean, args: unknown[]) {
  if (typeof handler !== 'function') throw new TypeError('SPOMOVE timers require a function');
  const duration = Math.max(repeat ? 1 : 0, Number.isFinite(delay) ? delay : 0);
  const job: TimerJob = { id: ++sequence, handler: handler as (...args: unknown[]) => void, args, due: spomoveRuntimeNow() + duration, repeat: repeat ? duration : null, native: null };
  timers.set(job.id, job); armTimer(job); return job.id;
}
export function spomoveSetTimeout(handler: TimerHandler, delay = 0, ...args: unknown[]): number {
  return schedule(handler, delay, false, args);
}

export function spomoveClearTimeout(id: number | undefined | null): void {
  if (id == null) return;
  const job = timers.get(id); if (!job) return;
  if (job.native != null) globalThis.clearTimeout(job.native);
  timers.delete(id);
}

export function spomoveSetInterval(handler: TimerHandler, delay = 0, ...args: unknown[]): number {
  return schedule(handler, delay, true, args);
}

export function spomoveClearInterval(id: number | undefined | null): void {
  if (id == null) return;
  spomoveClearTimeout(id);
}

export function spomoveRequestAnimationFrame(callback: FrameRequestCallback): number {
  const job: FrameJob = { id: ++sequence, callback, native: null }; frames.set(job.id, job); armFrame(job); return job.id;
}

function armFrame(job: FrameJob) {
  if (paused) return;
  job.native = globalThis.requestAnimationFrame(() => { job.native = null; if (paused || !frames.delete(job.id)) return; job.callback(spomoveRuntimeNow()); });
}

export function spomoveCancelAnimationFrame(id: number | undefined | null): void {
  if (id == null) return;
  const job = frames.get(id); if (!job) return;
  if (job.native != null) globalThis.cancelAnimationFrame(job.native);
  frames.delete(id);
}
