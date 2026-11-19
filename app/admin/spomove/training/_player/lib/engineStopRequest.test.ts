// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { resetSpomoveRuntimeClock, setSpomoveRuntimePaused } from './runtimeClock';
import { EngineStopRequestContext, useEngineStopRequest } from './engineStopRequest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('delivers a stop once, uses current snapshot and isolates remounted runs', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  const delivered = vi.fn();
  function Engine({ count }: { count: number }) {
    useEngineStopRequest(() => delivered(count));
    return null;
  }
  const render = async (run: string, requested: boolean, count: number) => {
    await act(async () => root.render(React.createElement(EngineStopRequestContext.Provider, {key:run,value:requested}, React.createElement(Engine,{count}))));
  };
  try {
    await render('a', false, 2);
    expect(delivered).not.toHaveBeenCalled();
    setSpomoveRuntimePaused(true);
    await render('a', true, 3);
    await render('a', true, 4);
    expect(delivered.mock.calls).toEqual([[3]]);
    await render('b', false, 0);
    await render('b', true, 1);
    expect(delivered.mock.calls).toEqual([[3], [1]]);
  } finally { resetSpomoveRuntimeClock(); await act(async () => root.unmount()); }
});
it('does not invoke an engine outside the LAB provider', async () => {
  const stop = vi.fn();
  function Engine() { useEngineStopRequest(stop); return null; }
  const root = createRoot(document.createElement('div'));
  try { await act(async () => root.render(React.createElement(Engine))); expect(stop).not.toHaveBeenCalled(); }
  finally { resetSpomoveRuntimeClock(); await act(async () => root.unmount()); }
});
