'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const COLOR_OPTIONS = [
  { id: 'red', label: '빨강', hex: '#FF3B3B' },
  { id: 'orange', label: '주황', hex: '#FF6B00' },
  { id: 'yellow', label: '노랑', hex: '#F5C800' },
  { id: 'green', label: '초록', hex: '#00C853' },
  { id: 'blue', label: '파랑', hex: '#0A84FF' },
];

const ARROW_OPTIONS = [
  { id: 'up_left', label: '좌상', angle: -135 },
  { id: 'up', label: '상', angle: 0 },
  { id: 'up_right', label: '우상', angle: 45 },
  { id: 'left', label: '좌', angle: -90 },
  { id: 'down_left', label: '좌하', angle: -225 },
  { id: 'down', label: '하', angle: 180 },
  { id: 'down_right', label: '우하', angle: 135 },
  { id: 'right', label: '우', angle: 90 },
];

const NUMBER_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

const TIME_OPTIONS = [
  { label: '1:00', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2:00', value: 120 },
  { label: '2:30', value: 150 },
  { label: '3:00', value: 180 },
];

const STEP_META = {
  1: {
    title: '자극 설정',
    subtitle: '훈련에 표시할 시각 자극을 선택하세요',
    eyebrow: 'Stimulus',
  },
  2: {
    title: '진행 방식',
    subtitle: '자극 전환 방식을 설정하세요',
    eyebrow: 'Transition',
  },
  3: {
    title: '타임라인',
    subtitle: '1세트의 길이를 결정하세요',
    eyebrow: 'Timeline',
  },
  4: {
    title: '세트 구성',
    subtitle: '반복 횟수를 설정하면 준비 완료입니다',
    eyebrow: 'Session',
  },
} as const;

const DEFAULT_GAME_BG = 'radial-gradient(circle at top, rgba(200,255,0,0.08), transparent 36%), linear-gradient(180deg, #08090C 0%, #0D1015 100%)';
const ARROW_ONLY_BG = 'radial-gradient(circle at 50% 18%, rgba(200,255,0,0.22), transparent 28%), linear-gradient(180deg, #F8FAF3 0%, #E8ECD9 100%)';
const NUMBER_BG = 'radial-gradient(circle at top, rgba(10,132,255,0.16), transparent 32%), linear-gradient(180deg, #070B11 0%, #0D1219 100%)';

const CSS = `
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard-dynamic-subset.css');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #090A0E;
  --bg-2: #0F1118;
  --bg-3: #121520;
  --card: rgba(19, 21, 31, 0.88);
  --card-2: rgba(24, 27, 38, 0.9);
  --card-3: rgba(31, 35, 50, 0.92);
  --line: rgba(255,255,255,0.08);
  --line-2: rgba(255,255,255,0.12);
  --line-3: rgba(255,255,255,0.18);
  --text: #F4F6FB;
  --text-2: rgba(244,246,251,0.68);
  --text-3: rgba(244,246,251,0.34);
  --accent: #C8FF00;
  --accent-2: #E1FF70;
  --accent-soft: rgba(200,255,0,0.10);
  --accent-line: rgba(200,255,0,0.28);
  --shadow: 0 10px 30px rgba(0,0,0,0.32);
  --radius-xl: 24px;
  --radius-lg: 18px;
  --radius-md: 14px;
  --radius-sm: 10px;
}

html, body, #root {
  min-height: 100%;
  background:
    radial-gradient(circle at top, rgba(200,255,0,0.08), transparent 24%),
    radial-gradient(circle at bottom right, rgba(10,132,255,0.10), transparent 32%),
    linear-gradient(180deg, #07080C 0%, #0B0D13 100%);
  color: var(--text);
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

button, input {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

.spm-page {
  min-height: 100vh;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 18px 16px 116px;
  position: relative;
}

.spm-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 0% 0%, rgba(200,255,0,0.05), transparent 24%),
    radial-gradient(circle at 100% 0%, rgba(255,255,255,0.04), transparent 18%),
    radial-gradient(circle at 100% 100%, rgba(10,132,255,0.05), transparent 26%);
}

.spm-topbar {
  position: sticky;
  top: 14px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 16px;
  padding: 18px 18px 16px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(13, 15, 22, 0.78);
  backdrop-filter: blur(18px);
  box-shadow: var(--shadow);
}

.spm-tb-row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}

.spm-wordmark {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.24em;
  color: var(--text-3);
  text-transform: uppercase;
}

.spm-wordmark::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 18px rgba(200,255,0,0.5);
}

.spm-step-counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 62px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.04);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-2);
  letter-spacing: 0.08em;
}

.spm-prog-track {
  display: flex;
  gap: 8px;
}

.spm-prog-seg {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
  position: relative;
}

.spm-prog-seg::after {
  content: '';
  display: block;
  height: 100%;
  width: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%);
  box-shadow: 0 0 20px rgba(200,255,0,0.42);
  transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.spm-prog-seg.on::after {
  width: 100%;
}

.spm-step-head {
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
  padding: 26px 22px 22px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(200,255,0,0.12), transparent 28%),
    linear-gradient(180deg, rgba(24, 27, 38, 0.94) 0%, rgba(14, 16, 24, 0.94) 100%);
  box-shadow: var(--shadow);
}

.spm-step-head::after {
  content: '';
  position: absolute;
  right: -56px;
  top: -60px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200,255,0,0.18), transparent 70%);
  pointer-events: none;
}

.spm-step-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(200,255,0,0.16);
  background: rgba(200,255,0,0.08);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.spm-step-title {
  font-family: 'Outfit', 'Pretendard', sans-serif;
  font-weight: 800;
  font-size: clamp(32px, 7.4vw, 40px);
  line-height: 1;
  letter-spacing: -0.02em;
  margin-bottom: 10px;
}

.spm-step-sub {
  max-width: 340px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--text-2);
}

.spm-tab-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.spm-tab-btn {
  flex: 1;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255,255,255,0.02);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.spm-tab-btn:hover {
  transform: translateY(-1px);
  border-color: var(--line-3);
  color: var(--text);
}

.spm-tab-btn.on {
  color: #10120E;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  border-color: transparent;
  box-shadow: 0 10px 24px rgba(200,255,0,0.14);
}

.spm-blk {
  position: relative;
  overflow: hidden;
  margin-bottom: 14px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(20, 23, 33, 0.94) 0%, rgba(13, 15, 23, 0.94) 100%);
  box-shadow: var(--shadow);
}

.spm-blk::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.03), transparent 34%);
  pointer-events: none;
}

.spm-blk-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 16px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--text-3);
}

.spm-blk-label::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.22);
}

.spm-color-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.spm-csw {
  position: relative;
  height: 54px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  cursor: pointer;
  outline: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
}

.spm-csw::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.18), transparent 44%);
}

.spm-csw:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(0,0,0,0.18);
}

.spm-csw.on {
  border-color: rgba(255,255,255,0.76);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.08), 0 14px 26px rgba(0,0,0,0.26);
}

.spm-grid4, .spm-grid5 {
  display: grid;
  gap: 10px;
}

.spm-grid4 {
  grid-template-columns: repeat(4, 1fr);
}

.spm-grid5 {
  grid-template-columns: repeat(5, 1fr);
}

.spm-sym {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(33,36,49,0.84) 0%, rgba(23,25,35,0.92) 100%);
  color: var(--text-2);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  outline: none;
}

.spm-sym:hover {
  transform: translateY(-1px);
  border-color: var(--line-3);
  color: var(--text);
  box-shadow: 0 10px 22px rgba(0,0,0,0.18);
}

.spm-sym.on {
  color: #0B0D0A;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  border-color: transparent;
  box-shadow: 0 10px 24px rgba(200,255,0,0.15);
}

.spm-sym.mono {
  font-family: 'Outfit', sans-serif;
  font-size: 20px;
  font-weight: 800;
}

.spm-arrow-tile-icon {
  width: 28px;
  height: 28px;
}

.spm-tog-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
}

.spm-tog-text h4 {
  font-family: 'Outfit', 'Pretendard', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 6px;
}

.spm-tog-text p {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-2);
}

.spm-sw {
  position: relative;
  width: 52px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid var(--line-2);
  background: rgba(255,255,255,0.07);
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.spm-sw.on {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  border-color: transparent;
  box-shadow: 0 10px 18px rgba(200,255,0,0.14);
}

.spm-sw-k {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255,255,255,0.86);
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), background 0.18s ease;
}

.spm-sw.on .spm-sw-k {
  transform: translateX(22px);
  background: #11140B;
}

.spm-tog-hint {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid var(--accent-line);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(200,255,0,0.12) 0%, rgba(200,255,0,0.07) 100%);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  color: var(--accent-2);
}

.spm-opt-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.spm-opt {
  position: relative;
  overflow: hidden;
  min-height: 108px;
  padding: 18px 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(31,35,48,0.82) 0%, rgba(19,22,31,0.92) 100%);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  text-align: left;
}

.spm-opt:hover {
  transform: translateY(-1px);
  border-color: var(--line-3);
}

.spm-opt.on {
  border-color: rgba(200,255,0,0.34);
  background: linear-gradient(180deg, rgba(200,255,0,0.15) 0%, rgba(26,31,18,0.94) 100%);
  box-shadow: 0 12px 24px rgba(200,255,0,0.09);
}

.spm-opt h4 {
  font-family: 'Outfit', 'Pretendard', sans-serif;
  font-size: 15px;
  font-weight: 800;
  margin-bottom: 6px;
  color: var(--text);
}

.spm-opt.on h4 {
  color: var(--accent-2);
}

.spm-opt p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

.spm-sl-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.spm-sl-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}

.spm-sl-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.spm-sl-val {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 15px;
  color: var(--accent);
}

.spm-range {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  outline: none;
  background: linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.18) 100%);
  cursor: pointer;
}

.spm-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #10120E;
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(200,255,0,0.14);
  transition: transform 0.14s ease;
}

.spm-range::-webkit-slider-thumb:hover {
  transform: scale(1.08);
}

.spm-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spm-pill {
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.04);
  color: var(--text-2);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.spm-pill:hover {
  transform: translateY(-1px);
  border-color: var(--line-3);
  color: var(--text);
}

.spm-pill.on {
  color: #0B0D0A;
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  box-shadow: 0 10px 24px rgba(200,255,0,0.14);
}

.spm-set-big {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 22px;
}

.spm-set-n {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  font-size: clamp(84px, 20vw, 100px);
  line-height: 0.88;
  letter-spacing: -0.02em;
}

.spm-set-unit {
  font-family: 'Outfit', sans-serif;
  padding-bottom: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.spm-sum-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spm-sum-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  background: rgba(255,255,255,0.03);
}

.spm-sum-k {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.spm-sum-v,
.spm-sum-va {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.spm-sum-v {
  color: var(--text);
}

.spm-sum-va {
  color: var(--accent);
}

.spm-foot {
  position: fixed;
  left: 50%;
  bottom: 18px;
  z-index: 30;
  width: min(calc(100% - 24px), 492px);
  transform: translateX(-50%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(12, 14, 20, 0.82);
  backdrop-filter: blur(18px);
  box-shadow: var(--shadow);
}

.spm-btn-back,
.spm-btn-next,
.spm-btn-cta,
.spm-g-quit {
  border: none;
  cursor: pointer;
}

.spm-btn-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  color: var(--text-2);
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: color 0.18s ease, transform 0.18s ease;
}

.spm-btn-back:hover {
  color: var(--text);
  transform: translateX(-1px);
}

.spm-btn-next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 16px;
  color: #0B0D0A;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  box-shadow: 0 12px 24px rgba(200,255,0,0.14);
}

.spm-btn-next:hover {
  transform: translateY(-1px);
}

.spm-btn-next:active,
.spm-btn-cta:active {
  transform: scale(0.98);
}

.spm-btn-next:disabled {
  background: rgba(255,255,255,0.06);
  color: var(--text-3);
  box-shadow: none;
  cursor: not-allowed;
}

.spm-game {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: background 0.12s ease, background-image 0.12s ease;
}

.spm-g-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.12) 70%, rgba(0,0,0,0.26) 100%),
    linear-gradient(180deg, rgba(255,255,255,0.04), transparent 20%);
}

.spm-g-grid {
  position: absolute;
  inset: 0;
  opacity: 0.2;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 25%, transparent 82%);
}

.spm-g-hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px;
  pointer-events: none;
}

.spm-hud-pill,
.spm-hud-time {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(6,7,10,0.26);
  backdrop-filter: blur(14px);
  color: rgba(255,255,255,0.85);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.spm-hud-pill {
  font-size: 13px;
}

.spm-hud-time {
  font-size: 20px;
  font-weight: 800;
}

.spm-g-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 320px;
  min-height: 320px;
  padding: 24px;
}

.spm-g-stage::before {
  content: '';
  position: absolute;
  width: min(64vw, 420px);
  height: min(64vw, 420px);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.10), transparent 64%);
  filter: blur(8px);
}

.spm-s-arr-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(54vw, 320px);
  height: min(54vw, 320px);
}

.spm-s-arr {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 12px 28px rgba(0,0,0,0.18));
}

.spm-s-num {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(140px, 28vw, 280px);
  font-weight: 900;
  line-height: 0.88;
  letter-spacing: -0.02em;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 14px 26px rgba(0,0,0,0.18);
}

.spm-g-hint {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  white-space: nowrap;
  pointer-events: none;
}

.spm-g-quit {
  position: absolute;
  right: 22px;
  bottom: 22px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(6,7,10,0.28);
  backdrop-filter: blur(12px);
  color: rgba(255,255,255,0.62);
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.spm-g-quit:hover {
  color: rgba(255,255,255,0.92);
  border-color: rgba(255,255,255,0.18);
}

.spm-inter {
  min-height: 100vh;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 20px 16px 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.spm-inter-card {
  position: relative;
  overflow: hidden;
  padding: 28px 22px 24px;
  border: 1px solid var(--line);
  border-radius: 30px;
  background:
    radial-gradient(circle at top right, rgba(200,255,0,0.12), transparent 28%),
    linear-gradient(180deg, rgba(24, 27, 38, 0.96) 0%, rgba(12, 14, 20, 0.96) 100%);
  box-shadow: var(--shadow);
}

.spm-i-eyebrow {
  display: inline-flex;
  margin-bottom: 18px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(200,255,0,0.16);
  background: rgba(200,255,0,0.08);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 11px;
  color: var(--accent);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.spm-i-h {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(42px, 12vw, 54px);
  font-weight: 800;
  line-height: 0.96;
  letter-spacing: -0.02em;
  margin-bottom: 14px;
}

.spm-i-p {
  max-width: 320px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--text-2);
}

.spm-inter-bottom {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.spm-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.spm-stat-c {
  padding: 20px 18px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(20,23,33,0.94) 0%, rgba(13,15,23,0.94) 100%);
  box-shadow: var(--shadow);
}

.spm-stat-n {
  font-family: 'Outfit', sans-serif;
  font-size: 46px;
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.spm-stat-l {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.spm-btn-cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px;
  border-radius: 18px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.spm-cta-w {
  color: #0B0D0A;
  background: linear-gradient(135deg, #FFFFFF 0%, #E8ECF3 100%);
}

.spm-cta-ac {
  color: #0B0D0A;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  box-shadow: 0 12px 24px rgba(200,255,0,0.14);
}

.spm-wrap {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow-y: auto;
  background:
    radial-gradient(circle at top, rgba(200,255,0,0.08), transparent 24%),
    radial-gradient(circle at bottom right, rgba(10,132,255,0.10), transparent 32%),
    linear-gradient(180deg, #07080C 0%, #0B0D13 100%);
  color: var(--text);
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
}

@media (max-width: 380px) {
  .spm-page, .spm-inter {
    padding-left: 12px;
    padding-right: 12px;
  }

  .spm-topbar,
  .spm-step-head,
  .spm-blk,
  .spm-foot,
  .spm-inter-card,
  .spm-stat-c {
    border-radius: 20px;
  }

  .spm-color-strip {
    gap: 8px;
  }

  .spm-grid4,
  .spm-grid5,
  .spm-opt-grid {
    gap: 8px;
  }

  .spm-sym {
    min-height: 56px;
  }
}
`;

const L = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const R = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const PlayIco = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
);

