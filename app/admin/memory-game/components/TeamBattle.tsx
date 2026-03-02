'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateSignal } from '../lib/signals';
import { getSignalVoice } from '../lib/audio';
import { tts } from '../lib/tts';
import { SignalDisplay } from './SignalDisplay';
import { CSS } from '../styles';

export function TeamBattle({
  teamA,
  teamB,
  targetScore,
  mode,
  level,
  audioMode,
  onExit,
  onComplete,
}: {
  teamA: string;
  teamB: string;
  targetScore: number;
  mode: string;
  level: number;
  audioMode: string;
  onExit: () => void;
  onComplete: (result: { scores: { A: number; B: number }; winner: string; round: number; teamA: string; teamB: string }) => void;
}) {
  const [scores, setScores] = useState({ A: 0, B: 0 });
  const [signal, setSignal] = useState<Record<string, unknown> | null>(null);
  const [signalKey, setSignalKey] = useState(0);
  const [phase, setPhase] = useState<'countdown' | 'live' | 'judging' | 'scored' | 'done'>('countdown');
  const [cdNum, setCdNum] = useState<number | null>(3);
  const [lastScorer, setLastScorer] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const prevBgRef = useRef<string | null>(null);

  const nextSignal = useCallback(() => {
    const sig = generateSignal(mode === 'team' ? 'basic' : mode, level);
    if (!sig) return;
    if (sig.type === 'full_color' && (sig.bg as string) === prevBgRef.current) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 80);
    }
    prevBgRef.current = (sig.bg as string) ?? null;
    setSignal(sig);
    setSignalKey((k) => k + 1);
    setPhase('judging');
    const voiceText = getSignalVoice(sig, mode === 'team' ? 'basic' : mode, level, audioMode);
    if (voiceText) tts(voiceText, true);
  }, [mode, level, audioMode]);

  useEffect(() => {
    let c = 3;
    if (audioMode !== 'off') tts('셋', true);
    const iv = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(iv);
        setCdNum(null);
        setPhase('live');
        nextSignal();
      } else {
        setCdNum(c);
        if (audioMode !== 'off') tts(c === 2 ? '둘' : '하나', true);
      }
    }, 900);
    return () => clearInterval(iv);
  }, [audioMode, nextSignal]);

  const score = useCallback(
    (team: 'A' | 'B') => {
      setLastScorer(team);
      setPhase('scored');
      setRound((r) => r + 1);
      setScores((prev) => {
        const next = { ...prev, [team]: prev[team] + 1 };
        if (next[team] >= targetScore) {
          setTimeout(() => {
            if (audioMode !== 'off') tts(`${team === 'A' ? teamA : teamB} 팀 승리!`, true);
            setPhase('done');
          }, 600);
        } else {
          setTimeout(() => nextSignal(), 1200);
        }
        return next;
      });
    },
    [targetScore, teamA, teamB, audioMode, nextSignal]
  );

  const teamColor = { A: '#3B82F6', B: '#EF4444' };
  const bg = flashing ? '#ffffff' : (signal?.bg as string) ?? '#0F172A';

  if (phase === 'countdown')
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.2rem' }}>
        <style>{CSS}</style>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: teamColor.A, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem', color: '#fff', margin: '0 auto 0.4rem' }}>{teamA[0]}</div>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>{teamA}</div>
          </div>
          <div style={{ fontWeight: 900, fontSize: '2rem', color: 'rgba(255,255,255,0.2)', alignSelf: 'center' }}>VS</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: teamColor.B, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.3rem', color: '#fff', margin: '0 auto 0.4rem' }}>{teamB[0]}</div>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>{teamB}</div>
          </div>
        </div>
        <div key={cdNum ?? 'go'} className="countdown-pop" style={{ fontSize: 'clamp(120px,28vw,200px)', fontWeight: 900, color: '#F97316', lineHeight: 1 }}>{cdNum ?? 'GO'}</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>먼저 콘을 터치한 팀이 득점<br />선생님이 좌·우 버튼으로 판정</div>
      </div>
    );

  if (phase === 'done') {
    const winner = scores.A >= targetScore ? 'A' : 'B';
    const winName = winner === 'A' ? teamA : teamB;
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
        <style>{CSS}</style>
        <div style={{ fontSize: '4rem' }}>🏆</div>
        <div style={{ fontWeight: 900, fontSize: 'clamp(1.8rem,6vw,2.5rem)', color: teamColor[winner as 'A' | 'B'], textAlign: 'center' }}>{winName} 팀 승리!</div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {(['A', 'B'] as const).map((t) => (
            <div key={t} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: t === winner ? teamColor[t] : 'rgba(255,255,255,0.4)' }}>{scores[t]}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{t === 'A' ? teamA : teamB}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: 360 }}>
          <button onClick={onExit} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '2px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' }}>🏠 홈</button>
          <button onClick={() => onComplete({ scores, winner, round, teamA, teamB })} style={{ flex: 2, padding: '1rem', borderRadius: '1rem', border: 'none', background: '#F97316', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' }}>결과 저장</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: bg, overflow: 'hidden', transition: flashing ? 'none' : 'background 0.06s' }}>
      <style>{CSS}</style>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', height: 'clamp(80px,18vw,110px)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        {(['A', 'B'] as const).map((t) => (
          <div key={t} style={{ flex: 1, background: phase === 'scored' && lastScorer === t ? teamColor[t] : `${teamColor[t]}22`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.15rem', borderBottom: `3px solid ${teamColor[t]}`, transition: 'background 0.3s' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: phase === 'scored' && lastScorer === t ? '#fff' : teamColor[t], letterSpacing: '0.06em' }}>{t === 'A' ? teamA : teamB}</div>
            <div style={{ fontSize: 'clamp(2rem,7vw,3rem)', fontWeight: 900, color: phase === 'scored' && lastScorer === t ? '#fff' : teamColor[t], lineHeight: 1 }}>{scores[t]}</div>
          </div>
        ))}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: '0.75rem', padding: '0.3rem 0.7rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>목표</div>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{targetScore}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, paddingTop: 'clamp(80px,18vw,110px)' }}>
        <SignalDisplay signal={signal} animKey={signalKey} />
      </div>
      {(phase === 'judging' || phase === 'scored') && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, display: 'flex', gap: 0, height: 'clamp(80px,20vw,120px)' }}>
          {(['A', 'B'] as const).map((t) => (
            <button
              key={t}
              onClick={() => phase === 'judging' && score(t)}
              style={{
                flex: 1,
                border: 'none',
                background: phase === 'scored' && lastScorer === t ? teamColor[t] : `${teamColor[t]}CC`,
                color: '#fff',
                fontWeight: 900,
                fontSize: 'clamp(1rem,3.5vw,1.4rem)',
                cursor: phase === 'judging' ? 'pointer' : 'default',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background 0.2s',
              }}
            >
              {phase === 'scored' && lastScorer === t && <span style={{ fontSize: '1.4rem' }}>+1</span>}
              {t === 'A' ? teamA : teamB} 득점
            </button>
          ))}
        </div>
      )}
      <button onClick={onExit} style={{ position: 'absolute', top: 'clamp(88px,20vw,118px)', right: '1rem', zIndex: 25, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.75rem', padding: '0.5rem 0.9rem', color: '#fff', fontSize: '1rem', cursor: 'pointer', fontWeight: 700 }}>✕</button>
    </div>
  );
}
