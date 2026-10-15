let primedContext: AudioContext | null = null;
let activeContext: AudioContext | null = null;

function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    ?? null;
}

/**
 * Call directly from the user's Start gesture. iPad/Safari may refuse a later
 * resume after fullscreen and async engine initialization have completed.
 */
export async function primeFlowAudioContext(): Promise<boolean> {
  const Ctor = audioContextConstructor();
  if (!Ctor) return false;
  try {
    if (!primedContext || primedContext.state === 'closed') primedContext = new Ctor();
    if (primedContext.state !== 'running') await primedContext.resume();
    return primedContext.state === 'running';
  } catch {
    return false;
  }
}

export function takePrimedFlowAudioContext(): AudioContext | null {
  const context = primedContext;
  primedContext = null;
  return context?.state === 'closed' ? null : context;
}

export function registerActiveFlowAudioContext(context: AudioContext): void {
  activeContext = context;
}

export function releaseActiveFlowAudioContext(context: AudioContext): void {
  if (activeContext === context) activeContext = null;
}

export async function resumeFlowAudioContext(): Promise<boolean> {
  const context = activeContext ?? primedContext;
  if (!context || context.state === 'closed') return false;
  try {
    if (context.state !== 'running') await context.resume();
    return context.state === 'running';
  } catch {
    return false;
  }
}
