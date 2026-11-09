// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlassBridgeMemoryTraining } from '../components/GlassBridgeMemoryTraining';
import { advanceGlassBridge, createGlassBridgePattern, createGlassBridgeState, glassBridgeLitIndex, glassBridgePanels,
  answerGlassBridge, glassBridgeShowsAll, glassBridgeRoundLength, normalizeGlassBridgeRounds, normalizeGlassBridgeLength, normalizeGlassBridgeSeconds } from './glassBridgeMemory';
import { catalogTrainingActivity, resolveTrainingSelection } from './trainingActivity';
import { describeSessionVolume, settingsToTrainingResultConfig } from './trainingResultSummary';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';
import { settingsToExitResume } from './trainingLaunchSnapshot';
import { MEMORY_ROUNDS, isColorSequenceLevel } from '../constants';
import { createGlassBridgeAudio } from './glassBridgeAudio';

const clock = vi.hoisted(() => ({ now: 0, next: 0, frames: new Map<number, FrameRequestCallback>() }));
vi.mock('./runtimeClock', () => ({ spomoveSetInterval: (fn: () => void, ms: number) => globalThis.setInterval(fn, ms), spomoveClearInterval: (id: number) => globalThis.clearInterval(id), spomovePerformance: { now: () => clock.now },
  spomoveRequestAnimationFrame: (callback: FrameRequestCallback) => { const id = ++clock.next; clock.frames.set(id, callback); return id; },
  spomoveCancelAnimationFrame: (id: number) => clock.frames.delete(id) }));
