'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

interface ParticleEffectProps {
  type: 'explosion' | 'sparkle' | 'shockwave' | 'trail';
  position: { x: number; y: number };
  color?: string;
  intensity?: 'LOW' | 'MID' | 'HIGH';
  onComplete?: () => void;
}

export function ParticleEffect({ 
  type, 
  position, 
  color = '#FFD700', 
  intensity = 'MID',
  onComplete 
}: ParticleEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const count = intensity === 'HIGH' ? 30 : intensity === 'MID' ? 20 : 10;
    const newParticles: Particle[] = [];

    if (type === 'explosion') {
      // 폭발 효과: 방사형으로 파티클 분산
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 2 + Math.random() * 3;
        newParticles.push({
          id: `p-${i}`,
          x: position.x,
          y: position.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 6,
          color: color,
          life: 1
        });
      }
    } else if (type === 'sparkle') {
      // 반짝임 효과: 작은 별들이 반짝
      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: `p-${i}`,
          x: position.x + (Math.random() - 0.5) * 100,
          y: position.y + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 3 + Math.random() * 4,
          color: color,
          life: 1
        });
      }
    } else if (type === 'shockwave') {
      // 충격파: 원형 파동
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        newParticles.push({
          id: `p-${i}`,
          x: position.x,
          y: position.y,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5,
          size: 8 + Math.random() * 4,
          color: color,
          life: 1
        });
      }
    } else if (type === 'trail') {
      // 궤적 효과: 선형으로 파티클 흐름
      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: `p-${i}`,
          x: position.x,
          y: position.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 2 + Math.random() * 3,
          color: color,
          life: 1
        });
      }
    }

    setParticles(newParticles);

    // 파티클 애니메이션
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02,
          size: p.size * 0.98
        })).filter(p => p.life > 0)
      );
    }, 16);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      onComplete?.();
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [type, position, color, intensity, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            opacity: particle.life
          }}
          animate={{
            scale: [1, 0],
            opacity: [particle.life, 0]
          }}
          transition={{
            duration: 0.5,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
}

// 충격파 링 효과
interface ShockwaveRingProps {
  position: { x: number; y: number };
  color?: string;
  onComplete?: () => void;
}

export function ShockwaveRing({ position, color = '#FFD700', onComplete }: ShockwaveRingProps) {
  return (
    <motion.div
      className="absolute rounded-full border-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        borderColor: color,
        boxShadow: `0 0 20px ${color}`
      }}
      initial={{ width: 0, height: 0, opacity: 1 }}
      animate={{ 
        width: 300, 
        height: 300, 
        opacity: 0 
      }}
      transition={{ 
        duration: 0.6,
        ease: 'easeOut'
      }}
      onAnimationComplete={onComplete}
    />
  );
}
