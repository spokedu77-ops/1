'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { COLORS } from '../constants';
import { NBACK_ROUNDS, NBACK_SHOW_MS, NBACK_GAP_MS } from '../constants';
import { tts } from '../lib/tts';
import { CSS } from '../styles';

type ColorItem = (typeof COLORS)[number];

export function NBackGame({
  level,
  audioMode,
  colors = COLORS,
  onExit,
  onComplete,
}: {
  level: number;
  audioMode: string;
  colors?: ColorItem[];
  onExit: () => void;
  onComplete: (score: { hits: number; misses: number; falseAlarms: number; accuracy: number; level: number }) => void;
}) {
  const n = level;
  const [sequence] = useState<ColorItem[]>(() => {
    const total = NBACK_ROUNDS;
    const targetMatches = Math.round(total * 0.27);
    const seq: ColorItem[] = Array.from({ length: n }, () => colors[Math.floor(Math.random() * colors.length)]!);
    let matches = 0;
    for (let i = n; i < total; i++) {
      const remaining = total - i;
      const needed = targetMatches - matches;
      const forceMatch = needed > 0 && needed >= remaining;
      const forceNoMatch = needed <= 0;
      let doMatch: boolean;
      if (forceMatch) doMatch = true;
      else if (forceNoMatch) doMatch = false;
      else doMatch = Math.random() < 0.27;

      if (doMatch) {
        seq.push(seq[i - n]!);
        matches++;
      } else {
        const pool = colors.filter((c) => c.id !== seq[i - n]!.id);
        seq.push(pool.length ? pool[Math.floor(Math.random() * pool.length)]! : colors[0]!);
      }
    }
    return seq;
  });

  const [idx, setIdx] = useState(-1);
  const [phase, setPhase] = useState<'countdown' | 'show' | 'gap' | 'result'>('countdown');
  const [cdNum, setCdNum] = useState<number | null>(3);
  const [userMatches, setUserMatches] = useState<boolean[]>([]);
  const [didRespond, setDidRespond] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    let c = 3;
    if (audioMode !== 'off') tts('셋', true);
    const iv = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(iv);
        setCdNum(null);
        setPhase('show');
        setIdx(0);
        if (audioMode !== 'off') tts('시작!', true);
      } else {
        setCdNum(c);
        if (audioMode !== 'off') tts(c === 2 ? '둘' : '하나', true);
      }
    }, 900);
    return () => clearInterval(iv);
  }, [audioMode]);

  useEffect(() => {
    if (phase !== 'show' || idx < 0) return;
    clear();
    setDidRespond(false);
    const color = sequence[idx];
    if (color && audioMode !== 'off') tts(color.name, true);

    timerRef.current = setTimeout(() => {
      if (idx + 1 >= NBACK_ROUNDS) {
        setPhase('result');
        if (audioMode !== 'off') setTimeout(() => tts('훈련 완료! 수고했어요!', true), 300);
      } else {
        setPhase('gap');
        timerRef.current = setTimeout(() => {
          setIdx((i) => i + 1);
          setPhase('show');
        }, NBACK_GAP_MS);
      }
    }, NBACK_SHOW_MS);
    return clear;
  }, [phase, idx, sequence, audioMode]);

  const handleResponse = useCallback(() => {
    if (phase !== 'show' || didRespond || idx < n) return;
    setDidRespond(true);
    setUserMatches((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  }, [phase, didRespond, idx, n]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleResponse();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleResponse]);

  const scoring = () => {
    let hits = 0,
      misses = 0,
      falseAlarms = 0;
    for (let i = n; i < NBACK_ROUNDS; i++) {
      const isMatch = sequence[i]!.id === sequence[i - n]!.id;
      const responded = !!userMatches[i];
      if (isMatch && responded) hits++;
      else if (isMatch && !responded) misses++;
      else if (!isMatch && responded) falseAlarms++;
    }
    const total = NBACK_ROUNDS - n;
    const matchCount = sequence.slice(n).filter((c, i) => c.id === sequence[i]!.id).length;
    const accuracy = matchCount > 0 ? Math.round((hits / matchCount) * 100) : 0;
    return { hits, misses, falseAlarms, total, matchCount, accuracy };
  };

  const progress = idx >= 0 ? (idx + 1) / NBACK_ROUNDS : 0;
  const showingColor = phase === 'show' && idx >= 0 ? sequence[idx]! : null;
  const nBackColor = phase === 'show' && idx >= n ? sequence[idx - n]! : null;
  const isMatch = showingColor && nBackColor && showingColor.id === nBackColor.id;

  if (phase === 'countdown')
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <style>{CSS}</style>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>N-Back · {n}-Back</div>
        <div key={cdNum ?? 'go'} className="countdown-pop" style={{ fontSize: 'clamp(120px,28vw,220px)', fontWeight: 900, color: '#06B6D4', lineHeight: 1 }}>{cdNum ?? 'GO'}</div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.7 }}>{n}개 전 색과 지금 색이 같으면<br />화면을 터치하세요</div>
      </div>
    );

  if (phase === 'result') {
    const { hits, misses, falseAlarms, total, matchCount, accuracy } = scoring();
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#080C14', overflow: 'auto' }}>
        <style>{CSS}</style>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '2.5rem 1.5rem 4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ fontSize: '3.5rem' }}>🎯</div>
          <div style={{ fontWeight: 900, fontSize: 'clamp(1.5rem,5vw,2rem)', color: '#fff', textAlign: 'center' }}>{n}-Back 완료!</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: '100%' }}>
            {[
              ['정답 (Hit)', hits, '#22C55E'],
              ['놓침 (Miss)', misses, '#EF4444'],
              ['오반응', falseAlarms, '#F97316'],
              ['정확도', `${accuracy}%`, '#06B6D4'],
            ].map(([l, v, c]) => (
              <div key={String(l)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: c as string }}>{String(v)}</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem', fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '1rem', padding: '1rem 1.2rem', width: '100%', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.75 }}>총 {total}회 중 매치 {matchCount}회 · 반응 {hits + falseAlarms}회</div>
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            <button onClick={onExit} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '2px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' }}>🏠 홈</button>
            <button onClick={() => onComplete({ hits, misses, falseAlarms, accuracy, level: n })} style={{ flex: 2, padding: '1rem', borderRadius: '1rem', border: 'none', background: '#06B6D4', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(6,182,212,0.35)' }}>결과 저장</button>
          </div>
        </div>
      </div>
    );
  }

  const bg = phase === 'show' && showingColor ? showingColor.bg : '#0F172A';
  return (
    <div onClick={handleResponse} style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', cursor: 'pointer', transition: 'background 0.08s', userSelect: 'none' }}>
      <style>{CSS}</style>
      <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
        <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', padding: '0.6rem 1.2rem', color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: '#67E8F9' }}>🔁</span>
          <span>{Math.max(idx + 1, 0)} / {NBACK_ROUNDS}</span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span style={{ color: '#FCD34D', fontSize: '0.8rem' }}>{n}-Back</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onExit(); }} style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
      </div>
      {nBackColor && (
        <div style={{ position: 'absolute', top: '5.5rem', right: '1.5rem', zIndex: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>{n}개 전</div>
          <div style={{ width: 36, height: 36, borderRadius: '0.6rem', background: nBackColor.bg, border: '2px solid rgba(255,255,255,0.25)', boxShadow: `0 4px 14px ${nBackColor.bg}66` }} />
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{nBackColor.name}</div>
        </div>
      )}
      {showingColor && (
        <div key={`nb-${idx}`} className="mem-color-enter" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', userSelect: 'none' }}>
            <div style={{ fontSize: 'clamp(100px,24vw,260px)', fontWeight: 900, color: showingColor.bg === '#FACC15' ? '#111' : '#fff', lineHeight: 1, letterSpacing: '-0.03em', textShadow: '0 4px 60px rgba(0,0,0,0.25)' }}>{showingColor.name}</div>
          </div>
        </div>
      )}
      {phase === 'gap' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
        </div>
      )}
      {didRespond && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, pointerEvents: 'none' }}>
          <div style={{ fontSize: '5rem', animation: 'countdownPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>{isMatch ? '✅' : '❌'}</div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.08)', zIndex: 20 }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: '#06B6D4', transition: 'width 0.3s linear', borderRadius: '0 3px 3px 0' }} />
      </div>
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: '2rem', padding: '0.45rem 1.2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>같으면 화면 터치 · 스페이스바</div>
    </div>
  );
}
