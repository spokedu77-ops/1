'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Episode, TimelineEvent } from './types/scenario';

interface TimelineEngineProps {
  episode: Episode;
  onTriggerSpawn: (event: TimelineEvent, triggerTime: number) => void;
  onComplete: () => void;
}

interface ActiveTrigger {
  event: TimelineEvent;
  triggerTime: number;
  repetitionCount: number;
  lastTriggerTime: number;
}

export function TimelineEngine({ episode, onTriggerSpawn, onComplete }: TimelineEngineProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const activeTriggersRef = useRef<Map<string, ActiveTrigger>>(new Map());
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // 타임라인 이벤트를 활성 트리거로 변환
  const initializeTriggers = useCallback(() => {
    activeTriggersRef.current.clear();
    
    episode.timeline.forEach((event, index) => {
      const triggerId = `trigger-${index}`;
      activeTriggersRef.current.set(triggerId, {
        event,
        triggerTime: event.start,
        repetitionCount: 0,
        lastTriggerTime: 0
      });
    });
  }, [episode.timeline]);

  // 반복 로직 계산
  const calculateNextTriggerTime = useCallback((trigger: ActiveTrigger, currentTime: number): number | null => {
    const { event } = trigger;
    const { start, end, repetition, trigger: triggerConfig } = event;

    // 구간 밖이면 null
    if (currentTime < start || currentTime > end) {
      return null;
    }

    // 반복 설정이 없으면 한 번만
    if (!repetition) {
      if (trigger.repetitionCount === 0 && currentTime >= start) {
        return start;
      }
      return null;
    }

    // 반복 로직
    const { count, interval, variation } = repetition;
    
    if (trigger.repetitionCount >= count) {
      return null;
    }

    // 첫 트리거
    if (trigger.repetitionCount === 0) {
      return start;
    }

    // 다음 트리거 시간 계산
    let nextTime = trigger.lastTriggerTime + interval;

    // 랜덤 지연 적용
    if (triggerConfig.random_delay) {
      const [min, max] = triggerConfig.random_delay;
      const randomDelay = min + Math.random() * (max - min);
      nextTime += randomDelay;
    }

    // variation에 따른 조정
    if (variation === 'alternating' && trigger.repetitionCount % 2 === 1) {
      nextTime += interval * 0.3; // 교대로 약간의 변화
    }

    // 구간 내에서만 유효
    if (nextTime > end) {
      return null;
    }

    return nextTime;
  }, []);

  // 메인 애니메이션 루프
  useEffect(() => {
    if (!isRunning || !episode) return;

    initializeTriggers();
    lastTimeRef.current = performance.now();
    let localElapsedTime = 0;

    const animate = (currentTime: number) => {
      if (!isRunning) return;

      // 경과 시간 계산 (밀리초 → 초)
      const deltaTime = lastTimeRef.current === 0 
        ? 0 
        : (currentTime - lastTimeRef.current) / 1000;
      
      localElapsedTime += deltaTime;
      lastTimeRef.current = currentTime;

      // 각 활성 트리거 체크
      activeTriggersRef.current.forEach((trigger, triggerId) => {
        const nextTriggerTime = calculateNextTriggerTime(trigger, localElapsedTime);
        
        if (nextTriggerTime !== null && localElapsedTime >= nextTriggerTime) {
          // 트리거 발동
          onTriggerSpawn(trigger.event, localElapsedTime);
          
          // 트리거 상태 업데이트
          trigger.repetitionCount++;
          trigger.lastTriggerTime = localElapsedTime;
          
          // 다음 트리거 시간이 구간을 벗어나면 제거
          const nextTime = calculateNextTriggerTime(trigger, localElapsedTime);
          if (nextTime === null) {
            activeTriggersRef.current.delete(triggerId);
          }
        }
      });

      // 전체 시간 완료 체크
      if (localElapsedTime >= episode.total_time) {
        setIsRunning(false);
        setTimeout(() => onComplete(), 500);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, episode, onTriggerSpawn, onComplete, calculateNextTriggerTime, initializeTriggers]);

  return null; // 이 컴포넌트는 렌더링하지 않음
}
