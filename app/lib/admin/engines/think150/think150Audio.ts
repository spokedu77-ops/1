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
/** Play BGM/SFX용. Think150(tick/recall)는 ctx.destination 직결 유지. */
let bgmGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
const BGM_GAIN_NORMAL = 0.54;
const SFX_GAIN_NORMAL = 0.9;
let bgmFadeTimeoutId: ReturnType<typeof setTimeout> | null = null;
let bgmStopTimeoutId: ReturnType<typeof setTimeout> | null = null;
const sfxBufferCache = new Map<string, AudioBuffer>();
const activeSfxSources = new Set<AudioBufferSourceNode>();

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function ensurePlayGainNodes(ctx: AudioContext): void {
  if (!bgmGain) {
    bgmGain = ctx.createGain();
    bgmGain.gain.value = BGM_GAIN_NORMAL;
    bgmGain.connect(ctx.destination);
  }
  if (!sfxGain) {
    sfxGain = ctx.createGain();
    sfxGain.gain.value = SFX_GAIN_NORMAL;
    sfxGain.connect(ctx.destination);
  }
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

function clearBGMTimeouts(): void {
  if (bgmFadeTimeoutId != null) {
    clearTimeout(bgmFadeTimeoutId);
    bgmFadeTimeoutId = null;
  }
  if (bgmStopTimeoutId != null) {
    clearTimeout(bgmStopTimeoutId);
    bgmStopTimeoutId = null;
  }
}

export async function startBGM(
  bgmPath: string,
  startOffsetMs: number,
  durationMs: number
): Promise<void> {
  stopBGM();
  try {
    const ctx = getAudioContext();
    ensurePlayGainNodes(ctx);
    const url = getAudioUrl(bgmPath);
    const res = await fetch(url);
    if (!res.ok) return;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(bgmGain!);
    const now = ctx.currentTime;
    const startOffset = startOffsetMs / 1000;
    stopBGM();
    bgmGain!.gain.setValueAtTime(0, now);
    bgmGain!.gain.linearRampToValueAtTime(BGM_GAIN_NORMAL, now + 0.4);
    source.start(now, startOffset);
    bgmSource = source;

    if (durationMs > 0) {
      clearBGMTimeouts();
      const durationSec = durationMs / 1000;
      bgmFadeTimeoutId = setTimeout(() => {
        const c = getAudioContext();
        if (bgmGain) {
          const t = c.currentTime;
          bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
          bgmGain.gain.linearRampToValueAtTime(0, t + 0.4);
        }
        bgmFadeTimeoutId = null;
      }, (durationSec - 0.4) * 1000);
      bgmStopTimeoutId = setTimeout(() => {
        if (bgmSource) {
          try {
            bgmSource.stop();
          } catch {
            /* ignore */
          }
          bgmSource = null;
        }
        bgmStopTimeoutId = null;
      }, durationSec * 1000);
    }
  } catch {
    /* ignore */
  }
}

export function stopBGM(): void {
  clearBGMTimeouts();
  if (bgmSource) {
    const src = bgmSource;
    bgmSource = null;
    try {
      src.stop();
    } catch {
      /* ignore */
    }
    if (bgmGain) {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      bgmGain.gain.setValueAtTime(0, now);
    }
  }
}

export function duckBGM(amountDb: number, attackMs: number, releaseMs: number): void {
  const ctx = getAudioContext();
  ensurePlayGainNodes(ctx);
  if (!bgmGain) return;
  const now = ctx.currentTime;
  const current = bgmGain.gain.value;
  const targetDuck = BGM_GAIN_NORMAL * Math.pow(10, amountDb / 20);
  const attackSec = attackMs / 1000;
  const releaseSec = releaseMs / 1000;
  bgmGain.gain.setValueAtTime(current, now);
  bgmGain.gain.linearRampToValueAtTime(targetDuck, now + attackSec);
  bgmGain.gain.linearRampToValueAtTime(BGM_GAIN_NORMAL, now + attackSec + releaseSec);
}

export async function playSFX(path: string): Promise<void> {
  try {
    const ctx = getAudioContext();
    ensurePlayGainNodes(ctx);
    const url = getAudioUrl(path);
    let buffer = sfxBufferCache.get(url);
    if (!buffer) {
      const res = await fetch(url);
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();
      buffer = await ctx.decodeAudioData(arrayBuffer);
      sfxBufferCache.set(url, buffer);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(sfxGain!);
    source.start(ctx.currentTime);
    activeSfxSources.add(source);
    source.onended = () => activeSfxSources.delete(source);
    duckBGM(-6, 30, 120);
  } catch {
    /* ignore */
  }
}

export function stopAllSFX(): void {
  for (const source of activeSfxSources) {
    try {
      source.stop();
    } catch {
      /* ignore */
    }
  }
  activeSfxSources.clear();
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

    // Think cue 틱음 제거 (부정확·거슬림 요청 반영)
    // if (e.frame === 'cue') { playBuffer(tickBuffer, when); }
    const week = (e.payload as { week?: number })?.week;
    const isRecallPhase =
      (e.phase === 'stageC' && week === 4) ||
      (e.phase === 'stageD' && (week === 2 || week === 3 || week === 4));
    if (
      e.frame === 'blank' &&
      e.payload?.type === 'stageC' &&
      isRecallPhase &&
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
