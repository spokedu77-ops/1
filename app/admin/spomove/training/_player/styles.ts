/**
 * SPOKEDU 실행 화면 공통 CSS
 */

import { scopePlayerCss } from './lib/scopePlayerCss';

export const CSS = scopePlayerCss(`
  :root {
    --bg: #F1F5F9; --card: #ffffff; --border: #E2E8F0;
    --text: #1E293B; --text-muted: #64748B;
    --subtle-bg: #F8FAFC;
    --range-track: #CBD5E1;
    --range-tick: #94A3B8;
  }
  [data-theme="dark"] {
    --bg: #0F172A; --card: #1E293B; --border: #334155;
    --text: #F1F5F9; --text-muted: #94A3B8;
    --subtle-bg: rgba(255,255,255,0.06);
    --range-track: rgba(255,255,255,0.22);
    --range-tick: rgba(255,255,255,0.45);
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

  @keyframes signalArrowResetPulse {
    0%   { opacity: 0; transform: scale(0.82); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
    28%  { opacity: 0; transform: scale(0.82); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
    72%  { opacity: 1; transform: scale(1.055); filter: drop-shadow(0 0 38px rgba(255,255,255,0.5)); }
    100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 10px 48px rgba(0,0,0,0.5)); }
  }
  .signal-arrow-reset-pulse {
    animation: signalArrowResetPulse 0.19s cubic-bezier(0.18, 0.88, 0.2, 1) both;
    transform-origin: center;
    will-change: opacity, transform, filter;
  }

  /** 연속 동일 색(전면·사분할): 한 번만 은은하게 덮어 “같은 자극”을 인지 (고휘도 다중 펄스는 눈부심) */
  @keyframes trainingDupSalienceOverlay {
    0%   { opacity: 0; background: transparent; }
    32%  { opacity: 1; background: rgba(248, 250, 252, 0.5); }
    100% { opacity: 0; background: transparent; }
  }
  .training-dup-salience-overlay {
    animation: trainingDupSalienceOverlay 0.32s cubic-bezier(0.33, 0, 0.2, 1) both;
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes trainingDupSalienceOverlayReduced {
      0%   { opacity: 0; background: transparent; }
      38%  { opacity: 1; background: rgba(248, 250, 252, 0.42); }
      100% { opacity: 0; background: transparent; }
    }
    .training-dup-salience-overlay {
      animation: trainingDupSalienceOverlayReduced 0.18s ease-out both;
    }
  }

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

  input[type=range] { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 4px; background: var(--range-track); outline: none; cursor: pointer; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #F97316; cursor: pointer; box-shadow: 0 2px 8px rgba(249,115,22,0.35); }
  input[type=range]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #F97316; cursor: pointer; border: none; }

  @media (min-width: 768px) {
    .home-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .home-wrap { max-width: 560px !important; }
    .card-wide { max-width: 42rem !important; }
    .setup-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
  /* Keep the desktop composition away from the 1024px scrollbar/fullscreen boundary. */
  @media (min-width: 1100px) {
    .home-desktop { flex-direction: row !important; align-items: center !important; max-width: 1100px !important; gap: 5rem !important; }
    .home-left { flex: 1; }
    .home-right { width: 380px; flex-shrink: 0; }
    .home-wrap { max-width: 1100px !important; justify-content: center !important; min-height: 100dvh !important; }
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
`);
