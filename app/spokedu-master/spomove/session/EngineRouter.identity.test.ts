// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EngineRouter, preloadSpomoveEngine } from './EngineRouter';
import type { OfficialSpomoveEngineMode } from '../officialSpomovePresets';
import type { TrainingActivityId } from '@/app/admin/spomove/training/_player/lib/trainingActivity';

const players = vi.hoisted(() => ({ memory: vi.fn() }));
vi.mock('@/app/admin/spomove/training/_player/MemoryGameApp', () => ({ default: players.memory }));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  players.memory.mockImplementation(() => React.createElement('div', { 'data-player': 'signals' }));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function mount(mode: OfficialSpomoveEngineMode, level: number, activityId?: TrainingActivityId) {
  const complete = vi.fn();
  await act(async () => {
    root.render(React.createElement(EngineRouter, {
      runtimeState: 'running', mode, level, activityId,
      effectsEnabled: false, bgmEnabled: false, selectedBgmPath: '', onComplete: complete, onExit: vi.fn(),
    }));
  });
  return complete;
}

it('preloads and renders hand-foot 201 as the signal player', async () => {
  const playerModule = await preloadSpomoveEngine('reactTrain', 201) as { default: unknown };
  expect(playerModule.default).toBe(players.memory);
  await mount('reactTrain', 201);
  expect(host.querySelector('[data-player="signals"]')).not.toBeNull();
  expect(players.memory.mock.calls[0][0].autoLaunch.activityId).toBe('hand-foot');
});

it('rejects removed legacy addresses without mounting a replacement player', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  for (const level of [4, 7]) {
    const complete = await mount('reactTrain', level);
    expect(players.memory).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ completionReason: 'failed' }));
  }
});

it('rejects a conflicting ID before mounting a different player', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const complete = await mount('reactTrain', 201, 'direction-cue');
  expect(players.memory).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledWith(expect.objectContaining({ completionReason: 'failed' }));
});
