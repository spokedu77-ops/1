'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MEMORY_ROUNDS } from '../constants';
import { generateMemoryPattern } from '../lib/signals';
import { LongPressButton } from './LongPressButton';
import { CSS } from '../styles';

type ColorItem = { id: string; name: string; bg: string; text: string; symbol: string };

const TOTAL = MEMORY_ROUNDS;
const COLOR_SHOW_MS = 1000;

export function MemoryGame({
  level,
  onExit,
  onComplete,
}: {
  level: number;
  onExit: () => void;
  onComplete: (patterns: ColorItem[][]) => void;
}) {
  const [patterns] = useState<ColorItem[][]>(() => Array.from({ length: TOTAL }, () => generateMemoryPattern(level)));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'showing' | 'waiting' | 'reveal' | 'summary' | 'done'>('idle');
  const [colorIdx, setColorIdx] = useState(-1);
  const [memFlash, setMemFlash] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMemBgRef = useRef<string | null>(null);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  const currentPattern = patterns[round] ?? [];

  const runSequence = useCallback((pattern: ColorItem[], idx: number) => {
    if (idx >= pattern.length) {
      prevMemBgRef.current = null;
      setColorIdx(-1);
      setPhase('waiting');
      return;
    }
    const currentBg = pattern[idx]!.bg;
    const isSameColor = currentBg === prevMemBgRef.current;
    prevMemBgRef.current = currentBg;

    if (isSameColor) {
      setMemFlash(true);
      setColorIdx(-1);
      timerRef.current = setTimeout(() => {
        setMemFlash(false);
        setColorIdx(idx);
        setPhase('showing');
        timerRef.current = setTimeout(() => runSequence(pattern, idx + 1), COLOR_SHOW_MS);
      }, 90);
    } else {
      setColorIdx(idx);
      setPhase('showing');
      timerRef.current = setTimeout(() => runSequence(pattern, idx + 1), COLOR_SHOW_MS);
    }
  }, []);

  const startRound = useCallback(
    (r: number) => {
      clear();
      const pattern = patterns[r];
      if (!pattern || r < 0 || r >= TOTAL) return;
      setRound(r);
      setPhase('idle');
      setColorIdx(-1);
      setMemFlash(false);
      prevMemBgRef.current = null;
      timerRef.current = setTimeout(() => runSequence(pattern, 0), 500);
    },
    [patterns, runSequence]
  );

  useEffect(() => {
    startRound(0);
    return clear;
  }, [startRound]);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const summaryReadyRef = useRef(summaryReady);
  useEffect(() => {
    summaryReadyRef.current = summaryReady;
  }, [summaryReady]);
  const roundRef = useRef(round);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  const handleAction = useCallback(() => {
    const p = phaseRef.current;
    const r = roundRef.current;
    if (p === 'waiting') {
      setPhase('reveal');
    } else if (p === 'reveal') {
      const isLast = r + 1 >= TOTAL;
      if (isLast && level === 3) {
        setSummaryReady(false);
        setPhase('summary');
      } else if (isLast) {
        setPhase('done');
      } else {
        startRound(r + 1);
      }
    } else if (p === 'summary') {
      if (!summaryReadyRef.current) {
        setSummaryReady(true);
      } else {
        onComplete(patterns);
      }
    } else if (p === 'done') {
      onComplete(patterns);
    }
  }, [level, patterns, startRound, onComplete]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAction]);

  const showingColor = phase === 'showing' && colorIdx >= 0 ? currentPattern[colorIdx] ?? null : null;
  const bgColor = memFlash ? '#ffffff' : (showingColor ? showingColor.bg : '#0F172A');

  const hud = (
    <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
      <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ color: '#86EFAC' }}>🎨</span>
        <span>{round + 1} / {TOTAL}</span>
        <span style={{ opacity: 0.35, margin: '0 0.1rem' }}>|</span>
        <span style={{ color: '#FCD34D' }}>단계 {level}</span>
        <span style={{ opacity: 0.35, margin: '0 0.1rem' }}>|</span>
        <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>{level === 1 ? '3항' : level === 2 ? '5항' : '10항'}</span>
      </div>
      <button onClick={onExit} style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
    </div>
  );

  const progressBar = (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.08)', zIndex: 20 }}>
      <div style={{ height: '100%', width: `${(round / TOTAL) * 100}%`, background: '#22C55E', transition: 'width 0.5s ease', borderRadius: '0 3px 3px 0' }} />
    </div>
  );

  const dotIndicator = (
    <div style={{ position: 'absolute', bottom: '2.5rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.7rem', zIndex: 10 }}>
      {currentPattern.map((_, i) => {
        const isActive = phase === 'showing' && i === colorIdx;
        const isPast = (phase === 'showing' && i < colorIdx) || phase === 'waiting' || phase === 'reveal';
        return (
          <div
            key={i}
            style={{
              width: isActive ? 20 : 10,
              height: isActive ? 20 : 10,
              borderRadius: '50%',
              background: isActive ? '#fff' : isPast ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)',
              border: isActive ? '2px solid rgba(255,255,255,0.6)' : 'none',
              boxShadow: isActive ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
              transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          />
        );
      })}
    </div>
  );

  if (phase === 'idle')
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden' }}>
        <style>{CSS}</style>
        {hud}
        {progressBar}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>준비</div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {currentPattern.map((_, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
      </div>
    );

  if (phase === 'showing')
    return (
      <div style={{ position: 'fixed', inset: 0, background: bgColor, overflow: 'hidden', transition: memFlash ? 'none' : 'background 0.05s' }}>
        <style>{CSS}</style>
        {hud}
        {dotIndicator}
        {progressBar}
        {showingColor && (
          <div style={{ position: 'absolute', top: '5.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', borderRadius: '2rem', padding: '0.35rem 1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.85rem', zIndex: 15 }}>{colorIdx + 1} / {currentPattern.length}번째 색</div>
        )}
        {showingColor && (
          <div key={`color-${round}-${colorIdx}`} className="mem-color-enter" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ fontSize: 'clamp(130px,30vw,320px)', fontWeight: 900, color: showingColor.bg === '#FACC15' ? '#111' : '#fff', letterSpacing: '-0.03em', textShadow: '0 4px 60px rgba(0,0,0,0.25)', userSelect: 'none', lineHeight: 1 }}>{showingColor.name}</div>
              <div style={{ fontSize: 'clamp(32px,7vw,64px)', color: showingColor.bg === '#FACC15' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', userSelect: 'none' }}>{showingColor.symbol}</div>
            </div>
          </div>
        )}
      </div>
    );

  if (phase === 'waiting')
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden' }}>
        <style>{CSS}</style>
        {hud}
        {progressBar}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '6rem 2rem 4rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.35rem,4vw,2rem)', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>선생님 버튼을 누르면 정답이 공개됩니다</div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, lineHeight: 1.6 }}>학생이 순서를 말한 뒤<br />버튼을 눌러 정답을 확인하세요</div>
          </div>
          <LongPressButton onTrigger={handleAction} label="정답 공개" />
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>길게 누르기 · 스페이스바 · 엔터</div>
        </div>
      </div>
    );

  if (phase === 'reveal') {
    const isLast = round + 1 >= TOTAL;
    const displayPattern = currentPattern;
    const nextLabel = isLast ? (level === 3 ? '📋 전체 정답 목록' : '🎉 완료') : `▶ 다음 (${round + 2} / ${TOTAL})`;
    const nextBg = isLast && level === 3 ? '#A855F7' : isLast ? '#22C55E' : '#F97316';
    const nextShadow = isLast && level === 3 ? '0 8px 28px rgba(168,85,247,0.4)' : isLast ? '0 8px 28px rgba(34,197,94,0.4)' : '0 8px 28px rgba(249,115,22,0.35)';
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden' }}>
        <style>{CSS}</style>
        {hud}
        {progressBar}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.8rem', padding: '6rem 2rem 4rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{round + 1}번 정답</div>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '32rem' }}>
            {displayPattern.map((c, i) => (
              <div key={i} className="answer-pop" style={{ animationDelay: `${i * 0.09}s`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ width: 'clamp(64px,13vw,96px)', height: 'clamp(64px,13vw,96px)', borderRadius: '1.1rem', background: c.bg, boxShadow: `0 6px 24px ${c.bg}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', fontWeight: 900, color: c.text, border: '2px solid rgba(255,255,255,0.15)', flexDirection: 'column', gap: '0.1rem' }}>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{c.symbol}</span>
                  <span>{i + 1}</span>
                </div>
                <div style={{ fontSize: 'clamp(0.8rem,2vw,1rem)', fontWeight: 700, color: '#fff' }}>{c.name}</div>
              </div>
            ))}
          </div>
          <button onClick={handleAction} style={{ background: nextBg, color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.1rem 2.8rem', fontSize: 'clamp(1rem,3vw,1.3rem)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: nextShadow, marginTop: '0.5rem' }}>{nextLabel}</button>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>스페이스바 · 엔터도 가능</div>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    if (!summaryReady)
      return (
        <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden' }}>
          <style>{CSS}</style>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem' }}>
            <div style={{ fontSize: '4rem' }}>🎯</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1.6rem,5vw,2.4rem)', fontWeight: 900, color: '#fff', marginBottom: '0.6rem' }}>모두 마쳤어요!</div>
              <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500, lineHeight: 1.7 }}>전체 정답 목록을 확인할 준비가 됐나요?<br />버튼을 눌러 1~10라운드 정답을 확인하세요</div>
            </div>
            <button onClick={handleAction} style={{ background: '#A855F7', color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.2rem 3rem', fontSize: 'clamp(1.1rem,3vw,1.4rem)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(168,85,247,0.45)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>📋 정답 모두 보기</button>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>스페이스바 · 엔터도 가능</div>
          </div>
        </div>
      );

    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'auto' }}>
        <style>{CSS}</style>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1.25rem 5rem' }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📋 <span>전체 정답 목록</span></div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem', fontWeight: 500 }}>단계 3 · {TOTAL}번 진행 · 4가지 색</div>
              </div>
              <button onClick={onExit} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.75rem', padding: '0.5rem 0.9rem', color: '#fff', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>🏠 처음으로</button>
            </div>
            <div style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 0.9rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>#</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>색상 순서</span>
              </div>
              {patterns.map((pattern, ri) => (
                <div key={ri} className="answer-pop" style={{ animationDelay: `${ri * 0.03}s`, display: 'grid', gridTemplateColumns: '2.5rem 1fr', alignItems: 'center', padding: '0.55rem 0.9rem', borderBottom: ri < patterns.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>{ri + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {pattern.map((c, ci) => (
                      <React.Fragment key={ci}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <div style={{ width: 14, height: 14, borderRadius: '0.25rem', background: c.bg, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{c.name}</span>
                        </div>
                        {ci < pattern.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}>▶</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleAction} style={{ width: '100%', background: '#22C55E', color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.1rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(34,197,94,0.35)' }}>🎉 오늘 훈련 완료!</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done')
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden' }}>
        <style>{CSS}</style>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
          <div style={{ fontSize: '4rem' }}>🎉</div>
          <div style={{ fontSize: 'clamp(1.6rem,5vw,2.2rem)', fontWeight: 900, color: '#fff', textAlign: 'center' }}>모두 마쳤어요!</div>
          <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.7 }}>색깔 기억 훈련을 마쳤습니다.</div>
          <button onClick={handleAction} style={{ background: '#22C55E', color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.2rem 3rem', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}>결과 보기</button>
        </div>
      </div>
    );

  return null;
}
