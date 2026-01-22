'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ActionProps } from '../types';
import { ParticleEffect } from '../components/ParticleEffect';

/**
 * DUCK - Just Dance 스타일 피하기 동작
 * 
 * 화면 위쪽에서 장애물(바, 볼) 날아옴
 * 장애물이 카메라 시점으로 다가오는 3D 효과 (scale + translateY)
 * 피하는 타이밍에 장애물이 화면 아래로 지나감
 * 자동 타이밍 진행
 */
export function DuckAction({ action, onComplete, onHit }: ActionProps) {
  const [phase, setPhase] = useState<'anticipation' | 'approaching' | 'passing' | 'complete'>('anticipation');
  const [obstacles, setObstacles] = useState<Array<{ id: string; type: 'bar' | 'ball'; x: number }>>([]);
  const [passedObstacles, setPassedObstacles] = useState<string[]>([]);

  const obstacleCount = action.intensity === 'HIGH' ? 3 : action.intensity === 'MID' ? 2 : 1;
  const obstacleInterval = action.duration / obstacleCount;

  useEffect(() => {
    // Anticipation: 0.3초
    const anticipationTimer = setTimeout(() => {
      setPhase('approaching');
      
      // 장애물 생성
      const newObstacles = Array.from({ length: obstacleCount }, (_, i) => ({
        id: `obstacle-${i}`,
        type: i % 2 === 0 ? 'bar' : 'ball' as 'bar' | 'ball',
        x: 30 + Math.random() * 40 // 30-70%
      }));
      setObstacles(newObstacles);
    }, 300);

    return () => clearTimeout(anticipationTimer);
  }, [obstacleCount]);

  useEffect(() => {
    if (phase === 'approaching' && obstacles.length > 0) {
      // 각 장애물이 다가오고 지나가는 타이밍
      obstacles.forEach((obstacle, index) => {
        const approachTimer = setTimeout(() => {
          // 장애물이 지나가는 순간
          setPassedObstacles(prev => [...prev, obstacle.id]);
          onHit(true);

          // 모든 장애물이 지나갔으면 완료
          if (index === obstacles.length - 1) {
            setTimeout(() => {
              setPhase('complete');
              setTimeout(() => onComplete(), 500);
            }, 500);
          }
        }, (index + 1) * obstacleInterval * 1000);

        return () => clearTimeout(approachTimer);
      });
    }
  }, [phase, obstacles, obstacleInterval, onHit, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Anticipation: 위쪽에 작은 점 */}
      <AnimatePresence>
        {phase === 'anticipation' && (
          <motion.div
            className="absolute"
            style={{
              left: '50%',
              top: '10%',
              transform: 'translateX(-50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <div className="w-4 h-4 bg-cyan-400 rounded-full blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 장애물들 */}
      <AnimatePresence>
        {obstacles.map((obstacle, index) => {
          const isPassing = passedObstacles.includes(obstacle.id);
          const delay = index * obstacleInterval;

          return (
            <motion.div
              key={obstacle.id}
              className="absolute"
              style={{
                left: `${obstacle.x}%`,
                transform: 'translateX(-50%)'
              }}
              initial={{
                y: '-20vh',
                scale: 0.3,
                opacity: 0
              }}
              animate={{
                y: isPassing ? '120vh' : ['-20vh', '50vh', '120vh'],
                scale: isPassing ? [1, 0.5, 0] : [0.3, 1.5, 0.8],
                opacity: isPassing ? [1, 0.5, 0] : [0, 1, 1],
                rotateX: [0, 45, 0]
              }}
              transition={{
                duration: obstacleInterval,
                delay: delay,
                ease: [0.42, 0, 0.58, 1] // Bezier curve for smooth approach
              }}
            >
              {obstacle.type === 'bar' ? (
                // 가로 막대 장애물
                <motion.div
                  className="relative"
                  style={{
                    width: 200,
                    height: 40,
                    background: 'linear-gradient(90deg, #4A90E2 0%, #357ABD 100%)',
                    borderRadius: 20,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.2)'
                  }}
                  animate={{
                    rotateZ: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  {/* 빛나는 효과 */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)'
                    }}
                    animate={{
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                  />
                </motion.div>
              ) : (
                // 공 모양 장애물
                <motion.div
                  className="relative rounded-full"
                  style={{
                    width: 120,
                    height: 120,
                    background: 'radial-gradient(circle at 30% 30%, #FF6B6B 0%, #C92A2A 100%)',
                    boxShadow: '0 10px 40px rgba(255,107,107,0.5), inset -20px -20px 40px rgba(0,0,0,0.3)'
                  }}
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
                  }}
                >
                  {/* 하이라이트 */}
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 40,
                      height: 40,
                      left: '30%',
                      top: '30%',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)',
                      borderRadius: '50%'
                    }}
                  />
                </motion.div>
              )}

              {/* 지나가는 순간 파티클 효과 */}
              {isPassing && (
                <ParticleEffect
                  type="sparkle"
                  position={{
                    x: (obstacle.x / 100) * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                    y: (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.5
                  }}
                  color={obstacle.type === 'bar' ? '#4A90E2' : '#FF6B6B'}
                  intensity="MID"
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 경고 표시 (장애물이 다가올 때) */}
      {phase === 'approaching' && obstacles.length > 0 && (
        <motion.div
          className="absolute top-20 left-1/2 transform -translate-x-1/2 text-white text-4xl font-black z-20"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          DUCK!
        </motion.div>
      )}
    </div>
  );
}
