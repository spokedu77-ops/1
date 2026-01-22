'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ActionPoint, GameState } from './types';
import { HUD } from './components/HUD';
import { ScreenEffect, ScreenEffectHandle } from './components/ScreenEffect';
import { DynamicBackground } from './components/DynamicBackground';
import { ActionAnnouncer } from './components/ActionAnnouncer';
import { PointAction, DuckAction, PunchAction, PushAction, PullAction } from './actions';

interface ActionEngineProps {
  scenario: {
    theme: string;
    duration: number;
    actions: ActionPoint[];
  };
}

export function ActionEngine({ scenario }: ActionEngineProps) {
  const [gameState, setGameState] = useState<GameState>({
    elapsedTime: 0,
    isRunning: true
  });
  
  const [activeActions, setActiveActions] = useState<ActionPoint[]>([]);
  const [currentActionType, setCurrentActionType] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<ActionPoint | null>(null);
  const screenEffectRef = useRef<ScreenEffectHandle>(null);

  // 초기화 로그
  useEffect(() => {
    console.log('🚀 [ActionEngine] 초기화:', {
      theme: scenario.theme,
      duration: scenario.duration,
      totalActions: scenario.actions.length,
      actions: scenario.actions.map(a => ({ id: a.id, type: a.type, startTime: a.startTime, duration: a.duration }))
    });
  }, [scenario]);

  // 게임 타이머 (100ms 단위로 더 정밀하게)
  useEffect(() => {
    if (!gameState.isRunning) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        const newElapsedTime = prev.elapsedTime + 0.1;
        
        // 시나리오 종료 체크
        if (newElapsedTime >= scenario.duration) {
          console.log('🏁 [ActionEngine] 시나리오 종료');
          return { ...prev, elapsedTime: newElapsedTime, isRunning: false };
        }
        
        // 1초마다 진행 상황 로그
        if (Math.floor(newElapsedTime) !== Math.floor(prev.elapsedTime)) {
          console.log(`⏱️ [ActionEngine] 진행: ${Math.floor(newElapsedTime)}/${scenario.duration}초`);
        }
        
        return { ...prev, elapsedTime: newElapsedTime };
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameState.isRunning, scenario.duration]);

  // 다음 액션 계산
  useEffect(() => {
    const upcomingActions = scenario.actions.filter(
      action => action.startTime > gameState.elapsedTime
    ).sort((a, b) => a.startTime - b.startTime);
    
    if (upcomingActions.length > 0) {
      setNextAction(upcomingActions[0]);
    } else {
      setNextAction(null);
    }
  }, [gameState.elapsedTime, scenario.actions]);

  // 액션 스폰 로직
  useEffect(() => {
    if (!gameState.isRunning) return;

    // 현재 시간에 시작해야 하는 액션 찾기 (0.5초 오차 허용으로 확대)
    const actionsToSpawn = scenario.actions.filter(
      action => Math.abs(action.startTime - gameState.elapsedTime) < 0.5
    );

    if (actionsToSpawn.length > 0) {
      console.log(`🎯 [ActionEngine] 액션 스폰 시도:`, {
        elapsedTime: gameState.elapsedTime.toFixed(1),
        actionsToSpawn: actionsToSpawn.map(a => ({ id: a.id, type: a.type, startTime: a.startTime }))
      });

      setActiveActions(prev => {
        // 중복 제거
        const newActions = actionsToSpawn.filter(
          newAction => !prev.some(existing => existing.id === newAction.id)
        );
        
        if (newActions.length > 0) {
          console.log(`✨ [ActionEngine] 새 액션 스폰됨:`, newActions.map(a => a.type));
        } else {
          console.log(`⚠️ [ActionEngine] 중복 액션 스킵됨`);
        }
        
        return [...prev, ...newActions];
      });
      
      // 현재 액션 타입 업데이트 (배경 색상 변경용)
      if (actionsToSpawn[0]) {
        setCurrentActionType(actionsToSpawn[0].type);
      }
    }
  }, [gameState.elapsedTime, gameState.isRunning, scenario.actions]);

  // 액션 완료 핸들러
  const handleActionComplete = (actionId: string) => {
    const completedAction = activeActions.find(a => a.id === actionId);
    console.log(`✅ [ActionEngine] 액션 완료:`, {
      id: actionId,
      type: completedAction?.type,
      elapsedTime: gameState.elapsedTime.toFixed(1)
    });
    
    setActiveActions(prev => {
      const remaining = prev.filter(a => a.id !== actionId);
      // 모든 액션이 완료되면 현재 타입 초기화
      if (remaining.length === 0) {
        setCurrentActionType(null);
        console.log('🔄 [ActionEngine] 모든 액션 완료, 타입 초기화');
      }
      return remaining;
    });
  };

  // 액션 히트 핸들러 (자동 타이밍 기반 - 사용자 입력 불필요)
  const handleActionHit = (correct: boolean) => {
    // 1인칭 몰입 경험: 피드백만 제공
    // 모든 액션이 자동으로 진행되므로 항상 correct=true
    // 시각적 피드백은 각 액션 컴포넌트 내부에서 처리
  };

  // 액션별 배경 색상
  const getBackgroundColors = () => {
    switch(currentActionType) {
      case 'POINT':
        return { from: '#1a1a2e', to: '#16213e' }; // 어두운 파란색
      case 'PUNCH':
        return { from: '#8B0000', to: '#DC143C' }; // 빨간색
      case 'DUCK':
        return { from: '#1e3c72', to: '#2a5298' }; // 파란색 → 초록색
      case 'PUSH':
        return { from: '#FF6B35', to: '#F7931E' }; // 오렌지 → 노란색
      case 'PULL':
        return { from: '#6D28D9', to: '#8B5CF6' }; // 보라색
      default:
        return { from: '#1a1a2e', to: '#16213e' };
    }
  };

  // 액션별 컴포넌트 렌더링
  const renderAction = (action: ActionPoint) => {
    const props = {
      action,
      onComplete: () => handleActionComplete(action.id),
      onHit: handleActionHit
    };

    switch(action.type) {
      case 'POINT':
        return <PointAction key={action.id} {...props} />;
      case 'DUCK':
        return <DuckAction key={action.id} {...props} />;
      case 'PUNCH':
        return <PunchAction key={action.id} {...props} />;
      case 'PUSH':
        return <PushAction key={action.id} {...props} />;
      case 'PULL':
        return <PullAction key={action.id} {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 동적 배경 */}
      <DynamicBackground 
        theme={scenario.theme}
        pulseIntensity={activeActions.length > 0 ? 0.3 : 0}
        colorTransition={getBackgroundColors()}
      />
      
      {/* HUD */}
      <HUD 
        timeLeft={Math.ceil(scenario.duration - gameState.elapsedTime)}
        currentAction={currentActionType}
        nextAction={nextAction}
        elapsedTime={gameState.elapsedTime}
        progress={(gameState.elapsedTime / scenario.duration) * 100}
      />
      
      {/* 액션 발표자 (화면 중앙에 큰 텍스트) */}
      <ActionAnnouncer actionType={currentActionType} />
      
      {/* 스크린 이펙트 */}
      <ScreenEffect ref={screenEffectRef} />
      
      {/* 액션 렌더링 */}
      <div className="relative w-full h-full">
        {activeActions.map(renderAction)}
      </div>
      
      {/* 게임 종료 오버레이 */}
      {!gameState.isRunning && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="text-center text-white">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-6xl font-bold mb-4"
            >
              Play Phase 완료!
            </motion.div>
            <div className="text-xl opacity-70 mt-8">다음 Phase로 이동 중...</div>
          </div>
        </div>
      )}
    </div>
  );
}
