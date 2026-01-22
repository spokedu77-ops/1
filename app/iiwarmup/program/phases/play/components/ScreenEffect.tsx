'use client';

import { motion, useAnimation } from 'framer-motion';
import { useEffect, useImperativeHandle, forwardRef } from 'react';

export interface ScreenEffectHandle {
  triggerFlash: () => void;
  triggerShake: () => void;
}

export const ScreenEffect = forwardRef<ScreenEffectHandle>((props, ref) => {
  const flashControls = useAnimation();
  const shakeControls = useAnimation();

  const triggerFlash = async () => {
    await flashControls.start({
      backgroundColor: ['rgba(255,0,0,0)', 'rgba(255,0,0,0.5)', 'rgba(255,0,0,0)'],
      transition: { duration: 0.3, times: [0, 0.5, 1] }
    });
  };

  const triggerShake = async () => {
    await shakeControls.start({
      x: [0, -10, 10, -10, 10, 0],
      y: [0, 5, -5, 5, -5, 0],
      transition: { duration: 0.4 }
    });
  };

  useImperativeHandle(ref, () => ({
    triggerFlash,
    triggerShake
  }));

  return (
    <>
      {/* 빨간 번쩍임 오버레이 */}
      <motion.div
        animate={flashControls}
        className="fixed inset-0 pointer-events-none z-[100]"
      />
      
      {/* 화면 흔들림 컨테이너 */}
      <motion.div
        animate={shakeControls}
        className="fixed inset-0 pointer-events-none z-[99]"
      />
    </>
  );
});

ScreenEffect.displayName = 'ScreenEffect';
