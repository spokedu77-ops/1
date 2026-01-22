'use client';

import { motion } from 'framer-motion';
import { ActionPoint } from '../types';

interface HUDProps {
  timeLeft: number;
  currentAction?: string | null;
  nextAction?: ActionPoint | null;
  elapsedTime?: number;
  progress?: number;
}

export function HUD({ timeLeft, currentAction, nextAction, elapsedTime = 0, progress = 0 }: HUDProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getActionLabel = (action: string | null | undefined) => {
    if (!action) return null;
    const labels: Record<string, string> = {
      'POINT': 'POINT',
      'PUNCH': 'PUNCH',
      'DUCK': 'DUCK',
      'PUSH': 'PUSH',
      'PULL': 'PULL'
    };
    return labels[action] || null;
  };

  const getTimeUntilNext = () => {
    if (!nextAction) return null;
    const timeUntil = nextAction.startTime - elapsedTime;
    return timeUntil > 0 ? Math.ceil(timeUntil) : null;
  };

  return (
    <div className="fixed top-0 right-0 z-50 pointer-events-none p-6">
      {/* 타이머 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/60 backdrop-blur-md rounded-2xl px-8 py-6 shadow-2xl mb-4"
      >
        <div className="flex items-center gap-4">
          {/* 시간 표시 */}
          <motion.div
            className="text-white text-5xl font-bold font-mono"
            animate={{
              scale: timeLeft <= 10 ? [1, 1.1, 1] : 1
            }}
            transition={{
              duration: 0.5,
              repeat: timeLeft <= 10 ? Infinity : 0
            }}
          >
            {formatTime(timeLeft)}
          </motion.div>
          
          {/* 현재 액션 표시 */}
          {currentAction && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-yellow-400 text-2xl font-black uppercase tracking-wider"
            >
              {getActionLabel(currentAction)}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* 진행 바 */}
      <motion.div
        className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 shadow-2xl mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* 다음 액션 미리보기 */}
      {nextAction && (
        <motion.div
          className="bg-black/60 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">
            다음 액션
          </div>
          <div className="flex items-center gap-3">
            <div className="text-cyan-400 text-xl font-black uppercase">
              {getActionLabel(nextAction.type)}
            </div>
            {getTimeUntilNext() !== null && (
              <div className="text-white/50 text-sm font-mono">
                {getTimeUntilNext()}초 후
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
