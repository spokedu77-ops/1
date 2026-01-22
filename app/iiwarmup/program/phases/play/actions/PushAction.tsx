'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ActionProps } from '../types';
import { ParticleEffect, ShockwaveRing } from '../components/ParticleEffect';

/**
 * PUSH - Just Dance 스타일 밀기 동작
 * 
 * 거대한 벽이 카메라로 다가옴 (확대 효과)
 * 밀어내는 타이밍에 벽이 뒤로 밀려남 (축소 + 흔들림)
 * 벽 표면에 그리드 패턴 + 빛 반사
 * 자동 타이밍 진행
 */
export function PushAction({ action, onComplete, onHit }: ActionProps) {
  const [phase, setPhase] = useState<'anticipation' | 'approaching' | 'pushing' | 'pushed' | 'complete'>('anticipation');
  const [pushCount, setPushCount] = useState(0);
  const [shockwaves, setShockwaves] = useState<Array<{ id: string }>>([]);

  const totalPushes = action.intensity === 'HIGH' ? 3 : action.intensity === 'MID' ? 2 : 1;
  const pushInterval = action.duration / totalPushes;

  useEffect(() => {
    // Anticipation: 0.5초
    const anticipationTimer = setTimeout(() => {
      setPhase('approaching');
    }, 500);

    return () => clearTimeout(anticipationTimer);
  }, []);

  useEffect(() => {
    if (phase === 'approaching') {
      // 벽이 다가오는 애니메이션 후 밀기 시작
      const pushTimer = setTimeout(() => {
        setPhase('pushing');
      }, 1000);

      return () => clearTimeout(pushTimer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'pushing') {
      // 밀기 애니메이션 후 밀려남
      const pushedTimer = setTimeout(() => {
        setPhase('pushed');
        setPushCount(prev => prev + 1);
        setShockwaves(prev => [...prev, { id: `shockwave-${Date.now()}` }]);
        onHit(true);

        // 다음 밀기 또는 완료
        if (pushCount + 1 < totalPushes) {
          setTimeout(() => {
            setPhase('approaching');
          }, 500);
        } else {
          setTimeout(() => {
            setPhase('complete');
            setTimeout(() => onComplete(), 500);
          }, 500);
        }
      }, 800);

      return () => clearTimeout(pushedTimer);
    }
  }, [phase, pushCount, totalPushes, onHit, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Anticipation: 중앙에 작은 점 */}
      <AnimatePresence>
        {phase === 'anticipation' && (
          <motion.div
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <div className="w-6 h-6 bg-orange-500 rounded-full blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 벽 */}
      {(phase === 'approaching' || phase === 'pushing' || phase === 'pushed') && (
        <motion.div
          className="absolute inset-0"
          animate={{
            scale: phase === 'approaching' ? [0.5, 1.2] : phase === 'pushing' ? [1.2, 0.8] : [0.8, 0.3],
            x: phase === 'pushed' ? [0, -100] : 0,
            rotateX: phase === 'pushing' ? [0, -5, 0] : 0
          }}
          transition={{
            duration: phase === 'approaching' ? 1 : phase === 'pushing' ? 0.8 : 0.5,
            ease: phase === 'approaching' ? 'easeIn' : 'easeOut'
          }}
        >
          {/* 벽 본체 */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(135deg, #FF8C42 0%, #FF6B35 50%, #F7931E 100%),
                repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(0,0,0,0.1) 50px, rgba(0,0,0,0.1) 52px),
                repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(0,0,0,0.1) 50px, rgba(0,0,0,0.1) 52px)
              `,
              boxShadow: `
                inset 0 0 100px rgba(0,0,0,0.3),
                inset 0 0 200px rgba(255,140,66,0.2),
                0 0 100px rgba(0,0,0,0.5)
              `,
              transform: 'perspective(1000px) rotateX(0deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* 그리드 패턴 */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '100px 100px'
              }}
            />

            {/* 빛 반사 효과 */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
              }}
              animate={{
                x: ['-100%', '100%'],
                y: ['-100%', '100%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear'
              }}
            />

            {/* 중앙 압력 표시 */}
            <motion.div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 300,
                height: 300,
                borderRadius: '50%',
                border: '8px solid rgba(255,255,255,0.3)',
                boxShadow: '0 0 50px rgba(255,255,255,0.5)'
              }}
              animate={{
                scale: phase === 'pushing' ? [1, 1.5, 1] : [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </div>
        </motion.div>
      )}

      {/* 밀기 순간 충격파 */}
      <AnimatePresence>
        {shockwaves.map((shockwave) => (
          <div key={shockwave.id}>
            <ShockwaveRing
              position={{
                x: (typeof window !== 'undefined' ? window.innerWidth : 1920) * 0.5,
                y: (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.5
              }}
              color="#FF8C42"
            />
            <ParticleEffect
              type="shockwave"
              position={{
                x: (typeof window !== 'undefined' ? window.innerWidth : 1920) * 0.5,
                y: (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.5
              }}
              color="#FF8C42"
              intensity="HIGH"
            />
          </div>
        ))}
      </AnimatePresence>

      {/* 밀기 지시 */}
      {phase === 'pushing' && (
        <motion.div
          className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-5xl font-black z-30"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          PUSH!
        </motion.div>
      )}
    </div>
  );
}
