'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ActionProps } from '../types';
import { ParticleEffect, ShockwaveRing } from '../components/ParticleEffect';

/**
 * PUNCH - Just Dance 스타일 펀치 동작
 * 
 * 중앙에 큰 샌드백 (3D 느낌의 원기둥)
 * 펀치 타이밍에 샌드백이 뒤로 흔들림 (스윙 애니메이션)
 * 충격 순간 방사형 충격파 효과
 * 파티클: 땀방울 튀김, 번개 효과
 * 자동 타이밍 진행
 */
export function PunchAction({ action, onComplete, onHit }: ActionProps) {
  const [phase, setPhase] = useState<'anticipation' | 'ready' | 'punch' | 'impact' | 'complete'>('anticipation');
  const [punchCount, setPunchCount] = useState(0);
  const [explosions, setExplosions] = useState<Array<{ id: string }>>([]);

  const totalPunches = action.intensity === 'HIGH' ? 3 : action.intensity === 'MID' ? 2 : 1;
  const punchInterval = action.duration / totalPunches;

  useEffect(() => {
    // Anticipation: 0.5초
    const anticipationTimer = setTimeout(() => {
      setPhase('ready');
    }, 500);

    return () => clearTimeout(anticipationTimer);
  }, []);

  useEffect(() => {
    if (phase === 'ready') {
      // 첫 펀치 시작
      const firstPunchTimer = setTimeout(() => {
        setPhase('punch');
      }, 300);

      return () => clearTimeout(firstPunchTimer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'punch') {
      // 펀치 애니메이션 후 충격
      const impactTimer = setTimeout(() => {
        setPhase('impact');
        setPunchCount(prev => prev + 1);
        setExplosions(prev => [...prev, { id: `explosion-${Date.now()}` }]);
        onHit(true);

        // 다음 펀치 또는 완료
        if (punchCount + 1 < totalPunches) {
          setTimeout(() => {
            setPhase('punch');
          }, 400);
        } else {
          setTimeout(() => {
            setPhase('complete');
            setTimeout(() => onComplete(), 500);
          }, 500);
        }
      }, 600);

      return () => clearTimeout(impactTimer);
    }
  }, [phase, punchCount, totalPunches, onHit, onComplete]);

  const centerX = 50;
  const centerY = 50;

  return (
    <div className="absolute inset-0 pointer-events-none">
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
            <div className="w-6 h-6 bg-red-500 rounded-full blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 샌드백 */}
      {(phase === 'ready' || phase === 'punch' || phase === 'impact') && (
        <motion.div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
          animate={{
            x: phase === 'punch' ? [0, -30, 0] : 0,
            rotateZ: phase === 'punch' ? [0, -15, 0] : 0,
            scale: phase === 'impact' ? [1, 0.95, 1] : 1
          }}
          transition={{
            duration: phase === 'punch' ? 0.6 : 0.3,
            ease: phase === 'punch' ? 'easeOut' : 'easeInOut'
          }}
        >
          {/* 샌드백 본체 (3D 원기둥 느낌) */}
          <div className="relative">
            {/* 그림자 */}
            <motion.div
              className="absolute rounded-full bg-black/30 blur-xl"
              style={{
                width: 200,
                height: 40,
                left: '50%',
                top: '100%',
                transform: 'translateX(-50%)',
                marginTop: 20
              }}
              animate={{
                scaleX: phase === 'impact' ? [1, 1.2, 1] : 1,
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />

            {/* 샌드백 원기둥 */}
            <motion.div
              className="relative rounded-full"
              style={{
                width: 180,
                height: 180,
                background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #654321 100%)',
                boxShadow: `
                  inset 0 -20px 40px rgba(0,0,0,0.3),
                  inset 0 20px 40px rgba(255,255,255,0.1),
                  0 10px 40px rgba(0,0,0,0.5)
                `
              }}
              animate={{
                scale: phase === 'impact' ? [1, 0.95, 1] : 1,
                rotateX: phase === 'punch' ? [0, -10, 0] : 0
              }}
              transition={{
                duration: phase === 'punch' ? 0.6 : 0.3
              }}
            >
              {/* 하이라이트 */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 100,
                  height: 100,
                  left: '50%',
                  top: '30%',
                  transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                  borderRadius: '50%'
                }}
              />

              {/* 펀치 타겟 마크 */}
              <motion.div
                className="absolute rounded-full border-4 border-white/50"
                style={{
                  width: 80,
                  height: 80,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                animate={{
                  scale: phase === 'punch' ? [1, 1.2, 1] : [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            </motion.div>

            {/* 충격 순간 번개 효과 */}
            {phase === 'impact' && (
              <motion.div
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 200,
                  height: 200
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                transition={{ duration: 0.3 }}
              >
                <svg className="w-full h-full">
                  <motion.path
                    d="M 100 50 L 80 100 L 100 120 L 120 100 Z"
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </svg>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* 충격파 효과 */}
      <AnimatePresence>
        {explosions.map((explosion) => (
          <div key={explosion.id}>
            <ShockwaveRing
              position={{
                x: (centerX / 100) * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                y: (centerY / 100) * (typeof window !== 'undefined' ? window.innerHeight : 1080)
              }}
              color="#FF6B6B"
            />
            <ParticleEffect
              type="shockwave"
              position={{
                x: (centerX / 100) * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                y: (centerY / 100) * (typeof window !== 'undefined' ? window.innerHeight : 1080)
              }}
              color="#FF6B6B"
              intensity="HIGH"
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
