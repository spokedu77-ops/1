'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MEMORY_ROUNDS } from '../constants';
import { playBeep } from '../lib/audio';
import { buildMemoryPatternFromSlots, DEFAULT_MEMORY_COLOR_SLOTS } from '../lib/memoryColorSlots';
import { generateMemoryPattern } from '../lib/signals';
import { LongPressButton } from './LongPressButton';

type ColorItem = { id: string; name: string; bg: string; text: string; symbol: string };
type Phase = 'idle' | 'showing' | 'waiting' | 'reveal' | 'summaryIntro' | 'summary' | 'done';

const BASIC_RANDOM_MIN_MS = 1000;
const BASIC_RANDOM_MAX_MS_L1 = 2500;
const BASIC_RANDOM_MAX_MS_L2 = 3000;

function randomBasicShowMs(level: number) {
  const maxMs = level === 2 ? BASIC_RANDOM_MAX_MS_L2 : BASIC_RANDOM_MAX_MS_L1;
  return Math.round(BASIC_RANDOM_MIN_MS + Math.random() * (maxMs - BASIC_RANDOM_MIN_MS));
}

function buildBasicShowSchedule(level: number, patternLength: number): number[] {
  const schedule = Array.from({ length: patternLength }, () => randomBasicShowMs(level));
  if (level === 1 && patternLength >= 2) {
    schedule[1] = BASIC_RANDOM_MIN_MS;
  } else if (level === 2 && patternLength >= 4) {
    const midPool = [1, 2, 3].filter((i) => i < patternLength);
    schedule[midPool[Math.floor(Math.random() * midPool.length)]!] = BASIC_RANDOM_MIN_MS;
  }
  return schedule;
}

function colorShowMs(level: number, speedSec: number, schedule: number[], index: number) {
  if (level === 1 || level === 2) return schedule[index] ?? randomBasicShowMs(level);
  return Math.max(100, Math.round((Number(speedSec) || 1) * 1000));
}

function patternLengthLabel(level: number) {
  if (level === 1) return '3색';
  if (level === 2) return '5색';
  return '10색';
}

