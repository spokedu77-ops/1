'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logSubscriberRuntime } from '@/app/lib/logging/logClient';
import { stopBGM } from '@/app/lib/admin/engines/think150/think150Audio';
import { BridgeOverlay } from './BridgeOverlay';
import type { PlayMode } from './PhaseControls';

export type SequencePhase =
  | 'idle'
  | 'play'
  | 'bridge1'
  | 'think'
  | 'bridge2'
  | 'flow'
  | 'end';

const BRIDGE_DURATION_SEC = 15;

export interface FullSequencePlayerProps {
  weekKey: string;
  mode: PlayMode;
  onPhaseChange?: (phase: SequencePhase) => void;
  /** phase별 실제 콘텐츠 렌더. onEnd 호출 시 다음 phase로 전환 */
  renderPlay?: (props: { weekKey: string; onEnd: () => void }) => React.ReactNode;
  renderThink?: (props: { weekKey: string; onEnd: () => void }) => React.ReactNode;
  renderFlow?: (props: { weekKey: string; onEnd: () => void; showLevelSelector?: boolean }) => React.ReactNode;
}

export function FullSequencePlayer({
  weekKey,
  mode,
  onPhaseChange,
  renderPlay,
  renderThink,
  renderFlow,
}: FullSequencePlayerProps) {
  const [phase, setPhase] = useState<SequencePhase>('idle');
  const [bridgeSecondsLeft, setBridgeSecondsLeft] = useState(BRIDGE_DURATION_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advancePhaseRef = useRef<() => void>(() => {});

  const advancePhase = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const next: SequencePhase =
      phase === 'think'
        ? mode === 'think'
          ? 'end'
          : 'bridge1'
        : phase === 'bridge1'
          ? 'play'
          : phase === 'play'
            ? mode === 'play'
              ? 'end'
              : 'bridge2'
            : phase === 'bridge2'
              ? 'flow'
              : phase === 'flow'
                ? 'end'
                : 'idle';

    setPhase(next);
    onPhaseChange?.(next);
    if (next !== 'idle' && next !== 'end') {
      logSubscriberRuntime({
        event_type: 'PHASE_START',
        week_key: weekKey,
        meta: { phase: next },
      });
    }
    if (next === 'end') {
      logSubscriberRuntime({
        event_type: 'PHASE_END',
        week_key: weekKey,
        meta: { phase },
      });
    }

    if (next === 'bridge1' || next === 'bridge2') {
      setBridgeSecondsLeft(BRIDGE_DURATION_SEC);
      if (next === 'bridge1') {
        // 챌린지(Play) 전 프리로드
      }
      if (next === 'bridge2') {
        const iframe = document.createElement('iframe');
        iframe.src = `/program/iiwarmup/flow?weekKey=${encodeURIComponent(weekKey)}`;
        iframe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 5000);
      }
      timerRef.current = setInterval(() => {
        setBridgeSecondsLeft((s) => {
          if (s <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            advancePhaseRef.current();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
  }, [phase, mode, onPhaseChange, weekKey]);

  useEffect(() => {
    advancePhaseRef.current = advancePhase;
  }, [advancePhase]);

  const onEndStable = useCallback(() => {
    advancePhaseRef.current();
  }, []);

  const onThinkEnd = useCallback(() => {
    stopBGM();
    onEndStable();
  }, [onEndStable]);

  const handleSkipBridge = useCallback(() => {
    if (phase === 'bridge1' || phase === 'bridge2') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      advancePhase();
    }
  }, [phase, advancePhase]);

  const handlePhaseEnd = useCallback(() => {
    advancePhase();
  }, [advancePhase]);

  useEffect(() => {
    if (phase === 'idle') {
      const startPhase: SequencePhase =
        mode === 'full'
          ? 'think'
          : mode === 'think'
            ? 'think'
            : mode === 'play'
              ? 'play'
              : 'flow';
      setPhase(startPhase);
      onPhaseChange?.(startPhase);
    }
  }, [phase, mode, onPhaseChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (phase === 'idle') return null;

  if (phase === 'bridge1') {
    return (
      <BridgeOverlay
        secondsLeft={bridgeSecondsLeft}
        nextPhase="챌린지"
        nextPhaseSub="리듬"
        onSkip={handleSkipBridge}
      />
    );
  }

  if (phase === 'bridge2') {
    return (
      <BridgeOverlay
        secondsLeft={bridgeSecondsLeft}
        nextPhase="플로우"
        nextPhaseSub="몰입"
        onSkip={handleSkipBridge}
      />
    );
  }

  if (phase === 'play') {
    return (
      <div className="fixed inset-0 flex flex-col bg-black">
        <div className="flex-1">
          {renderPlay ? (
            // weekKey는 문자열 prop이며 ref 아님 (react-hooks/refs 오탐 회피)
            // eslint-disable-next-line react-hooks/refs
            renderPlay({ weekKey, onEnd: onEndStable })
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              <div className="text-center">
                <p className="mb-2">Play Phase (placeholder)</p>
                <p className="mb-4 text-sm text-neutral-400">{weekKey}</p>
                <button
                  type="button"
                  className="rounded bg-cyan-600 px-4 py-2"
                  onClick={handlePhaseEnd}
                >
                  Play 종료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'think') {
    return (
      <div className="fixed inset-0 flex flex-col bg-black">
        <div className="flex-1">
          {renderThink ? (
            // eslint-disable-next-line react-hooks/refs
            renderThink({ weekKey, onEnd: onThinkEnd })
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              <div className="text-center">
                <p className="mb-2">Think Phase (placeholder)</p>
                <p className="mb-4 text-sm text-neutral-400">{weekKey}</p>
                <button
                  type="button"
                  className="rounded bg-cyan-600 px-4 py-2"
                  onClick={handlePhaseEnd}
                >
                  Think 종료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'flow') {
    return (
      <div className="fixed inset-0 flex flex-col bg-black">
        <div className="flex-1">
          {renderFlow ? (
            // eslint-disable-next-line react-hooks/refs
            renderFlow({ weekKey, onEnd: onEndStable, showLevelSelector: mode === 'flow' })
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              <div className="text-center">
                <p className="mb-2">Flow Phase (placeholder)</p>
                <p className="mb-4 text-sm text-neutral-400">{weekKey}</p>
                <button
                  type="button"
                  className="rounded bg-cyan-600 px-4 py-2"
                  onClick={handlePhaseEnd}
                >
                  Flow 종료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // end
  return null;
}
