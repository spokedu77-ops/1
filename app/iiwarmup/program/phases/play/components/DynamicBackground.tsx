'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface DynamicBackgroundProps {
  theme: string;
  pulseIntensity?: number;
  colorTransition?: {
    from: string;
    to: string;
  };
}

export function DynamicBackground({ 
  theme, 
  pulseIntensity = 0,
  colorTransition 
}: DynamicBackgroundProps) {
  const [currentColors, setCurrentColors] = useState({
    from: colorTransition?.from || '#1a1a2e',
    to: colorTransition?.to || '#16213e'
  });

  useEffect(() => {
    if (colorTransition) {
      setCurrentColors({
        from: colorTransition.from,
        to: colorTransition.to
      });
    }
  }, [colorTransition]);

  // 테마별 기본 색상
  const themeColors: Record<string, { from: string; to: string }> = {
    kitchen: { from: '#1a1a2e', to: '#16213e' },
    space: { from: '#0f0c29', to: '#302b63' },
    ocean: { from: '#1e3c72', to: '#2a5298' },
    sunset: { from: '#ff6b6b', to: '#ee5a6f' },
    forest: { from: '#134e5e', to: '#71b280' },
    default: { from: '#1a1a2e', to: '#16213e' }
  };

  const colors = colorTransition || themeColors[theme] || themeColors.default;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 메인 그라데이션 배경 */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`
        }}
        animate={{
          background: [
            `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
            `linear-gradient(225deg, ${colors.from} 0%, ${colors.to} 100%)`,
            `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`
          ]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {/* 펄스 효과 */}
      {pulseIntensity > 0 && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, rgba(255,255,255,${pulseIntensity * 0.1}) 0%, transparent 70%)`
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}

      {/* 별 파티클 (어두운 테마용) */}
      {theme === 'space' || theme === 'kitchen' && (
        <div className="absolute inset-0">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.3
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
      )}

      {/* 그리드 패턴 (선택적) */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  );
}
