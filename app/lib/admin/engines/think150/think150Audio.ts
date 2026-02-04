/**
 * Think 150s Audio - WebAudio deadline 기반 스케줄링
 * cue마다 tick, Week4 recall 시작에 recall-start
 */

import type { ThinkTimelineEvent } from './types';

const TICK_PATH = 'audio/think/tick.mp3';
const RECALL_START_PATH = 'audio/think/recall-start.mp3';

let audioCtx: AudioContext | null = null;
let tickBuffer: AudioBuffer | null = null;
let recallBuffer: AudioBuffer | null = null;
let bgmSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

/** Storage base URL (Supabase public or relative) */
function getAudioUrl(path: string): string {
  if (typeof window === 'undefined') return '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const bucket = 'iiwarmup-files';
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }
  return `/${path}`;
}

/** Programmatic tick (fallback when no file) */
function createTickBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.05;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 40) * 0.3;
  }
  return buffer;
}

/** Programmatic recall-start (fallback) */
function createRecallBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.3;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 8) * 0.4;
  }
  return buffer;
}

async function loadBuffer(ctx: AudioContext, path: string): Promise<AudioBuffer> {
  try {
    const url = getAudioUrl(path);
    const res = await fetch(url);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return await ctx.decodeAudioData(arrayBuffer);
    }
  } catch {
    /* fallback */
  }
  return createTickBuffer(ctx);
}

async function loadRecallBuffer(ctx: AudioContext): Promise<AudioBuffer> {
  try {
    const url = getAudioUrl(RECALL_START_PATH);
    const res = await fetch(url);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return await ctx.decodeAudioData(arrayBuffer);
    }
  } catch {
    /* fallback */
  }
  return createRecallBuffer(ctx);
}

export interface Think150AudioOptions {
  /** BGM Storage path (e.g. 'audio/think/bgm/bgm.mp3') */
  bgmPath?: string;
}

export async function initThink150Audio(options?: Think150AudioOptions): Promise<void> {
  const ctx = getAudioContext();
  if (!tickBuffer) tickBuffer = await loadBuffer(ctx, TICK_PATH);
  if (!recallBuffer) recallBuffer = await loadRecallBuffer(ctx);
}

export async function startBGM(
  bgmPath: string,
  startOffsetMs: number,
  durationMs: number
): Promise<void> {
  stopBGM();
  try {
    const ctx = getAudioContext();
    const url = getAudioUrl(bgmPath);
    const res = await fetch(url);
    if (!res.ok) return;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ctx.destination);
    const startOffset = startOffsetMs / 1000;
    source.start(ctx.currentTime, startOffset);
    bgmSource = source;
  } catch {
    /* ignore */
  }
}

export function stopBGM(): void {
  if (bgmSource) {
    try {
      bgmSource.stop();
    } catch {
      /* ignore */
    }
    bgmSource = null;
  }
}

function playBuffer(buffer: AudioBuffer, when: number): void {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(when);
}

export function scheduleThink150Sounds(
  timeline: ThinkTimelineEvent[],
  startMs: number,
  nowMs: number
): void {
  const ctx = getAudioContext();
  const ctxTime = ctx.currentTime;
  const baseWhen = ctxTime + (startMs - nowMs) / 1000;

  if (!tickBuffer) return;

  for (const e of timeline) {
    if (e.t0 < startMs) continue;
    const when = baseWhen + (e.t0 - startMs) / 1000;
    if (when < ctxTime - 0.01) continue;

    if (e.frame === 'cue') {
      playBuffer(tickBuffer, when);
    }
    if (
      e.frame === 'blank' &&
      e.phase === 'stageC' &&
      e.payload?.type === 'stageC' &&
      (e.payload as { week?: number }).week === 4 &&
      recallBuffer
    ) {
      playBuffer(recallBuffer, when);
    }
  }
}

export function resumeAudioContext(): void {
  const ctx = audioCtx;
  if (ctx?.state === 'suspended') {
    ctx.resume();
  }
}

/** pause/reset 시 효과음+ BGM 즉시 중단 */
export function suspendAudioContext(): void {
  stopBGM();
  const ctx = audioCtx;
  if (ctx?.state === 'running') {
    ctx.suspend();
  }
}
