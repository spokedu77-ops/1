'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ActionAnnouncerProps {
  actionType: string | null;
}

const actionLabels: Record<string, string> = {
  'POINT': 'POINT!',
  'PUNCH': 'PUNCH!',
  'DUCK': 'DUCK!',
  'PUSH': 'PUSH!',
  'PULL': 'PULL!'
};

export function ActionAnnouncer({ actionType }: ActionAnnouncerProps) {
  if (!actionType) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.5 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <motion.div
          className="text-white text-8xl md:text-9xl font-black uppercase tracking-wider"
          style={{
            textShadow: '0 0 40px rgba(255,255,255,0.8), 0 0 80px rgba(255,255,255,0.5)',
            WebkitTextStroke: '2px rgba(255,255,255,0.3)'
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [1, 0.9, 1]
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          {actionLabels[actionType] || actionType}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
