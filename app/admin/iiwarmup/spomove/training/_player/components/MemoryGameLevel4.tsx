'use client';

import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { generateLevel4Pattern, Level4Item } from '../lib/signals';
import { playBeep } from '../lib/audio';
import { CSS } from '../styles';

const TOTAL = 10;
const QA_COUNT = 5;

type L4Phase = 'idle' | 'showing' | 'qa_ready' | 'qa_question' | 'qa_answer' | 'done';

export function MemoryGameLevel4({
  onExit,
  onComplete,
  audioMode,
  speedSec,
  startDelayMs = 600,
}: {
  onExit: () => void;
  onComplete: () => void;
  audioMode: string;
  speedSec: number;
  startDelayMs?: number;
}) {
  const [items] = useState<Level4Item[]>(() => generateLevel4Pattern());
  const [showIdx, setShowIdx] = useState(-1);
  const [memFlash, setMemFlash] = useState(false);
  const [phase, setPhase] = useState<L4Phase>('idle');
  const [qaItems, setQaItems] = useState<Level4Item[]>([]);
  const [qaIdx, setQaIdx] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevColorRef = useRef<string | null>(null);
  const phaseRef = useRef<L4Phase>('idle');
  const qaIdxRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { qaIdxRef.current = qaIdx; }, [qaIdx]);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const showMs = Math.max(100, Math.round((Number(speedSec) || 1) * 1000));

  const runSequence = useCallback((idx: number) => {
    if (idx >= TOTAL) {
      prevColorRef.current = null;
      // 10개 중 5개 랜덤 선택 (인덱스 셔플)
      // 주의: sort(() => Math.random() - 0.5)는 편향이 있을 수 있어 Fisher–Yates로 셔플
      const indices = Array.from({ length: TOTAL }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j]!, indices[i]!];
      }
      const shuffled = indices.slice(0, QA_COUNT);
      setQaItems(shuffled.map((i) => items[i]!));
      setQaIdx(0);
      setPhase('qa_ready');
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
        timerRef.current = setTimeout(() => runSequence(idx + 1), showMs);
      }, 100);
    } else {
      if (audioMode === 'beep') playBeep('blip');
      setShowIdx(idx);
      setPhase('showing');
      timerRef.current = setTimeout(() => runSequence(idx + 1), showMs);
    }
  }, [items, audioMode, showMs]);

  useLayoutEffect(() => {
    if (startDelayMs !== 0) return;
    runSequence(0);
    return clear;
  }, [runSequence, startDelayMs]);

  useEffect(() => {
    if (startDelayMs === 0) return;
    timerRef.current = setTimeout(() => runSequence(0), Math.max(0, startDelayMs));
    return clear;
  }, [runSequence, startDelayMs]);

  const handleAction = useCallback(() => {
    const p = phaseRef.current;
    const qi = qaIdxRef.current;
    if (p === 'qa_ready') {
      setPhase('qa_question');
    } else if (p === 'qa_question') {
      setPhase('qa_answer');
    } else if (p === 'qa_answer') {
      if (qi + 1 >= QA_COUNT) {
        setPhase('done');
      } else {
        setQaIdx(qi + 1);
        setPhase('qa_question');
      }
    } else if (p === 'done') {
      onComplete();
    }
  }, [onComplete]);

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

  const currentItem = showIdx >= 0 ? items[showIdx] : null;
  const currentQA = qaItems[qaIdx];

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
        {(phase === 'qa_ready' || phase === 'qa_question' || phase === 'qa_answer') && (
          <>
            <span>Q {qaIdx + 1} / {QA_COUNT}</span>
            <span style={{ opacity: 0.35, margin: '0 0.1rem' }}>|</span>
          </>
        )}
        <span style={{ color: '#FCD34D' }}>4번</span>
      </div>
      <button onClick={onExit} style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
    </div>
  );

  const progressBar = (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'rgba(255,255,255,0.08)', zIndex: 20 }}>
      <div style={{ height: '100%', width: `${progressPct}%`, background: '#22C55E', transition: 'width 0.5s ease', borderRadius: '0 3px 3px 0' }} />
    </div>
  );

  // ── idle (준비 or 동일 색 플래시) ──
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

  // ── showing (색깔 + 번호 표시) ──
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
            <div key={`l4-${showIdx}`} className="mem-color-enter" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  // ── qa_ready (Q&A 시작 전 안내) ──
  if (phase === 'qa_ready')
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden', zIndex: 300 }}>
        <style>{CSS}</style>
        {hud}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem' }}>
          <div style={{ fontSize: '4rem' }}>🎯</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.6rem,5vw,2.2rem)', fontWeight: 900, color: '#fff', marginBottom: '0.6rem' }}>다 봤어요!</div>
            <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500, lineHeight: 1.7 }}>이제 {QA_COUNT}가지 번호별 색깔을<br />맞혀볼 시간이에요</div>
          </div>
          <button onClick={handleAction} style={{ background: '#22C55E', color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.1rem 2.8rem', fontSize: 'clamp(1rem,3vw,1.3rem)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 28px rgba(34,197,94,0.4)' }}>
            질문 시작 →
          </button>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>클릭 · 스페이스바 · 엔터</div>
        </div>
      </div>
    );

  // ── qa_question (질문 화면) ──
  if (phase === 'qa_question' && currentQA)
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden', zIndex: 300 }}>
        <style>{CSS}</style>
        {hud}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', padding: '6rem 2rem 4rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              질문 {qaIdx + 1} / {QA_COUNT}
            </div>
            <div style={{ fontSize: 'clamp(1.5rem,5vw,2.8rem)', fontWeight: 900, color: '#fff', lineHeight: 1.35 }}>
              <span style={{ color: '#FCD34D', fontSize: 'clamp(2rem,6vw,3.5rem)' }}>숫자 {currentQA.num}</span>은<br />무슨 색깔이었을까요?
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', marginTop: '1rem', fontWeight: 500 }}>
              학생이 먼저 말하면 정답을 확인하세요
            </div>
          </div>
          <button onClick={handleAction} style={{ background: '#22C55E', color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.1rem 2.8rem', fontSize: 'clamp(1rem,3vw,1.3rem)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 28px rgba(34,197,94,0.4)' }}>
            정답 공개
          </button>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>클릭 · 스페이스바 · 엔터</div>
        </div>
      </div>
    );

  // ── qa_answer (정답 공개) ──
  if (phase === 'qa_answer' && currentQA) {
    const isLast = qaIdx + 1 >= QA_COUNT;
    const isYellow = currentQA.color.bg === '#FACC15';
    const nextBg = isLast ? '#22C55E' : '#F97316';
    const nextShadow = isLast ? '0 8px 28px rgba(34,197,94,0.4)' : '0 8px 28px rgba(249,115,22,0.35)';
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0F172A', overflow: 'hidden', zIndex: 300 }}>
        <style>{CSS}</style>
        {hud}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '6rem 2rem 4rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {currentQA.num}번 정답
          </div>
          <div className="answer-pop" style={{ width: 'clamp(110px,25vw,180px)', height: 'clamp(110px,25vw,180px)', borderRadius: '2rem', background: currentQA.color.bg, boxShadow: `0 12px 48px ${currentQA.color.bg}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.2)' }}>
            <span style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: isYellow ? '#111' : '#fff' }}>{currentQA.num}</span>
          </div>
          <div style={{ fontSize: 'clamp(1.6rem,5vw,2.8rem)', fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>
            {currentQA.num}번은{' '}
            <span style={{ color: isYellow ? '#FACC15' : currentQA.color.bg, filter: isYellow ? 'none' : `drop-shadow(0 0 12px ${currentQA.color.bg})` }}>
              {currentQA.color.name}
            </span>
            이었습니다!
          </div>
          <button onClick={handleAction} style={{ background: nextBg, color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.1rem 2.8rem', fontSize: 'clamp(1rem,3vw,1.3rem)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: nextShadow }}>
            {isLast ? '🎉 완료' : `▶ 다음 (${qaIdx + 2} / ${QA_COUNT})`}
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
            {QA_COUNT}개 질문에 모두 답했습니다.<br />색깔-번호 기억 훈련 완료!
          </div>
          <button onClick={handleAction} style={{ background: '#22C55E', color: '#fff', border: 'none', borderRadius: '1.25rem', padding: '1.2rem 3rem', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}>
            결과 보기
          </button>
        </div>
      </div>
    );

  return null;
}
