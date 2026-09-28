// @vitest-environment happy-dom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSpomoveWakeLock } from './useSpomoveWakeLock';

type Listener = () => void;

function createSentinel() {
  const listeners = new Set<Listener>();
  return {
    released: false,
    release: vi.fn(async function (this: { released: boolean }) { this.released = true; }),
    addEventListener: vi.fn((_type: 'release', listener: Listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: 'release', listener: Listener) => listeners.delete(listener)),
    emitRelease() {
      this.released = true;
      listeners.forEach((listener) => listener());
    },
  };
}

function Harness({ active }: { active: boolean }) {
  useSpomoveWakeLock(active);
  return null;
}

describe('useSpomoveWakeLock', () => {
  let host: HTMLDivElement;
  let root: Root;
  let visibility: DocumentVisibilityState;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('does nothing when unsupported or inactive', async () => {
    await act(async () => root.render(createElement(Harness, { active: false })));
    await act(async () => root.render(createElement(Harness, { active: true })));
  });

  it('acquires once, holds through active rerenders, and releases on terminal state', async () => {
    const sentinel = createSentinel();
    const request = vi.fn(async () => sentinel);
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    await act(async () => root.render(createElement(Harness, { active: true })));
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => root.render(createElement(Harness, { active: true })));
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => root.render(createElement(Harness, { active: false })));
    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });

  it('reacquires after system release and a visible transition', async () => {
    const first = createSentinel();
    const second = createSentinel();
    const request = vi.fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    await act(async () => root.render(createElement(Harness, { active: true })));
    act(() => first.emitRelease());
    visibility = 'hidden';
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(request).toHaveBeenCalledTimes(1);
    visibility = 'visible';
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('keeps failures non-blocking and releases on unmount', async () => {
    const sentinel = createSentinel();
    const request = vi.fn()
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValueOnce(sentinel);
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    await act(async () => root.render(createElement(Harness, { active: true })));
    visibility = 'hidden';
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    visibility = 'visible';
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => root.unmount());
    expect(sentinel.release).toHaveBeenCalledTimes(1);
    root = createRoot(host);
  });

  it('releases a sentinel that resolves after terminal transition', async () => {
    const sentinel = createSentinel();
    let resolveRequest!: (value: ReturnType<typeof createSentinel>) => void;
    const request = vi.fn(() => new Promise<ReturnType<typeof createSentinel>>((resolve) => {
      resolveRequest = resolve;
    }));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    await act(async () => root.render(createElement(Harness, { active: true })));
    await act(async () => root.render(createElement(Harness, { active: false })));
    await act(async () => resolveRequest(sentinel));
    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });
});