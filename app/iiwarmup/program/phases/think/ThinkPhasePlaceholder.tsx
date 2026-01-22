'use client';

import { motion } from 'framer-motion';

export function ThinkPhasePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 via-cyan-900 to-teal-900 relative overflow-hidden">
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 bg-white rounded-full blur-3xl"
            initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }}
            animate={{
              x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
              y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`]
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              repeatType: 'reverse'
            }}
          />
        ))}
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="text-center text-white z-10">
        <motion.div
          className="text-9xl mb-8"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
        >
          🤔
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-6xl font-black mb-6">THINK PHASE</h1>
          <p className="text-2xl opacity-80 mb-8">준비중입니다...</p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">예정된 기능</h2>
            <ul className="text-left space-y-2 text-lg">
              <li>✨ 인지적 퍼즐 챌린지</li>
              <li>✨ 패턴 인식 게임</li>
              <li>✨ 빠른 의사결정 훈련</li>
              <li>✨ 집중력 향상 미니게임</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
