'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMarketingMotionReady } from '../lib/use-marketing-motion-ready';

type LandingSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function LandingSection({ children, className, delay = 0 }: LandingSectionProps) {
  const { motionEnabled } = useMarketingMotionReady();
  return (
    <motion.section
      initial={motionEnabled ? { opacity: 0, y: 14 } : false}
      whileInView={motionEnabled ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.2 }}
      transition={motionEnabled ? { duration: 0.45, ease: 'easeOut', delay } : undefined}
      className={className}
    >
      {children}
    </motion.section>
  );
}
