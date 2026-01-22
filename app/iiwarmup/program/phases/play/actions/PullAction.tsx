'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ActionProps } from '../types';
import { ParticleEffect } from '../components/ParticleEffect';

/**
 * PULL - Just Dance 스타일 당기기 동작
 * 
 * 화면 중앙에 두꺼운 로프 2개
 * 로프가 당겨지는 애니메이션 (tension 효과)
 * 당기는 순간 로프에 파동 효과
 * 자동 타이밍 진행
 */
export function PullAction({ action, onComplete, onHit }: ActionProps) {
  const [phase, setPhase] = useState<'anticipation' | 'ready' | 'pulling' | 'tension' | 'complete'>('anticipation');
  const [pullCount, setPullCount] = useState(0);
  const [waves, setWaves] = useState<Array<{ id: string; side: 'left' | 'right' }>>([]);

  const totalPulls = action.intensity === 'HIGH' ? 3 : action.intensity === 'MID' ? 2 : 1;
  const pullInterval = action.duration / totalPulls;

  useEffect(() => {
    // Anticipation: 0.5초
    const anticipationTimer = setTimeout(() => {
      setPhase('ready');
    }, 500);

    return () => clearTimeout(anticipationTimer);
  }, []);

  useEffect(() => {
    if (phase === 'ready') {
      // 첫 당기기 시작
      const firstPullTimer = setTimeout(() => {
        setPhase('pulling');
      }, 300);

      return () => clearTimeout(firstPullTimer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'pulling') {
      // 당기기 애니메이션 후 텐션
      const tensionTimer = setTimeout(() => {
        setPhase('tension');
        setPullCount(prev => prev + 1);
        setWaves(prev => [...prev, { id: `wave-${Date.now()}`, side: pullCount % 2 === 0 ? 'left' : 'right' }]);
        onHit(true);

        // 다음 당기기 또는 완료
        if (pullCount + 1 < totalPulls) {
          setTimeout(() => {
            setPhase('pulling');
          }, 400);
        } else {
          setTimeout(() => {
            setPhase('complete');
            setTimeout(() => onComplete(), 500);
          }, 500);
        }
      }, 800);

      return () => clearTimeout(tensionTimer);
    }
  }, [phase, pullCount, totalPulls, onHit, onComplete]);

  const ropeWidth = 20;
  const ropeLength = 300;
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
            <div className="w-6 h-6 bg-purple-500 rounded-full blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로프들 */}
      {(phase === 'ready' || phase === 'pulling' || phase === 'tension') && (
        <>
          {/* 왼쪽 로프 */}
          <motion.div
            className="absolute"
            style={{
              left: `${centerX - 15}%`,
              top: `${centerY}%`,
              transform: 'translate(-50%, -50%)',
              transformOrigin: 'center'
            }}
            animate={{
              x: phase === 'pulling' ? [0, -30, 0] : phase === 'tension' ? [-30, -25, -30] : 0,
              rotateZ: phase === 'pulling' ? [0, -5, 0] : phase === 'tension' ? [-5, -3, -5] : 0,
              scaleY: phase === 'tension' ? [1, 0.95, 1] : 1
            }}
            transition={{
              duration: phase === 'pulling' ? 0.8 : 0.3,
              ease: phase === 'pulling' ? 'easeOut' : 'easeInOut'
            }}
          >
            <div
              className="relative"
              style={{
                width: ropeWidth,
                height: ropeLength,
                background: 'linear-gradient(180deg, #8B5CF6 0%, #6D28D9 50%, #4C1D95 100%)',
                borderRadius: ropeWidth / 2,
                boxShadow: `
                  inset 0 0 20px rgba(139,92,246,0.5),
                  0 0 20px rgba(139,92,246,0.3)
                `
              }}
            >
              {/* 로프 텍스처 */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 6px)'
                }}
              />
              
              {/* 파동 효과 */}
              {waves.filter(w => w.side === 'left').map((wave) => (
                <motion.div
                  key={wave.id}
                  className="absolute w-full"
                  style={{
                    height: 40,
                    background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    borderRadius: '50%'
                  }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: [0, ropeLength], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5 }}
                />
              ))}
            </div>
          </motion.div>

          {/* 오른쪽 로프 */}
          <motion.div
            className="absolute"
            style={{
              left: `${centerX + 15}%`,
              top: `${centerY}%`,
              transform: 'translate(-50%, -50%)',
              transformOrigin: 'center'
            }}
            animate={{
              x: phase === 'pulling' ? [0, 30, 0] : phase === 'tension' ? [30, 25, 30] : 0,
              rotateZ: phase === 'pulling' ? [0, 5, 0] : phase === 'tension' ? [5, 3, 5] : 0,
              scaleY: phase === 'tension' ? [1, 0.95, 1] : 1
            }}
            transition={{
              duration: phase === 'pulling' ? 0.8 : 0.3,
              ease: phase === 'pulling' ? 'easeOut' : 'easeInOut'
            }}
          >
            <div
              className="relative"
              style={{
                width: ropeWidth,
                height: ropeLength,
                background: 'linear-gradient(180deg, #8B5CF6 0%, #6D28D9 50%, #4C1D95 100%)',
                borderRadius: ropeWidth / 2,
                boxShadow: `
                  inset 0 0 20px rgba(139,92,246,0.5),
                  0 0 20px rgba(139,92,246,0.3)
                `
              }}
            >
              {/* 로프 텍스처 */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 6px)'
                }}
              />
              
              {/* 파동 효과 */}
              {waves.filter(w => w.side === 'right').map((wave) => (
                <motion.div
                  key={wave.id}
                  className="absolute w-full"
                  style={{
                    height: 40,
                    background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    borderRadius: '50%'
                  }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: [0, ropeLength], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5 }}
                />
              ))}
            </div>
          </motion.div>

          {/* 중앙 연결점 */}
          <motion.div
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #A78BFA 0%, #7C3AED 100%)',
              boxShadow: '0 0 30px rgba(167,139,250,0.6)',
              zIndex: 10
            }}
            animate={{
              scale: phase === 'tension' ? [1, 1.2, 1] : [1, 1.1, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            {/* 중심 하이라이트 */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)'
              }}
            />
          </motion.div>
        </>
      )}

      {/* 당기기 순간 파티클 효과 */}
      {phase === 'tension' && (
        <ParticleEffect
          type="sparkle"
          position={{
            x: (typeof window !== 'undefined' ? window.innerWidth : 1920) * 0.5,
            y: (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.5
          }}
          color="#8B5CF6"
          intensity="MID"
        />
      )}

      {/* 당기기 지시 */}
      {phase === 'pulling' && (
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
          PULL!
        </motion.div>
      )}
    </div>
  );
}
