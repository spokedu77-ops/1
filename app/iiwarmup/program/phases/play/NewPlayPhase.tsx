'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as THREE from 'three';
import { Episode } from './types/scenario';
import { TimelineEngine } from './TimelineEngine';
import { Scene3D } from './components/Scene3D';
import { TriggerRenderer } from './components/TriggerRenderer';
import { AudioEngineComponent, AudioEngine } from './components/AudioEngine';
import { HUD } from './components/HUD';
import { ActionAnnouncer } from './components/ActionAnnouncer';
import { ensureScenarioExists } from './lib/initScenarios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface NewPlayPhaseProps {
  scenarioId: string;
}

export function NewPlayPhase({ scenarioId }: NewPlayPhaseProps) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTriggers, setActiveTriggers] = useState<Array<{ event: any; id: string }>>([]);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    async function loadEpisode() {
      console.log('🎬 [NewPlayPhase] 시나리오 로드 시작:', scenarioId);
      
      // 시나리오가 없으면 자동 생성 시도
      await ensureScenarioExists(scenarioId);
      
      const { data, error } = await supabase
        .from('play_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();

      if (error) {
        console.error('❌ [NewPlayPhase] 시나리오 로드 실패:', error);
        setLoading(false);
        return;
      }

      if (data && data.scenario_json) {
        console.log('✅ [NewPlayPhase] 시나리오 로드 성공:', data.scenario_json);
        setEpisode(data.scenario_json as Episode);
      } else {
        console.warn('⚠️ [NewPlayPhase] 시나리오 데이터 없음');
      }
      
      setLoading(false);
    }

    loadEpisode();
  }, [scenarioId]);

  // 트리거 스폰 핸들러
  const handleTriggerSpawn = (event: any, triggerTime: number) => {
    console.log('🎯 [NewPlayPhase] 트리거 스폰:', {
      action: event.action,
      triggerType: event.trigger.type,
      time: triggerTime.toFixed(2)
    });

    setCurrentAction(event.action);
    
    // 사운드 효과
    if (audioEngineRef.current) {
      const actionMap: Record<string, 'jump' | 'punch' | 'turn' | 'duck' | 'point' | 'push' | 'pull'> = {
        'JUMP': 'jump',
        'PUNCH': 'punch',
        'TURN': 'turn',
        'DUCK': 'duck',
        'POINT': 'point',
        'PUSH': 'push',
        'PULL': 'pull'
      };
      
      const soundType = actionMap[event.action];
      if (soundType) {
        audioEngineRef.current.playEffect(soundType);
      }
    }

    // 트리거 렌더링을 위한 상태 추가
    const triggerId = `trigger-${Date.now()}-${Math.random()}`;
    setActiveTriggers(prev => [...prev, { event, id: triggerId }]);
  };

  // 트리거 완료 핸들러
  const handleTriggerComplete = (triggerId: string) => {
    setActiveTriggers(prev => prev.filter(t => t.id !== triggerId));
    
    // 모든 트리거가 완료되면 액션 초기화
    setActiveTriggers(prev => {
      if (prev.length === 1) {
        setCurrentAction(null);
      }
      return prev.filter(t => t.id !== triggerId);
    });
  };

  // Phase 완료 핸들러
  const handleComplete = () => {
    console.log('🏁 [NewPlayPhase] Phase 완료');
    setCurrentAction(null);
  };

  // 경과 시간 업데이트 (HUD용)
  useEffect(() => {
    if (!episode) return;

    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 0.1;
        return newTime >= episode.total_time ? episode.total_time : newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [episode]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
        <div className="text-white text-center">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <div className="text-2xl font-bold">Play Phase 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900 to-pink-900">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-2xl font-bold">시나리오를 찾을 수 없습니다</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* 3D Scene */}
      <Scene3D 
        background={episode.background} 
        theme={episode.theme}
        onSceneReady={(scene) => {
          sceneRef.current = scene;
        }}
      />
      
      {/* Timeline Engine */}
      <TimelineEngine
        episode={episode}
        onTriggerSpawn={handleTriggerSpawn}
        onComplete={handleComplete}
      />
      
      {/* Audio Engine */}
      <AudioEngineComponent 
        bpm={150} 
        onReady={() => {
          console.log('🔊 [NewPlayPhase] 오디오 엔진 준비 완료');
        }}
        onEngineReady={(engine) => {
          audioEngineRef.current = engine;
        }}
      />
      
      {/* Active Triggers */}
      {sceneRef.current && activeTriggers.map(({ event, id }) => (
        <TriggerRenderer
          key={id}
          event={event}
          scene={sceneRef.current!}
          onComplete={() => handleTriggerComplete(id)}
        />
      ))}
      
      {/* HUD */}
      <HUD
        timeLeft={Math.ceil(episode.total_time - elapsedTime)}
        currentAction={currentAction}
        progress={(elapsedTime / episode.total_time) * 100}
      />
      
      {/* Action Announcer */}
      <ActionAnnouncer actionType={currentAction} />
    </div>
  );
}
