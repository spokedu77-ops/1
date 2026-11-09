// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryGame } from '../components/MemoryGame';

const timing = vi.hoisted(() => ({ delays: [] as number[] }));
vi.mock('./runtimeClock', () => ({
  spomoveSetTimeout: (callback: () => void, ms: number) => { timing.delays.push(ms); return globalThis.setTimeout(callback, ms); },
  spomoveClearTimeout: (id: ReturnType<typeof setTimeout>) => globalThis.clearTimeout(id),
}));
vi.mock('./signals', () => {
  const pattern = (length: number) => Array.from({ length }, (_, i) => ({ id: i % 2 ? 'blue' : 'red', name: '색', bg: i % 2 ? '#00f' : '#f00', text: '#fff', symbol: '' }));
  return { generateMemoryPattern: (level: number) => pattern(level === 1 ? 3 : 5), generateMemoryPatternOfLength: pattern };
});
let root: Root; let host: HTMLDivElement;
const slots = Array.from({ length: 10 }, (_, i) => i % 2 ? 'blue' : 'red');
beforeEach(() => {
  vi.useFakeTimers(); timing.delays = [];
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(Math, 'random').mockReturnValue(0.6);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers(); });
function render(level: number, adminUniformTiming?: boolean) {
  act(() => root.render(React.createElement(MemoryGame, { level, adminUniformTiming, startDelayMs: 0, roundCount: 1, audioMode: 'off', speedSec: 4.2, slotColorIds: slots, onExit: vi.fn(), onComplete: vi.fn() })));
  act(() => vi.advanceTimersByTime(0));
}
describe('explicit admin sequence timing', () => {
  it.each([[1, 3], [2, 5], [3, 3], [6, 10]])('randomizes each presented color for admin level %s', (level, count) => {
    render(level!, true);
    for (let i = 0; i < count!; i++) act(() => vi.advanceTimersByTime(1900));
    expect(timing.delays.filter(ms => ms >= 1000)).toEqual(Array(count).fill(1900));
    expect(host.textContent).toContain('정답');
  });
  it('draws a fresh admin duration for each color and respects both endpoints', () => {
    render(1, true);
    vi.mocked(Math.random).mockReturnValueOnce(0).mockReturnValueOnce(1);
    act(() => vi.advanceTimersByTime(1900));
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(2500));
    expect(timing.delays.filter(ms => ms >= 1000)).toEqual([1900, 1000, 2500]);
  });
  it('preserves the existing default/public basic timing and forced cue', () => {
    render(1);
    for (const ms of [2200, 1000, 2200]) act(() => vi.advanceTimersByTime(ms));
    expect(timing.delays.filter(ms => ms >= 1000)).toEqual([2200, 1000, 2200]);
  });
  it('preserves the existing default/public custom-ten speed', () => {
    render(6);
    for (let i = 0; i < 10; i++) act(() => vi.advanceTimersByTime(4200));
    expect(timing.delays.filter(ms => ms >= 1000)).toEqual(Array(10).fill(4200));
  });
});
