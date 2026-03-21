'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateLevel4Pattern, Level4Item } from '../lib/signals';
import { playBeep } from '../lib/audio';
import { CSS } from '../styles';

const TOTAL = 10;
const SHOW_MS = 1000;

type L5Phase = 'idle' | 'showing' | 'awaitReveal' | 'reveal' | 'done';

export function MemoryGameLevel5({
  onExit,
  onComplete,
  audioMode,
}: {
  onExit: () => void;
  onComplete: () => void;
  audioMode: string;
}) {
  const [items] = useState<Level4Item[]>(() => generateLevel4Pattern());
  const [showIdx, setShowIdx] = useState(-1);
  const [memFlash, setMemFlash] = useState(false);
  const [phase, setPhase] = useState<L5Phase>('idle');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevColorRef = useRef<string | null>(null);
  const phaseRef = useRef<L5Phase>('idle');

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const runSequence = useCallback((idx: number) => {
    if (idx >= TOTAL) {
      prevColorRef.current = null;
      setPhase('awaitReveal');
      return;
    }

    const item = items[idx]!;
    const isSame = item.color.bg === prevColorRef.current;
    prevColorRef.current = item.color.bg;

    if (isSame) {
      setMemFlash(true);
      setShowIdx(-1);
      timerRef.current = setTimeout(() => {
        setMemFlash(false);
        if (audioMode === 'beep') playBeep('blip');
        setShowIdx(idx);
        setPhase('showing');
        timerRef.current = setTimeout(() => runSequence(idx + 1), SHOW_MS);
      }, 100);
    } else {
      if (audioMode === 'beep') playBeep('blip');
      setShowIdx(idx);
      setPhase('showing');
      timerRef.current = setTimeout(() => runSequence(idx + 1), SHOW_MS);
    }
  }, [items, audioMode]);

  useEffect(() => {
    timerRef.current = setTimeout(() => runSequence(0), 600);
    return clear;
  }, [runSequence]);

  const handleAction = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'awaitReveal') {
      setPhase('reveal');
    } else if (p === 'reveal') {
      setPhase('done');
    } else if (p === 'done') {
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const p = phaseRef.current;
      if (p === 'awaitReveal') {
        if (e.code !== 'Space') return;
        e.preventDefault();
        handleAction();
        return;
      }
      if (p === 'reveal' || p === 'done') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleAction();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAction]);

  const currentItem = showIdx >= 0 ? items[showIdx] : null;

  const progressPct = phase === 'showing' || phase === 'idle'
    ? ((Math.max(0, showIdx) / TOTAL) * 100)
    : 100;

  const hud = (
    <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
      <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ color: '#86EFAC' }}>🎨</span>
        {(phase === 'idle' || phase === 'showing') && (
          <>
            <span>{Math.max(1, showIdx + 1)} / {TOTAL}</span>
            <span style={{ opacity: 0.35, margin: '0 0.1rem' }}>|</span>
          </>
        )}
        <span style={{ color: '#FCD34D' }}>5번</span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}
      >
        ✕
      </button>
    </div>
  );

  const progressBar = (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.08)', zIndex: 20 }}>
      <div style={{ height: '100%', width: `${progressPct}%`, background: '#22C55E', transition: 'width 0.5s ease', borderRadius: '0 3px 3px 0' }} />
    </div>
  );

  // ── idle ──
  if (phase === 'idle')
    return (
      <div style={{ position: 'fixed', inset: 0, background: memFlash ? '#ffffff' : '#0F172A', overflow: 'hidden', zIndex: 300 }}>
        <style>{CSS}</style>
        {hud}
        {progressBar}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>준비</div>
        </div>
      </div>
    );

  // ── showing ──
  if (phase === 'showing') {
    const bgColor = memFlash ? '#ffffff' : (currentItem ? currentItem.color.bg : '#0F172A');
    const isYellow = currentItem?.color.bg === '#FACC15';
    const textColor = isYellow ? '#111' : '#fff';
    return (
      <div style={{ position: 'fixed', inset: 0, background: bgColor, overflow: 'hidden', zIndex: 300, transition: memFlash ? 'none' : 'background 0.05s' }}>
        <style>{CSS}</style>
        {hud}
        {progressBar}
        {currentItem && (
          <>
            <div style={{ position: 'absolute', top: '5.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', borderRadius: '2rem', padding: '0.35rem 1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.85rem', zIndex: 15 }}>
              {showIdx + 1} / {TOTAL}번째
            </div>
            <div key={`l5-${showIdx}`} className="mem-color-enter" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ fontSize: 'clamp(130px,30vw,300px)', fontWeight: 900, color: textColor, letterSpacing: '-0.04em', textShadow: `0 4px 60px rgba(0,0,0,0.2)`, userSelect: 'none', lineHeight: 1 }}>
                  {currentItem.num}
                </div>
                <div style={{ fontSize: 'clamp(1rem,2.5vw,1.4rem)', fontWeight: 700, color: isYellow ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)', userSelect: 'none' }}>
                  {currentItem.color.name}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── awaitReveal (정답 수동 공개 대기) ──
  if (phase === 'awaitReveal') {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="정답 공개"
        onClick={handleAction}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0F172A',
          overflow: 'hidden',
          zIndex: 300,
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <style>{CSS}</style>
        {hud}
        {progressBar}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            padding: '5rem 1.5rem',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '2.5rem', opacity: 0.9 }}>👆</div>
          <div style={{ fontSize: 'clamp(1.25rem,4vw,1.75rem)', fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.45 }}>
            정답을 보려면
            <br />
            <span style={{ color: '#86EFAC' }}>스페이스바</span>를 누르거나
            <br />
            화면을 누르세요
          </div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            10번 모두 표시되었습니다
          </div>
        </div>
      </div>
    );
  }

  // ── reveal (전체 정답 공개) ──
  if (phase === 'reveal') {
    // items를 번호 순서(1~10)로 정렬해서 표시
    const sorted = [...items].sort((a, b) => a.num - b.num);
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden', zIndex: 300 }}>
        <style>{CSS}</style>
        {hud}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '5rem 1.5rem 5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📋</div>
            <div style={{ fontSize: 'clamp(1.3rem,4vw,1.8rem)', fontWeight: 900, color: '#fff', marginBottom: '0.3rem' }}>전체 정답</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>번호별 색깔을 확인하세요</div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 'clamp(0.4rem,1.5vw,0.7rem)',
            width: '100%',
            maxWidth: 540,
          }}>
            {sorted.map((item) => {
              const isYellow = item.color.bg === '#FACC15';
              return (
                <div
                  key={item.num}
                  className="answer-pop"
                  style={{
                    background: item.color.bg,
                    borderRadius: '0.9rem',
                    padding: 'clamp(0.5rem,1.5vw,0.8rem) 0.3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    border: '2px solid rgba(255,255,255,0.18)',
                    boxShadow: `0 4px 18px ${item.color.bg}66`,
                  }}
                >
                  <span style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 900, color: isYellow ? '#111' : '#fff', lineHeight: 1 }}>
                    {item.num}
                  </span>
                  <span style={{ fontSize: 'clamp(0.55rem,1.4vw,0.7rem)', fontWeight: 700, color: isYellow ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)', letterSpacing: '0.02em' }}>
                    {item.color.name}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAction();
            }}
            style={{ background: '#22C55E', color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1rem 2.8rem', fontSize: 'clamp(1rem,3vw,1.2rem)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 28px rgba(34,197,94,0.4)' }}
          >
            🎉 완료
          </button>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>클릭 · 스페이스바 · 엔터</div>
        </div>
      </div>
    );
  }

  // ── done ──
  if (phase === 'done')
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden', zIndex: 300 }}>
        <style>{CSS}</style>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
          <div style={{ fontSize: '4rem' }}>🎉</div>
          <div style={{ fontSize: 'clamp(1.6rem,5vw,2.2rem)', fontWeight: 900, color: '#fff', textAlign: 'center' }}>모두 마쳤어요!</div>
          <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.7 }}>
            색깔-번호 기억 훈련 완료!
          </div>
          <button type="button" onClick={handleAction} style={{ background: '#22C55E', color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.2rem 3rem', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}>
            결과 보기
          </button>
        </div>
      </div>
    );

  return null;
}
