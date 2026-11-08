// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlassBridgeMemoryTraining } from '../components/GlassBridgeMemoryTraining';
import { advanceGlassBridge, createGlassBridgePattern, createGlassBridgeState, glassBridgeLitIndex, glassBridgePanels,
  judgeGlassBridge, normalizeGlassBridgeLength, normalizeGlassBridgeSeconds } from './glassBridgeMemory';
import { catalogTrainingActivity, resolveTrainingSelection } from './trainingActivity';
import { describeSessionVolume, settingsToTrainingResultConfig } from './trainingResultSummary';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';
import { settingsToExitResume } from './trainingLaunchSnapshot';
import { MEMORY_ROUNDS, isColorSequenceLevel } from '../constants';
import { createGlassBridgeAudio } from './glassBridgeAudio';

const clock = vi.hoisted(() => ({ now: 0, next: 0, frames: new Map<number, FrameRequestCallback>() }));
vi.mock('./runtimeClock', () => ({ spomovePerformance: { now: () => clock.now },
  spomoveRequestAnimationFrame: (callback: FrameRequestCallback) => { const id = ++clock.next; clock.frames.set(id, callback); return id; },
  spomoveCancelAnimationFrame: (id: number) => clock.frames.delete(id) }));
let root: Root; let host: HTMLDivElement;
function step(ms: number) { act(() => { clock.now += ms; const callbacks = [...clock.frames.values()]; clock.frames.clear(); callbacks.forEach(callback => callback(clock.now)); }); }
beforeEach(() => {
  clock.now = 0; clock.frames.clear(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (_, name) => name === 'createRadialGradient' ? () => ({ addColorStop: () => {} }) : () => {} }) as never);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('glass bridge memory timing and teacher judgments', () => {
  it.each([4, 5, 6].flatMap(length => [1, 2, 3, 6, 10].flatMap(seconds => [10, 15, 20, 30].map(rounds => [length, seconds, rounds]))))('starts at %s steps, uses %s-second cues and requires %s teacher successes', (length, seconds, rounds) => {
    let now = 0; let state = createGlassBridgeState(length!, seconds!, rounds!, now);
    for (let round = 1; round <= rounds!; round++) {
      expect(state.length).toBe(Math.min(10, length! + round - 1));
      expect(state.pattern.every((color, index) => index === 0 || color !== state.pattern[index - 1])).toBe(true);
      state = advanceGlassBridge(state, now += 2499); expect(state.phase).toBe('READY');
      state = advanceGlassBridge(state, now += 1); expect(state.phase).toBe('SHOWING');
      const showingStart = now;
      for (let index = 0; index < state.length; index++) {
        expect(glassBridgeLitIndex(state, showingStart + index * seconds! * 1000)).toBe(index);
        expect(glassBridgeLitIndex(state, showingStart + (index + 0.75) * seconds! * 1000)).toBe(-1);
      }
      state = advanceGlassBridge(state, now += state.length * seconds! * 1000);
      expect(state.result.presentedRounds).toBe(round); expect(state.result.successRounds).toBe(round - 1);
      state = advanceGlassBridge(state, now += 500); expect(state.phase).toBe('WAITING');
      state = judgeGlassBridge(state, true, now); expect(state.result.successRounds).toBe(round);
      expect(judgeGlassBridge(state, true, now)).toBe(state);
      expect(judgeGlassBridge(state, false, now)).toBe(state);
      expect(advanceGlassBridge(state, now + 500).phase).toBe('SUCCESS');
      state = advanceGlassBridge(state, now += 2000);
    }
    expect(state.phase).toBe('COMPLETED'); expect(state.result.failureRounds).toBe(0);
    expect(state.result.teacherFailed).toBe(false);
  });

  it('generates capped patterns without adjacent repeats even with a constant random source', () => {
    const pattern = createGlassBridgePattern(999, () => 0);
    expect(pattern).toHaveLength(10); expect(new Set(pattern).size).toBe(2);
    expect(pattern.every((color, index) => index === 0 || color !== pattern[index - 1])).toBe(true);
    expect(normalizeGlassBridgeLength()).toBe(5); expect(normalizeGlassBridgeSeconds()).toBe(2);
  });

  it('retains a vertical bottom-to-top bridge within desktop and mobile bounds', () => {
    for (const [width, height] of [[1440, 800], [390, 600], [844, 180]]) for (const count of [4, 5, 6, 10]) {
      const panels = glassBridgePanels(count, width!, height!);
      expect(panels).toHaveLength(count);
      panels.forEach((panel, index) => {
        expect(panel.height).toBeGreaterThan(0); expect(panel.x).toBeGreaterThanOrEqual(0); expect(panel.y).toBeGreaterThanOrEqual(0);
        expect(panel.y + panel.height).toBeLessThanOrEqual(height!);
        expect(panel.x + panel.width).toBeLessThanOrEqual(width!);
        if (index > 0) expect(panel.y).toBeLessThan(panels[index - 1]!.y);
      });
    }
  });

  it('blocks judgments until showing is complete, prevents duplicates and reports teacher failure separately', () => {
    const complete = vi.fn(); const progress = vi.fn();
    act(() => root.render(React.createElement(GlassBridgeMemoryTraining, { startLength: 5, cueSeconds: 2, targetRounds: 10, effectsEnabled: false, onComplete: complete, onProgress: progress })));
    const success = host.querySelectorAll('button')[1]!; const fail = host.querySelectorAll('button')[2]!;
    expect(success.disabled).toBe(true); step(2500); expect(fail.disabled).toBe(true);
    step(10000); expect(success.disabled).toBe(true); expect(progress.mock.lastCall![0].presentedRounds).toBe(1);
    step(500); expect(fail.disabled).toBe(false);
    act(() => { fail.click(); fail.click(); success.click(); });
    expect(progress.mock.lastCall![0]).toMatchObject({ presentedRounds: 1, successRounds: 0, failureRounds: 1, teacherFailed: true });
    expect(success.disabled).toBe(true); expect(host.textContent).toContain('정답은 이것');
    step(2000); expect(host.textContent).toContain('다리 붕괴'); expect(complete).not.toHaveBeenCalled();
    step(5000); expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.lastCall![0]).toMatchObject({ completionReason: 'stopped_early', failureRounds: 1, teacherFailed: true });
    expect(clock.frames.size).toBe(0); step(99999); expect(complete).toHaveBeenCalledOnce();
  });

  it('counts full patterns rather than individual flashes and resets after cancellation or partial stop', () => {
    const complete = vi.fn(); const progress = vi.fn();
    const render = (key: number) => act(() => root.render(React.createElement(GlassBridgeMemoryTraining, { key, startLength: 6, cueSeconds: 1, targetRounds: 10, effectsEnabled: false, onComplete: complete, onProgress: progress })));
    render(1); act(() => host.querySelector('button')!.click());
    expect(complete.mock.lastCall![0]).toMatchObject({ completionReason: 'cancelled', presentedRounds: 0 }); expect(clock.frames.size).toBe(0);
    render(2); step(2500); step(3000); act(() => host.querySelector('button')!.click());
    expect(complete.mock.lastCall![0]).toMatchObject({ completionReason: 'stopped_early', presentedRounds: 0, successRounds: 0 });
    render(3); step(2500); step(6500);
    act(() => { host.querySelectorAll('button')[1]!.click(); host.querySelectorAll('button')[1]!.click(); });
    expect(progress.mock.lastCall![0].successRounds).toBe(1); step(2000);
    expect(host.textContent).toContain('기억할 패턴: 7개');
    act(() => root.unmount()); root = createRoot(host); expect(clock.frames.size).toBe(0);
  });

  it('delivers normal completion only after the last teacher success effect', () => {
    const complete = vi.fn();
    act(() => root.render(React.createElement(GlassBridgeMemoryTraining, { startLength: 4, cueSeconds: 1, targetRounds: 10, effectsEnabled: false, onComplete: complete, onProgress: vi.fn() })));
    for (let round = 1; round <= 10; round++) {
      step(2500); step(Math.min(10, round + 3) * 1000 + 500);
      act(() => host.querySelectorAll('button')[1]!.click());
      step(500); expect(complete).not.toHaveBeenCalled(); step(1500);
    }
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.lastCall![0]).toMatchObject({ completionReason: 'natural_complete', presentedRounds: 10, successRounds: 10, lastLength: 10 });
    expect(clock.frames.size).toBe(0);
  });

  it('does not call teacher failure a system error even on the last configured round', () => {
    let state = createGlassBridgeState(6, 1, 10, 0); let now = 0;
    for (let round = 1; round <= 10; round++) {
      state = advanceGlassBridge(state, now += 2500);
      state = advanceGlassBridge(state, now += state.length * 1000 + 500);
      state = judgeGlassBridge(state, round !== 10, now);
      state = advanceGlassBridge(state, now += 2000);
    }
    expect(state.phase).toBe('SHATTER'); state = advanceGlassBridge(state, now + 5000);
    expect(state.phase).toBe('STOPPED'); expect(state.result).toMatchObject({ presentedRounds: 10, successRounds: 9, failureRounds: 1 });
  });

  it('retains settings through launch snapshots and preserves existing memory volumes', () => {
    expect(catalogTrainingActivity('spatial', 8)).toBe('glass-bridge-memory');
    expect(resolveTrainingSelection('spatial', 8).runtime).toBe('glass-bridge-memory'); expect(isColorSequenceLevel(8)).toBe(false);
    const settings = { mode: 'spatial', level: 8, activityId: 'glass-bridge-memory' as const, speed: 3, glassBridgeStartLength: 6 as const,
      timeMode: 'reps', targetReps: 30, duration: 60, flowFeatures: new Set<string>(), sportsArenaFeatures: new Set<never>() };
    const snapshot = settingsToExitResume(settings); expect(snapshot.launch).toMatchObject({ speed: 3, targetReps: 30, glassBridgeStartLength: 6 });
    const cfg = settingsToTrainingResultConfig(settings); expect(describeSessionVolume(cfg)).toBe('30라운드');
    expect(describeSessionVolume({ ...cfg, activityId: 'sequence-memory', level: 1 })).toBe(`${MEMORY_ROUNDS}라운드`);
    const bridge = { startLength: 6 as const, lastLength: 7, presentedRounds: 2, successRounds: 1, failureRounds: 1, teacherFailed: true };
    const rich = resolveTrainingResultRichContent(cfg, 45000, null, { completionReason: 'stopped_early', glassBridge: bridge });
    expect(rich.activityFeel).toBe('교사 실패 판정으로 종료');
    expect(rich.sessionSnapshot.find(item => item.id === 'presented')?.value).toBe('2라운드');
    expect(rich.selfCheckItems[0]?.label).toContain('교사 입력 기반');
  });

  it('reports technical rendering errors as failed and releases the animation frame', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (_, name) => name === 'createRadialGradient' ? () => { throw new Error('Canvas failure'); } : () => {} }) as never);
    const complete = vi.fn();
    act(() => root.render(React.createElement(GlassBridgeMemoryTraining, { startLength: 5, cueSeconds: 2, targetRounds: 10, effectsEnabled: false, onComplete: complete, onProgress: vi.fn() })));
    step(0); expect(complete.mock.lastCall![0]).toMatchObject({ completionReason: 'failed', teacherFailed: false, failureRounds: 0 });
    expect(clock.frames.size).toBe(0);
  });

  it('stops and disconnects session audio nodes and closes the audio context', () => {
    const voice = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } };
    const close = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('AudioBufferSourceNode', class {});
    vi.stubGlobal('AudioContext', class {
      state = 'running'; currentTime = 0; destination = {};
      createGain() { return { connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }; }
      createOscillator() { return voice; }
      close = close;
    });
    const audio = createGlassBridgeAudio(true); audio.play('flash', 0); audio.close(); audio.close();
    expect(voice.start).toHaveBeenCalledOnce(); expect(voice.stop).toHaveBeenCalledTimes(2);
    expect(voice.disconnect).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
  });
});
