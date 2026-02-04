import { useEffect, useRef, useState } from 'react';
import { StroboscopicEngine } from '../engines/StroboscopicEngine';

interface UsePreciseTimerOptions {
  duration: number; // 초
  onComplete: () => void;
  onTick?: (remaining: number) => void;
  stroboscopicEngine?: StroboscopicEngine; // 추가
  isPaused?: boolean; // 일시정지 상태
}

/**
 * Precise Logic Timer
 * RAF 기반 Delta Time 보정 로직 포함
 */
export function usePreciseTimer({
  duration,
  onComplete,
  onTick,
  stroboscopicEngine,
  isPaused: externalIsPaused = false
}: UsePreciseTimerOptions) {
  const [remaining, setRemaining] = useState(duration);
  const startTimeRef = useRef<number>(Date.now());
  const rafIdRef = useRef<number | null>(null);
  const lastVisibleTimeRef = useRef<number>(Date.now());
  const isPausedRef = useRef<boolean>(false);
  const pauseStartTimeRef = useRef<number>(0);

  // 외부 일시정지 상태 동기화
  useEffect(() => {
    if (externalIsPaused && !isPausedRef.current) {
      // 일시정지 시작
      pauseStartTimeRef.current = Date.now();
      isPausedRef.current = true;
    } else if (!externalIsPaused && isPausedRef.current) {
      // 재개
      const pausedDuration = Date.now() - pauseStartTimeRef.current;
      startTimeRef.current += pausedDuration;
      isPausedRef.current = false;
    }
  }, [externalIsPaused]);

  useEffect(() => {
    // Stroboscopic Engine에 타이머 콜백 등록
    if (stroboscopicEngine) {
      stroboscopicEngine.setTimerCallback((remaining) => {
        setRemaining(remaining);
        onTick?.(remaining);
      });
    }

    // 백그라운드 복귀 시 시간 보정
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const hiddenDuration = now - lastVisibleTimeRef.current;
        
        // 숨겨진 시간만큼 시작 시간 조정
        startTimeRef.current += hiddenDuration;
      } else {
        lastVisibleTimeRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const tick = () => {
      if (isPausedRef.current) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000; // 초
      const remaining = Math.max(0, duration - elapsed);

      setRemaining(remaining);
      onTick?.(remaining);

      if (remaining <= 0) {
        onComplete();
        return;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [duration, onComplete, onTick, stroboscopicEngine]);

  const pause = () => {
    isPausedRef.current = true;
  };

  const resume = () => {
    isPausedRef.current = false;
    // 시간 보정
    const now = Date.now();
    const pausedDuration = now - lastVisibleTimeRef.current;
    startTimeRef.current += pausedDuration;
    lastVisibleTimeRef.current = now;
  };

  return {
    remaining,
    formatted: formatDuration(remaining),
    pause,
    resume
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