const RefreshIco = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

function ArrowGlyph({
  angle = 0,
  size = 28,
  color = 'currentColor',
  className = '',
  strokeWidth = 5,
}: {
  angle?: number;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ color, transform: `rotate(${angle}deg)` }}
      aria-hidden="true"
    >
      <path d="M32 50V18" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M20 30L32 18L44 30" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getColorHex(colorId: string) {
  return COLOR_OPTIONS.find((c) => c.id === colorId)?.hex || '#333';
}

function getArrowMeta(arrowId: string) {
  return ARROW_OPTIONS.find((a) => a.id === arrowId) || ARROW_OPTIONS[1];
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

type Stimulus =
  | { type: 'stroop'; colorVal: string; fgType: 'arrow' | 'number'; fgVal: string | number }
  | { type: 'color'; val: string }
  | { type: 'arrow'; val: string }
  | { type: 'number'; val: number };

function TopBar({ step }: { step: number }) {
  return (
    <div className="spm-topbar">
      <div className="spm-tb-row1">
        <div className="spm-wordmark">SPOMOVE</div>
        <div className="spm-step-counter">{step} / 4</div>
      </div>
      <div className="spm-prog-track">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className={`spm-prog-seg ${step >= item ? 'on' : ''}`} />
        ))}
      </div>
    </div>
  );
}

