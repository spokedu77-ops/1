'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  total: number;
  current: number;
}

export function ProgressBar({ total, current }: ProgressBarProps) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="w-full h-2 bg-gray-800 overflow-hidden">
      <motion.div 
        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3, ease: 'linear' }}
      />
    </div>
  );
}
