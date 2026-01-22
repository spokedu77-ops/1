'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ActionProps } from '../types';
import { ParticleEffect, ShockwaveRing } from '../components/ParticleEffect';

/**
 * POINT - Just Dance 스타일 몰입형 가리키기 동작
 * 
 * 화면에 3-5개의 빛나는 타겟이 무작위 위치에 등장
 * 중앙에서 레이저 포인터 빔이 각 타겟을 순차적으로 조준
 * 타겟 맞으면 폭발 파티클 + 링 확장 효과
 * 자동 타이밍 진행 (사용자 입력 불필요)
 */
export function PointAction({ action, onComplete, onHit }: ActionProps) {
  const [phase, setPhase] = useState<'anticipation' | 'targets' | 'laser' | 'explosion' | 'complete'>('anticipation');
  const [targets, setTargets] = useState<Array<{ id: string; x: number; y: number; hit: boolean }>>([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [explosions, setExplosions] = useState<Array<{ id: string; x: number; y: number }>>([]);

  const targetCount = action.intensity === 'HIGH' ? 5 : action.intensity === 'MID' ? 4 : 3;

  useEffect(() => {
    // Anticipation: 0.5초
    const anticipationTimer = setTimeout(() => {
      setPhase('targets');
      
      // 타겟 생성 (무작위 위치)
      const newTargets = Array.from({ length: targetCount }, (_, i) => ({
        id: `target-${i}`,
        x: 20 + Math.random() * 60, // 20-80%
        y: 20 + Math.random() * 60, // 20-80%
        hit: false
      }));
      setTargets(newTargets);
    }, 500);

    return () => clearTimeout(anticipationTimer);
  }, [targetCount]);

  useEffect(() => {
    if (phase === 'targets' && targets.length > 0) {
      // 타겟이 나타난 후 0.3초 뒤 레이저 시작
      const laserTimer = setTimeout(() => {
        setPhase('laser');
      }, 300);

      return () => clearTimeout(laserTimer);
    }
  }, [phase, targets]);

  useEffect(() => {
    if (phase === 'laser' && currentTargetIndex < targets.length) {
      const target = targets[currentTargetIndex];
      
      // 각 타겟을 0.8초마다 조준
      const hitTimer = setTimeout(() => {
        // 타겟 히트
        setTargets(prev => prev.map(t => 
          t.id === target.id ? { ...t, hit: true } : t
        ));
        
        // 폭발 효과 추가
        setExplosions(prev => [...prev, { id: `explosion-${Date.now()}`, x: target.x, y: target.y }]);
        
        onHit(true);
        
        // 다음 타겟으로
        if (currentTargetIndex < targets.length - 1) {
          setCurrentTargetIndex(prev => prev + 1);
        } else {
          // 모든 타겟 완료
          setTimeout(() => {
            setPhase('complete');
            setTimeout(() => onComplete(), 500);
          }, 500);
        }
      }, 800);

      return () => clearTimeout(hitTimer);
    }
  }, [phase, currentTargetIndex, targets, onHit, onComplete]);

  const centerX = 50; // 화면 중앙
  const centerY = 50;
  const currentTarget = targets[currentTargetIndex];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Anticipation: 중앙에서 시작 */}
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
            <div className="w-8 h-8 bg-yellow-400 rounded-full blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 타겟들 */}
      <AnimatePresence>
        {targets.map((target) => (
          <motion.div
            key={target.id}
            className="absolute"
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: target.hit ? [1, 1.5, 0] : [0, 1.2, 1],
              opacity: target.hit ? [1, 1, 0] : 1,
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 0.5,
              ease: 'easeOut'
            }}
          >
            {/* 타겟 원 (빛나는 효과) */}
            <div className="relative">
              {/* 외곽 링 */}
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-yellow-400"
                style={{
                  width: 80,
                  height: 80,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4)'
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              {/* 내부 원 */}
              <motion.div
                className="absolute rounded-full bg-gradient-to-br from-yellow-300 to-orange-500"
                style={{
                  width: 60,
                  height: 60,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.5)'
                }}
                animate={{
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              {/* 중심 점 */}
              <div
                className="absolute rounded-full bg-white"
                style={{
                  width: 20,
                  height: 20,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
                }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 레이저 빔 (현재 타겟을 향해) */}
      {phase === 'laser' && currentTarget && (
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          <motion.line
            x1={`${centerX}%`}
            y1={`${centerY}%`}
            x2={`${currentTarget.x}%`}
            y2={`${currentTarget.y}%`}
            stroke="url(#laserGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <defs>
            <linearGradient id="laserGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FF6B6B" stopOpacity="1" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      )}

      {/* 폭발 효과 */}
      <AnimatePresence>
        {explosions.map((explosion) => (
          <div key={explosion.id}>
            <ParticleEffect
              type="explosion"
              position={{
                x: (explosion.x / 100) * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                y: (explosion.y / 100) * (typeof window !== 'undefined' ? window.innerHeight : 1080)
              }}
              color="#FFD700"
              intensity="HIGH"
            />
            <ShockwaveRing
              position={{
                x: (explosion.x / 100) * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                y: (explosion.y / 100) * (typeof window !== 'undefined' ? window.innerHeight : 1080)
              }}
              color="#FFD700"
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