function StepHead({ step }: { step: 1 | 2 | 3 | 4 }) {
  const meta = STEP_META[step];
  return (
    <div className="spm-step-head">
      <div className="spm-step-eyebrow">{meta.eyebrow}</div>
      <div className="spm-step-title">{meta.title}</div>
      <div className="spm-step-sub">{meta.subtitle}</div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="spm-blk">
      <div className="spm-blk-label">{label}</div>
      {children}
    </div>
  );
}

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="spm-wrap">{children}</div>
    </>
  );
}

function BreakScreen({ curSet, onStartNext }: { curSet: number; onStartNext: () => void }) {
  return (
    <ScreenShell>
      <div className="spm-inter">
        <div className="spm-inter-card">
          <div className="spm-i-eyebrow">Set {curSet} — complete</div>
          <h2 className="spm-i-h">Rest.<br />Breathe.</h2>
          <p className="spm-i-p">호흡을 정리하고 다음 세트를 시작하세요. 흐름은 그대로, 템포만 다시 잡으면 됩니다.</p>
        </div>
        <div className="spm-inter-bottom">
          <button className="spm-btn-cta spm-cta-w" onClick={onStartNext}>
            Begin set {curSet + 1} {R}
          </button>
        </div>
      </div>
    </ScreenShell>
  );
}

