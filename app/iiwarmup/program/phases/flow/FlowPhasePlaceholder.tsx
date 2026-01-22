'use client';

import { motion } from 'framer-motion';

export function FlowPhasePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 relative overflow-hidden">
      {/* 물결 애니메이션 */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 border-t-4 border-white/20"
            initial={{ y: '100%' }}
            animate={{ y: '-100%' }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.5
            }}
          />
        ))}
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="text-center text-white z-10">
        <motion.div
          className="text-9xl mb-8"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'loop'
          }}
        >
          🌊
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-6xl font-black mb-6">FLOW PHASE</h1>
          <p className="text-2xl opacity-80 mb-8">준비중입니다...</p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">예정된 기능</h2>
            <ul className="text-left space-y-2 text-lg">
              <li>🎵 음악과 함께하는 유산소 운동</li>
              <li>🏃 리듬에 맞춘 전신 운동</li>
              <li>💪 체력 향상 루틴</li>
              <li>🧘 쿨다운 스트레칭</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
