'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/** SSR·hydration과 useReducedMotion(null) 불일치 방지 — 마운트 후에만 enter motion */
export function useMarketingMotionReady() {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const motionEnabled = mounted && reducedMotion === false;

  return { mounted, motionEnabled };
}
