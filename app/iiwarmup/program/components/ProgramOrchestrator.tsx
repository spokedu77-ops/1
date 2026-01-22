'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export interface Phase {
  type: 'play' | 'think' | 'flow';
  duration: number;
  scenario_id?: string;
  content_type?: string;
}

interface ProgramOrchestratorProps {
  phases: Phase[];
  programTitle: string;
}

export function ProgramOrchestrator({ phases, programTitle }: ProgramOrchestratorProps) {
  const router = useRouter();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const currentPhase = phases[currentPhaseIndex];
  const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
  const totalElapsed = phases.slice(0, currentPhaseIndex).reduce((sum, p) => sum + p.duration, 0) + elapsedTime;

  // 타이머 로직
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        
        // Phase 완료 체크
        if (newTime >= currentPhase.duration) {
          if (currentPhaseIndex < phases.length - 1) {
            // 다음 Phase로 전환
            setCurrentPhaseIndex(prev => prev + 1);
            return 0;
          } else {
            // 전체 프로그램 완료
            clearInterval(timer);
            setTimeout(() => {
              router.push('/iiwarmup');
            }, 2000);
            return newTime;
          }
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentPhaseIndex, isPaused, currentPhase.duration, phases.length, router]);

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Phase별 렌더링
  const renderPhase = () => {
    const PhaseComponent = getPhaseComponent(currentPhase.type);
    return <PhaseComponent phase={currentPhase} />;
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 상단 진행바 */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-white">
            <div className="text-sm opacity-70">
              {currentPhase.type.toUpperCase()} PHASE ({currentPhaseIndex + 1}/{phases.length})
            </div>
            <div className="text-2xl font-bold">{programTitle}</div>
          </div>
          
          <div className="text-white text-right">
            <div className="text-sm opacity-70">남은 시간</div>
            <div className="text-3xl font-bold font-mono">
              {formatTime(totalDuration - totalElapsed)}
            </div>
          </div>
        </div>
        
        {/* 프로그레스 바 */}
        <div className="h-2 bg-gray-800">
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${(totalElapsed / totalDuration) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Phase 전환 애니메이션 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhaseIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full"
        >
          {renderPhase()}
        </motion.div>
      </AnimatePresence>

      {/* 일시정지 오버레이 */}
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
        >
          <div className="text-center">
            <div className="text-white text-6xl font-bold mb-4">일시정지</div>
            <button 
              onClick={() => setIsPaused(false)}
              className="bg-white text-black px-8 py-4 rounded-full text-xl font-bold hover:scale-105 transition-transform"
            >
              계속하기
            </button>
          </div>
        </motion.div>
      )}

      {/* ESC 키로 일시정지 */}
      <div className="absolute bottom-4 right-4 text-white/30 text-sm z-40">
        ESC: 일시정지
      </div>
    </div>
  );
}

// Phase별 컴포넌트 매핑
function getPhaseComponent(type: string) {
  switch(type) {
    case 'play':
      // PlayPhase는 동적 import
      const PlayPhase = require('../phases/play/PlayPhase').PlayPhase;
      return ({ phase }: { phase: Phase }) => (
        <PlayPhase scenarioId={phase.scenario_id || 'week1_kitchen'} />
      );
    case 'think':
      const ThinkPhasePlaceholder = require('../phases/think/ThinkPhasePlaceholder').ThinkPhasePlaceholder;
      return ({ phase }: { phase: Phase }) => <ThinkPhasePlaceholder />;
    case 'flow':
      const FlowPhase = require('../phases/flow/FlowPhase').FlowPhase;
      return ({ phase }: { phase: Phase }) => <FlowPhase phase={phase} />;
    default:
      return ({ phase }: { phase: Phase }) => (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
          Unknown Phase: {type}
        </div>
      );
  }
}