function ResultScreen({
  sets,
  durMode,
  totalR,
  onReset,
}: {
  sets: number;
  durMode: string;
  totalR: number;
  onReset: () => void;
}) {
  return (
    <ScreenShell>
      <div className="spm-inter">
        <div className="spm-inter-card">
          <div className="spm-i-eyebrow">All sets — complete</div>
          <h2 className="spm-i-h">Training<br />done.</h2>
          <p className="spm-i-p">세션이 끝났습니다. 동일한 구조를 유지한 채 다음 훈련으로 바로 이어갈 수 있습니다.</p>
        </div>
        <div className="spm-inter-bottom">
          <div className="spm-stat-grid">
            <div className="spm-stat-c">
              <div className="spm-stat-n">{sets}</div>
              <div className="spm-stat-l">Sets</div>
            </div>
            {durMode === 'round' && (
              <div className="spm-stat-c">
                <div className="spm-stat-n">{totalR}</div>
                <div className="spm-stat-l">Rounds</div>
              </div>
            )}
          </div>
          <button className="spm-btn-cta spm-cta-ac" onClick={onReset}>
            New session {RefreshIco}
          </button>
        </div>
      </div>
    </ScreenShell>
  );
}

function GameScreen({
  trans,
  curSet,
  sets,
  durMode,
  timeLeft,
  curRound,
  rounds,
  visualStyle,
  content,
  onTouch,
  onQuit,
}: {
  trans: string;
  curSet: number;
  sets: number;
  durMode: string;
  timeLeft: number;
  curRound: number;
  rounds: number;
  visualStyle: string;
  content: React.ReactNode;
  onTouch: () => void;
  onQuit: () => void;
}) {
  return (
    <ScreenShell>
      <div className="spm-game" style={{ background: visualStyle }} onClick={onTouch}>
        <div className="spm-g-vignette" />
        <div className="spm-g-grid" />
        <div className="spm-g-hud">
          <div className="spm-hud-pill">SET {curSet} / {sets}</div>
          {durMode === 'countdown' ? (
            <div className="spm-hud-time">{formatTime(timeLeft)}</div>
          ) : (
            <div className="spm-hud-pill" style={{ fontSize: 14 }}>{curRound} / {rounds}</div>
          )}
        </div>
        <div className="spm-g-stage">{content}</div>
        {trans === 'touch' && <div className="spm-g-hint">touch to advance</div>}
        <button
          className="spm-g-quit"
          onClick={(e) => {
            e.stopPropagation();
            onQuit();
          }}
        >
          quit
        </button>
      </div>
    </ScreenShell>
  );
}