let root: Root; let host: HTMLDivElement;
function step(ms: number) { act(() => { clock.now += ms; vi.advanceTimersByTime(ms); const callbacks = [...clock.frames.values()]; clock.frames.clear(); callbacks.forEach(callback => callback(clock.now)); }); }
beforeEach(() => {
  vi.useFakeTimers();
  clock.now = 0; clock.frames.clear(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (_, name) => name === 'createRadialGradient' ? () => ({ addColorStop: () => {} }) : () => {} }) as never);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('glass bridge color choices and fixed round schedule', () => {
  it.each([5, 10, 15, 20])('groups lengths from three to seven over %s rounds regardless of answers', total => {
    for (const allCorrect of [false, true]) {
      let now = 0; let state = createGlassBridgeState(6, 1, total, 0, () => 0);
      const lengths: number[] = []; let answered = 0;
      for (let round = 1; round <= total; round++) {
        const length = 3 + Math.floor((round - 1) / (total / 5)); lengths.push(state.length);
        expect(state.length).toBe(length); const pattern = [...state.pattern];
        expect(answerGlassBridge(state, 'red', now)).toBe(state);
        state = advanceGlassBridge(state, now += state.round === 1 ? 3000 : 2500, () => 0);
        for (let index = 0; index < length; index++) {
          expect(glassBridgeLitIndex(state, now + index * 1000)).toBe(index);
          expect(glassBridgeLitIndex(state, now + index * 1000 + 750)).toBe(-1);
        }
        state = advanceGlassBridge(state, now += length * 1000 + 500, () => 0);
        expect(state.phase).toBe('WAITING'); expect(state.result.presentedRounds).toBe(round);
        expect(advanceGlassBridge(state, now + 999999)).toBe(state);
        for (let index = 0; index < length; index++) {
          expect(state.answerIndex).toBe(index); expect(state.answers).toHaveLength(index);
          const answer = allCorrect ? pattern[index]! : pattern[index] === 'red' ? 'blue' : 'red';
          state = answerGlassBridge(state, answer, now); answered++;
          expect(state.answers).toHaveLength(index + 1);
          expect(answerGlassBridge(state, answer, now)).toBe(state);
          expect(state.phase).toBe(allCorrect ? 'SUCCESS' : 'SHATTER');
          state = advanceGlassBridge(state, now += allCorrect ? 2000 : 5000, () => 0);
          if (index < length - 1) expect(state.phase).toBe('WAITING');
        }
        expect(state.result.completedRounds).toBe(round);
        if (round < total) { expect(state.phase).toBe('READY'); expect(state.pattern).not.toEqual(pattern); }
      }
      expect(lengths).toEqual([3, 4, 5, 6, 7].flatMap(length => Array(total / 5).fill(length)));
      expect(state.phase).toBe('COMPLETED');
      expect(state.result).toMatchObject({ scoringMode: 'color-choice', completedRounds: total, presentedRounds: total,
        successRounds: allCorrect ? total : 0, failureRounds: allCorrect ? 0 : total,
        correctSteps: allCorrect ? answered : 0, incorrectSteps: allCorrect ? 0 : answered, teacherFailed: false });
      expect(answered).toBe(total * 5);
    }
  });
  it('uses the full common three-second countdown and shows easy patterns together for exactly twenty seconds', () => {
    let state = createGlassBridgeState(3, 1, 5, 0, () => 0, 'easy');
    expect(advanceGlassBridge(state, 2999).phase).toBe('READY');
    state = advanceGlassBridge(state, 3000); expect(state.phase).toBe('SHOWING');
    expect(glassBridgeShowsAll(state, 3000)).toBe(true);
    expect(glassBridgeShowsAll(state, 22999)).toBe(true);
    expect(glassBridgeLitIndex(state, 4000)).toBe(-1);
    expect(glassBridgeShowsAll(state, 23000)).toBe(false);
    expect(advanceGlassBridge(state, 23499).phase).toBe('SHOWING');
    state = advanceGlassBridge(state, 23500); expect(state.phase).toBe('WAITING');
    expect(state.answers).toHaveLength(0); expect(glassBridgeShowsAll(state, 23500)).toBe(false);
  });
  it('normalizes restored settings and creates nonadjacent patterns within mobile bounds', () => {
    expect(normalizeGlassBridgeRounds(5)).toBe(5); expect(normalizeGlassBridgeRounds(999)).toBe(20);
    expect(normalizeGlassBridgeSeconds(10)).toBe(6); expect(normalizeGlassBridgeLength(6)).toBe(3);
    expect(glassBridgeRoundLength(99, 5)).toBe(7);
    const pattern = createGlassBridgePattern(99, () => 0); expect(pattern).toHaveLength(7);
    expect(pattern.every((color, i) => i === 0 || color !== pattern[i - 1])).toBe(true);
    for (const count of [3, 4, 5, 6, 7]) for (const [width, height] of [[320, 220], [1440, 700]]) {
      const panels = glassBridgePanels(count, width!, height!);
      for (const panel of panels) { expect(panel.y).toBeGreaterThanOrEqual(0); expect(panel.y + panel.height).toBeLessThanOrEqual(height!); }
    }
  });
  it('accepts a color per step, blocks duplicate clicks and continues after a wrong answer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const complete = vi.fn(); const progress = vi.fn();
    act(() => root.render(React.createElement(GlassBridgeMemoryTraining, { startLength: 3, cueSeconds: 1, targetRounds: 5, effectsEnabled: false, onComplete: complete, onProgress: progress })));
    const colors = () => [...host.querySelectorAll<HTMLButtonElement>('aside button')];
    expect(colors()).toHaveLength(4); expect(colors().every(button => button.disabled)).toBe(true);
    step(3000); step(3500); expect(colors()[0]!.disabled).toBe(false);
    // Pattern is red, yellow, red. Blue is incorrect but must still reveal the next step.
    act(() => { colors()[3]!.click(); colors()[3]!.click(); });
    expect(progress.mock.lastCall![0]).toMatchObject({ incorrectSteps: 1, completedRounds: 0, failureRounds: 0 });
    expect(colors().every(button => button.disabled)).toBe(true); step(5000);
    expect(host.textContent).toContain('2번째 발판'); expect(complete).not.toHaveBeenCalled();
    act(() => colors()[1]!.click()); step(2000);
    expect(host.textContent).toContain('3번째 발판');
    act(() => colors()[0]!.click()); step(2000);
    expect(host.textContent).toContain('4칸 기억하기');
    expect(progress.mock.lastCall![0]).toMatchObject({ incorrectSteps: 1, correctSteps: 2, completedRounds: 1, failureRounds: 1, successRounds: 0 });
    act(() => host.querySelector('button')!.click());
    expect(complete.mock.lastCall![0]).toMatchObject({ completionReason: 'stopped_early', completedRounds: 1 });
    step(999999); expect(complete).toHaveBeenCalledOnce();
  });
  it('distinguishes individual answer counts from completed rounds in results', () => {
    const cfg = settingsToTrainingResultConfig({ mode: 'spatial', level: 8, activityId: 'glass-bridge-memory', speed: 1, targetReps: 5, timeMode: 'reps', duration: 60 });
    const bridge = { startLength: 3 as const, lastLength: 7, presentedRounds: 5, successRounds: 0, failureRounds: 5, teacherFailed: false,
      scoringMode: 'color-choice' as const, completedRounds: 5, correctSteps: 10, incorrectSteps: 15 };
    const rich = resolveTrainingResultRichContent(cfg, 45000, null, { completionReason: 'natural_complete', glassBridge: bridge });
    expect(rich.sessionSnapshot.find(item => item.id === 'correct-steps')?.value).toBe('10개');
    expect(rich.sessionSnapshot.find(item => item.id === 'incorrect-steps')?.value).toBe('15개');
    expect(rich.sessionSnapshot.find(item => item.id === 'completed')?.value).toBe('5 / 5라운드');
    expect(rich.volumeLabel).not.toContain('성공 목표'); expect(rich.activityFeel).not.toContain('실패 판정으로 종료');
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
    expect(rich.activityFeel).toBe('중도 종료');
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
