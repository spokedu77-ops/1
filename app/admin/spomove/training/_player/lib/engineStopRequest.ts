'use client';

import { createContext, useContext, useEffect, useRef } from 'react';

/** Scoped to one mounted LAB run; admin players outside the provider are unaffected. */
export const EngineStopRequestContext = createContext(false);

/** Reuse the engine's own STOP snapshot, including while its runtime clock is paused. */
export function useEngineStopRequest(stop: () => void, enabled = true): void {
  const requested = useContext(EngineStopRequestContext);
  const handled = useRef(false);
  const stopRef = useRef(stop);
  useEffect(() => { stopRef.current = stop; }, [stop]);
  useEffect(() => {
    if (!requested || !enabled || handled.current) return;
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted || handled.current) return;
      handled.current = true;
      stopRef.current();
    });
    return () => { mounted = false; };
  }, [requested, enabled]);
}
