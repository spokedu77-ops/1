// @vitest-environment happy-dom
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { MemoryRoundSeries } from '../components/MemoryRoundSeries';

it('restarts each complete recall round and delivers completion only once at the selected total', () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let mounted = 0; const finished = vi.fn();
  const Recall = ({ onComplete }: { onComplete: () => void }) => {
    const [id] = useState(() => ++mounted);
    return React.createElement('button', { onClick: () => { onComplete(); onComplete(); } }, String(id));
  };
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  try {
    act(() => root.render(React.createElement(MemoryRoundSeries, { rounds: 5, component: Recall, onComplete: finished, onExit: vi.fn(), audioMode: 'off', speedSec: 1, startDelayMs: 0 })));
    for (let round = 1; round <= 5; round++) {
      expect(host.textContent).toContain(`${round} / 5라운드`);
      expect(host.querySelector('button')!.textContent).toBe(String(round));
      expect(finished).not.toHaveBeenCalled();
      act(() => host.querySelector('button')!.click());
    }
    expect(finished).toHaveBeenCalledOnce(); expect(mounted).toBe(5);
  } finally { act(() => root.unmount()); host.remove(); }
});