export function MemoryGame({
  level,
  onExit,
  onComplete,
  audioMode,
  speedSec,
  startDelayMs = 500,
  slotColorIds,
  roundCount = MEMORY_ROUNDS,
}: {
  level: number;
  onExit: () => void;
  onComplete: (patterns: ColorItem[][]) => void;
  audioMode: string;
  speedSec: number;
  startDelayMs?: number;
  slotColorIds?: string[];
  roundCount?: number;
}) {
  const total = Math.max(1, roundCount);
  const patterns = useMemo<ColorItem[][]>(() => {
    if (level === 6) {
      const ids = slotColorIds?.length ? slotColorIds : DEFAULT_MEMORY_COLOR_SLOTS;
      const fixed = buildMemoryPatternFromSlots(ids);
      return Array.from({ length: total }, () => fixed);
    }
    return Array.from({ length: total }, () => generateMemoryPattern(level));
  }, [level, slotColorIds, total]);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [colorIndex, setColorIndex] = useState(-1);
  const [flashWhite, setFlashWhite] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const roundRef = useRef(0);
  const scheduleRef = useRef<number[]>([]);
  const previousBgRef = useRef<string | null>(null);

  const currentPattern = patterns[round] ?? [];
  const showingColor = phase === 'showing' && colorIndex >= 0 ? currentPattern[colorIndex] ?? null : null;
  const isTenItemLevel = level === 3 || level === 6;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const runSequence = useCallback(
    (pattern: ColorItem[], index: number) => {
      if (index >= pattern.length) {
        previousBgRef.current = null;
        setColorIndex(-1);
        setPhase('waiting');
        return;
      }

      const item = pattern[index]!;
      const showCurrent = () => {
        if (audioMode === 'beep') playBeep('mid');
        setFlashWhite(false);
        setColorIndex(index);
        setPhase('showing');
        timerRef.current = setTimeout(
          () => runSequence(pattern, index + 1),
          colorShowMs(level, speedSec, scheduleRef.current, index),
        );
      };

      if (item.bg === previousBgRef.current) {
        setFlashWhite(true);
        setColorIndex(-1);
        timerRef.current = setTimeout(showCurrent, 90);
      } else {
        showCurrent();
      }
      previousBgRef.current = item.bg;
    },
    [audioMode, level, speedSec],
  );

  const startRound = useCallback(
    (nextRound: number) => {
      clearTimer();
      const pattern = patterns[nextRound];
      if (!pattern) return;
      setRound(nextRound);
      setColorIndex(-1);
      setFlashWhite(false);
      setPhase('idle');
      previousBgRef.current = null;
      scheduleRef.current = level === 1 || level === 2 ? buildBasicShowSchedule(level, pattern.length) : [];
      timerRef.current = setTimeout(() => runSequence(pattern, 0), Math.max(0, startDelayMs));
    },
    [clearTimer, level, patterns, runSequence, startDelayMs],
  );

  useEffect(() => {
    startRound(0);
    return clearTimer;
  }, [clearTimer, startRound]);

  const advance = useCallback(() => {
    const activePhase = phaseRef.current;
    const activeRound = roundRef.current;
    if (activePhase === 'waiting') {
      setPhase('reveal');
      return;
    }
    if (activePhase === 'reveal') {
      const last = activeRound + 1 >= total;
      if (last && isTenItemLevel) setPhase('summaryIntro');
      else if (last) setPhase('done');
      else startRound(activeRound + 1);
      return;
    }
    if (activePhase === 'summaryIntro') {
      setPhase('summary');
      return;
    }
    if (activePhase === 'summary' || activePhase === 'done') {
      onComplete(patterns);
    }
  }, [isTenItemLevel, onComplete, patterns, startRound, total]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance]);

  const bgColor = flashWhite ? '#FFFFFF' : showingColor ? showingColor.bg : '#0F172A';
  const textOnColor = showingColor?.bg === '#FACC15' ? '#111827' : '#FFFFFF';

  const hud = (
    <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', zIndex: 20, display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', background: 'rgba(0,0,0,0.55)', padding: '0.6rem 1.2rem', color: '#fff', fontSize: '1rem', fontWeight: 800, backdropFilter: 'blur(14px)' }}>
        <span style={{ color: '#86EFAC' }}>기억</span>
        <span>{round + 1} / {total}</span>
        <span style={{ opacity: 0.35 }}>|</span>
        <span style={{ color: '#FCD34D' }}>{level}번</span>
        <span style={{ opacity: 0.35 }}>|</span>
        <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>{patternLengthLabel(level)}</span>
      </div>
      <button type="button" onClick={onExit} style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', background: 'rgba(0,0,0,0.55)', padding: '0.6rem 1rem', color: '#fff', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.08em' }}>
        STOP
      </button>
    </div>
  );

  const progress = (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, height: 5, background: 'rgba(255,255,255,0.08)' }}>
      <div style={{ height: '100%', width: `${(round / total) * 100}%`, borderRadius: '0 3px 3px 0', background: '#22C55E', transition: 'width 0.5s ease' }} />
    </div>
  );

  const dots = (
    <div style={{ position: 'absolute', bottom: '2.5rem', left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'center', gap: '0.7rem' }}>
      {currentPattern.map((_, index) => {
        const active = phase === 'showing' && index === colorIndex;
        const past = (phase === 'showing' && index < colorIndex) || phase === 'waiting' || phase === 'reveal';
        return (
          <div
            key={index}
            style={{
              width: active ? 20 : 10,
              height: active ? 20 : 10,
              borderRadius: '50%',
              background: active ? '#fff' : past ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)',
              border: active ? '2px solid rgba(255,255,255,0.6)' : 'none',
              boxShadow: active ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
              transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />
        );
      })}
    </div>
  );

  if (phase === 'showing') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden', background: bgColor, transition: flashWhite ? 'none' : 'background 0.05s' }}>
        {hud}
        {dots}
        {progress}
        {showingColor ? (
          <>
            <div style={{ position: 'absolute', top: '5.5rem', left: '50%', zIndex: 15, transform: 'translateX(-50%)', borderRadius: '2rem', background: 'rgba(0,0,0,0.35)', padding: '0.35rem 1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 800, backdropFilter: 'blur(8px)' }}>
              {colorIndex + 1} / {currentPattern.length}번째
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ color: textOnColor, fontSize: 'clamp(130px,30vw,320px)', fontWeight: 900, lineHeight: 1, textShadow: '0 4px 60px rgba(0,0,0,0.25)', userSelect: 'none' }}>
                  {showingColor.name}
                </div>
                <div style={{ color: textOnColor, fontSize: 'clamp(32px,7vw,64px)', opacity: 0.35, userSelect: 'none' }}>{showingColor.symbol}</div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  if (phase === 'waiting') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden', background: '#0F172A' }}>
        {hud}
        {progress}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '6rem 2rem 4rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '0.5rem', color: '#fff', fontSize: 'clamp(1.35rem,4vw,2rem)', fontWeight: 900 }}>학생이 순서를 말한 뒤 정답을 공개하세요.</div>
            <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.6 }}>버튼을 길게 누르거나 Space/Enter로 정답을 확인합니다.</div>
          </div>
          <LongPressButton onTrigger={advance} label="정답 공개" />
        </div>
      </div>
    );
  }

  if (phase === 'reveal') {
    const isLast = round + 1 >= total;
    const nextLabel = isLast ? (isTenItemLevel ? '전체 정답 목록' : '훈련 완료') : `다음 (${round + 2} / ${total})`;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden', background: '#0F172A' }}>
        {hud}
        {progress}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.8rem', padding: '6rem 2rem 4rem' }}>
          <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{round + 1}번 정답</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem', maxWidth: '32rem' }}>
            {currentPattern.map((color, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ display: 'flex', width: 'clamp(64px,13vw,96px)', height: 'clamp(64px,13vw,96px)', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.1rem', border: '2px solid rgba(255,255,255,0.15)', borderRadius: '1.1rem', background: color.bg, color: color.text, fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', fontWeight: 900, boxShadow: `0 6px 24px ${color.bg}66` }}>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{color.symbol}</span>
                  <span>{index + 1}</span>
                </div>
                <div style={{ color: '#fff', fontSize: 'clamp(0.8rem,2vw,1rem)', fontWeight: 800 }}>{color.name}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={advance} style={{ marginTop: '0.5rem', border: 'none', borderRadius: '1.25rem', background: isLast ? '#22C55E' : '#F97316', padding: '1.1rem 2.8rem', color: '#fff', fontSize: 'clamp(1rem,3vw,1.3rem)', fontWeight: 900, cursor: 'pointer' }}>
            {nextLabel}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'summaryIntro') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden', background: '#0F172A' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 'clamp(1.6rem,5vw,2.4rem)', fontWeight: 900 }}>모든 라운드를 마쳤습니다.</div>
          <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '1rem', fontWeight: 600, lineHeight: 1.7 }}>전체 정답 목록을 확인한 뒤 훈련을 완료하세요.</div>
          <button type="button" onClick={advance} style={{ border: 'none', borderRadius: '1.25rem', background: '#A855F7', padding: '1.2rem 3rem', color: '#fff', fontSize: 'clamp(1.1rem,3vw,1.4rem)', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 32px rgba(168,85,247,0.45)' }}>
            정답 목록 보기
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'auto', background: '#0F172A' }}>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1.25rem 5rem' }}>
          <div style={{ width: '100%', maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 900 }}>전체 정답 목록</div>
                <div style={{ marginTop: '0.25rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', fontWeight: 700 }}>{level}번 · {total}라운드 · {patternLengthLabel(level)}</div>
              </div>
              <button type="button" onClick={onExit} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.07)', padding: '0.5rem 0.9rem', color: '#fff', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer' }}>
                처음으로
              </button>
            </div>
            <div style={{ marginBottom: '1.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', padding: '0.5rem 0.9rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 800 }}>#</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 800 }}>색상 순서</span>
              </div>
              {patterns.map((pattern, rowIndex) => (
                <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr', alignItems: 'center', borderBottom: rowIndex < patterns.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', padding: '0.55rem 0.9rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', fontWeight: 900 }}>{rowIndex + 1}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem' }}>
                    {pattern.map((color, colorIndex) => (
                      <React.Fragment key={colorIndex}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <div style={{ width: 14, height: 14, borderRadius: '0.25rem', background: color.bg, flexShrink: 0 }} />
                          <span style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 800 }}>{color.name}</span>
                        </div>
                        {colorIndex < pattern.length - 1 ? <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.65rem' }}>→</span> : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={advance} style={{ width: '100%', border: 'none', borderRadius: '1.25rem', background: '#22C55E', padding: '1.1rem', color: '#fff', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 24px rgba(34,197,94,0.35)' }}>
              훈련 완료
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden', background: '#0F172A' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 'clamp(1.6rem,5vw,2.2rem)', fontWeight: 900 }}>모두 마쳤습니다.</div>
          <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '1rem', lineHeight: 1.7 }}>색상 기억 훈련이 완료되었습니다.</div>
          <button type="button" onClick={advance} style={{ border: 'none', borderRadius: '1.25rem', background: '#22C55E', padding: '1.2rem 3rem', color: '#fff', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}>
            결과 보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden', background: '#0F172A' }}>
      {hud}
      {progress}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.1em' }}>준비</div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {currentPattern.map((_, index) => (
            <div key={index} style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