export default function SpomovePage() {
  const [screen, setScreen] = useState('settings');
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState('basic');

  const [selColors, setSelColors] = useState<string[]>([]);
  const [selArrows, setSelArrows] = useState<string[]>([]);
  const [selNums, setSelNums] = useState<number[]>([]);
  const [stroop, setStroop] = useState(false);

  const [trans, setTrans] = useState('touch');
  const [dispT, setDispT] = useState(1.0);
  const [blankT, setBlankT] = useState(0.5);

  const [durMode, setDurMode] = useState('round');
  const [cdTime, setCdTime] = useState(60);
  const [rounds, setRounds] = useState(10);
  const [sets, setSets] = useState(3);

  const [curSet, setCurSet] = useState(1);
  const [curRound, setCurRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [stimulus, setStimulus] = useState<Stimulus | null>(null);
  const [visible, setVisible] = useState(false);
  const [totalR, setTotalR] = useState(0);

  const sessionRef = useRef({ curRound, rounds, durMode, curSet, sets });
  sessionRef.current = { curRound, rounds, durMode, curSet, sets };

  const pendingTimeoutsRef = useRef<number[]>([]);
  const touchCooldownRef = useRef(false);

  const queueTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter((t) => t !== id);
      callback();
    }, delay);
    pendingTimeoutsRef.current.push(id);
    return id;
  }, []);

  const clearPendingTimeouts = useCallback(() => {
    pendingTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    pendingTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearPendingTimeouts();
  }, [clearPendingTimeouts]);

  const validStepOne = selColors.length > 0 || selArrows.length > 0 || selNums.length > 0;
  const compoundAvailable = selColors.length > 0 && (selArrows.length > 0 || selNums.length > 0);

  const generateStimulus = useCallback((): Stimulus | null => {
    const hasColors = selColors.length > 0;
    const hasArrows = selArrows.length > 0;
    const hasNumbers = selNums.length > 0;

    if (!hasColors && !hasArrows && !hasNumbers) return null;

    if (stroop && hasColors && (hasArrows || hasNumbers)) {
      const fgPool: ('arrow' | 'number')[] = [
        ...(hasArrows ? (['arrow'] as const) : []),
        ...(hasNumbers ? (['number'] as const) : []),
      ];
      const fgType = pickRandom(fgPool);
      return {
        type: 'stroop',
        colorVal: pickRandom(selColors),
        fgType,
        fgVal: fgType === 'arrow' ? pickRandom(selArrows) : pickRandom(selNums),
      };
    }

    const typePool = [
      ...(hasColors ? ['color'] : []),
      ...(hasArrows ? ['arrow'] : []),
      ...(hasNumbers ? ['number'] : []),
    ];
    const type = pickRandom(typePool);

    if (type === 'color') return { type: 'color', val: pickRandom(selColors) };
    if (type === 'arrow') return { type: 'arrow', val: pickRandom(selArrows) };
    return { type: 'number', val: pickRandom(selNums) };
  }, [selColors, selArrows, selNums, stroop]);

  const resetToSettings = useCallback(() => {
    clearPendingTimeouts();
    setStimulus(null);
    setVisible(false);
    setScreen('settings');
    setStep(1);
  }, [clearPendingTimeouts]);

  const endSet = useCallback(() => {
    const { curSet: cs, sets: ts } = sessionRef.current;
    setVisible(false);
    setStimulus(null);
    setScreen(cs >= ts ? 'result' : 'break');
  }, []);

  const advanceRef = useRef<(() => void) | null>(null);
  advanceRef.current = () => {
    const { curRound: cr, rounds: tr, durMode: dm } = sessionRef.current;
    if (dm === 'round' && cr >= tr) {
      endSet();
      return;
    }
    setStimulus(generateStimulus());
    setVisible(true);
    if (dm === 'round') {
      setCurRound((p) => p + 1);
      setTotalR((p) => p + 1);
    }
  };

  useEffect(() => {
    if (screen !== 'game' || trans !== 'time') return;
    const { durMode: dm, curRound: cr, rounds: tr } = sessionRef.current;
    let id: number;
    if (visible) {
      id = window.setTimeout(() => {
        setVisible(false);
        if (dm === 'round' && cr >= tr) endSet();
      }, dispT * 1000);
    } else {
      id = window.setTimeout(() => advanceRef.current?.(), blankT * 1000);
    }
    return () => window.clearTimeout(id);
  }, [screen, trans, visible, dispT, blankT, endSet]);

  useEffect(() => {
    if (screen !== 'game' || durMode !== 'countdown') return;
    const id = window.setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) {
          window.clearInterval(id);
          endSet();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [screen, durMode, endSet]);

  const handleTouch = useCallback(() => {
    if (trans !== 'touch' || screen !== 'game' || touchCooldownRef.current) return;
    touchCooldownRef.current = true;
    clearPendingTimeouts();
    queueTimeout(() => { touchCooldownRef.current = false; }, 80);
    setVisible(false);
    queueTimeout(() => advanceRef.current?.(), 55);
  }, [trans, screen, clearPendingTimeouts, queueTimeout]);

  const startGame = useCallback(() => {
    clearPendingTimeouts();
    setCurSet(1);
    setCurRound(0);
    setTotalR(0);
    setStimulus(null);
    setVisible(false);
    setTimeLeft(durMode === 'countdown' ? cdTime : 0);
    setScreen('game');
    queueTimeout(() => advanceRef.current?.(), 50);
  }, [clearPendingTimeouts, durMode, cdTime, queueTimeout]);

  const startSet = useCallback((nextSet: number) => {
    clearPendingTimeouts();
    setCurSet(nextSet);
    setCurRound(0);
    setStimulus(null);
    setVisible(false);
    setTimeLeft(durMode === 'countdown' ? cdTime : 0);
    setScreen('game');
    queueTimeout(() => advanceRef.current?.(), 50);
  }, [clearPendingTimeouts, durMode, cdTime, queueTimeout]);

  const summary = useMemo(() => ([
    {
      k: '자극 유형',
      v: [
        selColors.length > 0 && '색깔',
        selArrows.length > 0 && '화살표',
        selNums.length > 0 && '숫자',
      ].filter(Boolean).join(' / ') || '—',
    },
    ...(stroop ? [{ k: '복합 자극', v: 'ON', a: true }] : []),
    { k: '전환 방식', v: trans === 'touch' ? 'TOUCH' : 'AUTO' },
    { k: '타임라인', v: durMode === 'countdown' ? formatTime(cdTime) : `${rounds} RND` },
    { k: '세트', v: `${sets} SET` },
  ]), [selColors.length, selArrows.length, selNums.length, stroop, trans, durMode, cdTime, rounds, sets]);

  const gameVisual = useMemo(() => {
    if (!visible || !stimulus) return { visualStyle: DEFAULT_GAME_BG, content: null };

    if (stimulus.type === 'stroop') {
      const bg = getColorHex(stimulus.colorVal);
      if (stimulus.fgType === 'arrow') {
        const arrow = getArrowMeta(stimulus.fgVal as string);
        return {
          visualStyle: bg,
          content: (
            <div className="spm-s-arr-shell">
              <ArrowGlyph className="spm-s-arr" angle={arrow.angle} color="#070708" size={300} strokeWidth={8.5} />
            </div>
          ),
        };
      }
      const isYellow = stimulus.colorVal === 'yellow';
      return {
        visualStyle: bg,
        content: (
          <span className="spm-s-num" style={{ color: isYellow ? '#101114' : 'rgba(255,255,255,0.96)' }}>
            {stimulus.fgVal}
          </span>
        ),
      };
    }

    if (stimulus.type === 'color') return { visualStyle: getColorHex(stimulus.val), content: null };

    if (stimulus.type === 'arrow') {
      const arrow = getArrowMeta(stimulus.val);
      return {
        visualStyle: ARROW_ONLY_BG,
        content: (
          <div className="spm-s-arr-shell">
            <ArrowGlyph className="spm-s-arr" angle={arrow.angle} color="#070708" size={300} strokeWidth={8.5} />
          </div>
        ),
      };
    }

    return {
      visualStyle: NUMBER_BG,
      content: <span className="spm-s-num">{stimulus.val}</span>,
    };
  }, [visible, stimulus]);

  if (screen === 'game') {
    return (
      <GameScreen
        trans={trans}
        curSet={curSet}
        sets={sets}
        durMode={durMode}
        timeLeft={timeLeft}
        curRound={curRound}
        rounds={rounds}
        visualStyle={gameVisual.visualStyle}
        content={gameVisual.content}
        onTouch={handleTouch}
        onQuit={resetToSettings}
      />
    );
  }

  if (screen === 'break') {
    return <BreakScreen curSet={curSet} onStartNext={() => startSet(curSet + 1)} />;
  }

  if (screen === 'result') {
    return <ResultScreen sets={sets} durMode={durMode} totalR={totalR} onReset={resetToSettings} />;
  }

  return (
    <ScreenShell>
      <div className="spm-page">
        <TopBar step={step} />
        <StepHead step={step as 1 | 2 | 3 | 4} />

        {step === 1 && (
          <>
            <div className="spm-tab-row">
              <button className={`spm-tab-btn ${tab === 'basic' ? 'on' : ''}`} onClick={() => setTab('basic')}>
                기본
              </button>
              <button className={`spm-tab-btn ${tab === 'advanced' ? 'on' : ''}`} onClick={() => setTab('advanced')}>
                심화
              </button>
            </div>

            {tab === 'basic' && (
              <>
                <Block label="색깔">
                  <div className="spm-color-strip">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.id}
                        className={`spm-csw ${selColors.includes(color.id) ? 'on' : ''}`}
                        style={{ background: color.hex }}
                        onClick={() => setSelColors((p) => toggleInList(p, color.id))}
                        aria-label={color.label}
                        title={color.label}
                      />
                    ))}
                  </div>
                </Block>

                <Block label="화살표 — 8방향">
                  <div className="spm-grid4">
                    {ARROW_OPTIONS.map((arrow) => (
                      <button
                        key={arrow.id}
                        className={`spm-sym ${selArrows.includes(arrow.id) ? 'on' : ''}`}
                        onClick={() => setSelArrows((p) => toggleInList(p, arrow.id))}
                        aria-label={arrow.label}
                        title={arrow.label}
                      >
                        <ArrowGlyph className="spm-arrow-tile-icon" angle={arrow.angle} color="currentColor" strokeWidth={5.6} />
                      </button>
                    ))}
                  </div>
                </Block>

                <Block label="숫자 — 1 to 10">
                  <div className="spm-grid5">
                    {NUMBER_OPTIONS.map((number) => (
                      <button
                        key={number}
                        className={`spm-sym mono ${selNums.includes(number) ? 'on' : ''}`}
                        onClick={() => setSelNums((p) => toggleInList(p, number))}
                      >
                        {number}
                      </button>
                    ))}
                  </div>
                </Block>
              </>
            )}

            {tab === 'advanced' && (
              <Block label="복합 자극">
                <div className="spm-tog-row" onClick={() => setStroop((p) => !p)}>
                  <div className="spm-tog-text">
                    <h4>Compound stimulus</h4>
                    <p>색상 배경 위에 화살표 또는 숫자를 동시에 표시합니다. 색깔과 다른 자극이 함께 선택된 경우에만 실제로 작동합니다.</p>
                  </div>
                  <div className={`spm-sw ${stroop ? 'on' : ''}`}>
                    <div className="spm-sw-k" />
                  </div>
                </div>
                {stroop && !compoundAvailable && (
                  <div className="spm-tog-hint">Active — 기본 탭에서 색깔과 화살표 또는 숫자를 함께 선택해야 표시됩니다.</div>
                )}
                {stroop && compoundAvailable && (
                  <div className="spm-tog-hint">Active — 현재 조합으로 복합 자극이 정상 동작합니다.</div>
                )}
              </Block>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Block label="전환 방식">
              <div className="spm-opt-grid">
                <button className={`spm-opt ${trans === 'touch' ? 'on' : ''}`} onClick={() => setTrans('touch')}>
                  <h4>Touch</h4>
                  <p>화면 터치 시 다음 자극으로 전환됩니다.</p>
                </button>
                <button className={`spm-opt ${trans === 'time' ? 'on' : ''}`} onClick={() => setTrans('time')}>
                  <h4>Auto</h4>
                  <p>지정한 시간 간격으로 자동 전환됩니다.</p>
                </button>
              </div>
            </Block>

            {trans === 'time' && (
              <Block label="시간 설정">
                <div className="spm-sl-stack">
                  <div>
                    <div className="spm-sl-meta">
                      <span className="spm-sl-name">노출 시간</span>
                      <span className="spm-sl-val">{dispT.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      className="spm-range"
                      min="0" max="5" step="0.5"
                      value={dispT}
                      onChange={(e) => setDispT(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <div className="spm-sl-meta">
                      <span className="spm-sl-name">공백 시간</span>
                      <span className="spm-sl-val">{blankT.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      className="spm-range"
                      min="0" max="5" step="0.5"
                      value={blankT}
                      onChange={(e) => setBlankT(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </Block>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Block label="기준">
              <div className="spm-opt-grid">
                <button className={`spm-opt ${durMode === 'countdown' ? 'on' : ''}`} onClick={() => setDurMode('countdown')}>
                  <h4>Countdown</h4>
                  <p>제한 시간 동안 진행합니다.</p>
                </button>
                <button className={`spm-opt ${durMode === 'round' ? 'on' : ''}`} onClick={() => setDurMode('round')}>
                  <h4>Rounds</h4>
                  <p>정해진 횟수만큼 반복합니다.</p>
                </button>
              </div>
            </Block>

            <Block label={durMode === 'countdown' ? '제한 시간' : '라운드 수'}>
              {durMode === 'countdown' ? (
                <div className="spm-pills">
                  {TIME_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      className={`spm-pill ${cdTime === t.value ? 'on' : ''}`}
                      onClick={() => setCdTime(t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="spm-sl-meta">
                    <span className="spm-sl-name">목표 횟수</span>
                    <span className="spm-sl-val">{rounds}</span>
                  </div>
                  <input
                    type="range"
                    className="spm-range"
                    min="5" max="20" step="1"
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value, 10))}
                  />
                </>
              )}
            </Block>
          </>
        )}

        {step === 4 && (
          <>
            <Block label="총 세트 수">
              <div className="spm-set-big">
                <span className="spm-set-n">{sets}</span>
                <span className="spm-set-unit">sets</span>
              </div>
              <input
                type="range"
                className="spm-range"
                min="1" max="5" step="1"
                value={sets}
                onChange={(e) => setSets(parseInt(e.target.value, 10))}
              />
            </Block>

            <Block label="세션 요약">
              <div className="spm-sum-list">
                {summary.map((row) => (
                  <div key={row.k} className="spm-sum-row">
                    <span className="spm-sum-k">{row.k}</span>
                    <span className={row.a ? 'spm-sum-va' : 'spm-sum-v'}>{row.v}</span>
                  </div>
                ))}
              </div>
            </Block>
          </>
        )}

        <div className="spm-foot">
          {step > 1 ? (
            <button className="spm-btn-back" onClick={() => setStep((p) => p - 1)}>
              {L} back
            </button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <button
              className="spm-btn-next"
              disabled={step === 1 && !validStepOne}
              onClick={() => setStep((p) => p + 1)}
            >
              next {R}
            </button>
          ) : (
            <button className="spm-btn-next" onClick={startGame}>
              Start {PlayIco}
            </button>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}
