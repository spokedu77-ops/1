/**
 * SPOKEDU 공통 스타일 객체 + CSS 문자열
 */

import type { CSSProperties } from 'react';

export const S: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", color: 'var(--text)', display: 'flex', flexDirection: 'column' },
  homeWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem 1.5rem', gap: '2rem' },
  h1: { fontSize: 'clamp(2.8rem,11vw,5rem)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1, margin: 0, textAlign: 'center' },
  tag: { fontSize: 'clamp(1.05rem,3.5vw,1.45rem)', fontWeight: 700, color: '#F97316', letterSpacing: '0.1em', marginTop: '0.5rem', textAlign: 'center' },
  desc: { fontSize: 'clamp(0.95rem,2.3vw,1.12rem)', color: 'var(--text-muted)', marginTop: '1rem', lineHeight: 1.8, fontWeight: 500, textAlign: 'center' },
  scroll: { display: 'flex', justifyContent: 'center', padding: 'clamp(1rem,4vw,2rem) clamp(0.75rem,3vw,1.5rem) 4rem', minHeight: '100vh' },
  card: { background: 'var(--card)', borderRadius: 'clamp(1.2rem,3vw,1.75rem)', padding: 'clamp(1.2rem,5vw,2.4rem)', maxWidth: 'clamp(20rem,90vw,34rem)', width: '100%', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', border: '1px solid var(--border)', alignSelf: 'flex-start' },
  ctitle: { fontSize: 'clamp(1.4rem,5vw,1.85rem)', fontWeight: 900, color: 'var(--text)', marginBottom: '0.45rem', marginTop: '1.1rem' },
  csub: { color: 'var(--text-muted)', fontWeight: 500, marginBottom: '1.6rem', fontSize: '1rem', lineHeight: 1.6 },
  back: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, padding: '0.2rem 0', fontFamily: 'inherit' },
  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem 1.6rem', borderRadius: '1rem', border: 'none', cursor: 'pointer', fontSize: 'clamp(1rem,2.7vw,1.12rem)', fontWeight: 700, transition: 'opacity 0.12s, transform 0.12s', fontFamily: 'inherit' },
  bPrimary: { background: '#F97316', color: '#fff', boxShadow: '0 6px 20px rgba(249,115,22,0.28)' },
  bSecondary: { background: 'var(--card)', color: 'var(--text)', border: '2px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  bDark: { background: '#1E293B', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.17)' },
  sec: { marginBottom: '1.7rem' },
  slabel: { fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.75rem' },
};

export const CSS = `
  :root {
    --bg: #F1F5F9; --card: #ffffff; --border: #E2E8F0;
    --text: #1E293B; --text-muted: #64748B;
  }
  [data-theme="dark"] {
    --bg: #0F172A; --card: #1E293B; --border: #334155;
    --text: #F1F5F9; --text-muted: #94A3B8;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { overscroll-behavior: none; }
  button:hover { opacity: 0.85; }
  button:active { transform: scale(0.96) !important; }

  @keyframes signalBlink {
    0%   { opacity: 0; }
    18%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .signal-blink { animation: signalBlink 0.18s ease-out forwards; }

  @keyframes memColorEnter {
    0%   { opacity: 0; transform: scale(0.88); }
    60%  { opacity: 1; transform: scale(1.04); }
    100% { opacity: 1; transform: scale(1); }
  }
  .mem-color-enter { animation: memColorEnter 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards; }

  @keyframes answerPop {
    0%   { opacity: 0; transform: translateY(14px) scale(0.88); }
    70%  { transform: translateY(-2px) scale(1.04); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  .answer-pop { animation: answerPop 0.32s cubic-bezier(0.34,1.56,0.64,1) both; }

  @keyframes countdownPop {
    0%   { transform: scale(0.3); opacity: 0; }
    65%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); }
  }
  .countdown-pop { animation: countdownPop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }

  input[type=range] { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 4px; background: #CBD5E1; outline: none; cursor: pointer; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #F97316; cursor: pointer; box-shadow: 0 2px 8px rgba(249,115,22,0.35); }
  input[type=range]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #F97316; cursor: pointer; border: none; }

  @media (min-width: 768px) {
    .home-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .home-wrap { max-width: 560px !important; }
    .card-wide { max-width: 42rem !important; }
    .setup-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (min-width: 1024px) {
    .home-desktop { flex-direction: row !important; align-items: center !important; max-width: 1100px !important; gap: 5rem !important; }
    .home-left { flex: 1; }
    .home-right { width: 380px; flex-shrink: 0; }
    .home-wrap { max-width: 1100px !important; justify-content: center !important; min-height: 100vh !important; }
    .card-wide { max-width: 48rem !important; }
  }
  @media (orientation: landscape) and (max-height: 600px) {
    .landscape-compact { flex-direction: row !important; align-items: center !important; }
    .landscape-hide { display: none !important; }
    .mem-game-full { padding: 0.5rem !important; }
  }
  @media (hover: none) { button:hover { opacity: 1; } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .home-fadein { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
  .home-fadein-1 { animation: fadeUp 0.55s 0.07s cubic-bezier(0.22,1,0.36,1) both; }
  .home-fadein-2 { animation: fadeUp 0.55s 0.14s cubic-bezier(0.22,1,0.36,1) both; }
  .home-fadein-3 { animation: fadeUp 0.55s 0.21s cubic-bezier(0.22,1,0.36,1) both; }
`;
