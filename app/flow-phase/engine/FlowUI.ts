/**
 * Flow Phase - UI 헬퍼
 * DOM 조작 (레벨 태그, 인스트럭션)
 */
import type { FlowDomRefs } from './FlowTypes';

export function getRefEl<T = HTMLElement>(ref: { current: T | null }): T | null {
  return ref?.current ?? null;
}

export function setLevelTag(
  domRefs: FlowDomRefs,
  levelNum: number
): void {
  const tag = getRefEl(domRefs.levelTag);
  if (!tag) return;
  if (levelNum === 1) {
    tag.innerText = 'JUMP';
    tag.style.borderColor = 'rgba(147,197,253,0.6)';
    tag.style.color = '#93c5fd';
    tag.style.background = 'rgba(59,130,246,0.15)';
  } else if (levelNum === 2) {
    tag.innerText = 'FASTER';
    tag.style.borderColor = 'rgba(34,211,238,0.7)';
    tag.style.color = '#22d3ee';
    tag.style.background = 'rgba(34,211,238,0.12)';
  } else if (levelNum === 3) {
    tag.innerText = 'PUNCH';
    tag.style.borderColor = 'rgba(239,68,68,0.7)';
    tag.style.color = '#ef4444';
    tag.style.background = 'rgba(239,68,68,0.12)';
  } else if (levelNum === 4) {
    tag.innerText = 'FOCUS';
    tag.style.borderColor = 'rgba(245,158,11,0.7)';
    tag.style.color = '#f59e0b';
    tag.style.background = 'rgba(245,158,11,0.12)';
  } else if (levelNum === 5) {
    tag.innerText = 'ALL';
    tag.style.borderColor = 'rgba(167,139,250,0.7)';
    tag.style.color = '#a78bfa';
    tag.style.background = 'rgba(167,139,250,0.12)';
  }
}

export function showInstruction(
  domRefs: FlowDomRefs,
  text: string,
  colorClass = 'text-yellow-400',
  ms = 700
): void {
  const ins = getRefEl(domRefs.instruction);
  if (!ins) return;
  ins.innerText = text;
  ins.className = `font-game ${colorClass}`;
  ins.classList.remove('hidden');
  const t = (ins as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t;
  if (t) clearTimeout(t);
  (ins as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t =
    setTimeout(() => ins.classList.add('hidden'), ms);
}

/** UFO duck 직전 상단 경고 라인 (ms 후 자동 숨김). ref 없으면 body에 임시 표시 */
export function showDuckWarningLine(
  domRefs: FlowDomRefs,
  ms = 700
): void {
  const el = getRefEl(domRefs.duckWarningLine);
  if (el) {
    el.classList.remove('hidden');
    const t = (el as HTMLDivElement & { _duckT?: ReturnType<typeof setTimeout> })._duckT;
    if (t) clearTimeout(t);
    (el as HTMLDivElement & { _duckT?: ReturnType<typeof setTimeout> })._duckT =
      setTimeout(() => el.classList.add('hidden'), ms);
    return;
  }
  if (typeof document === 'undefined') return;
  const fallback = document.createElement('div');
  fallback.style.cssText = 'position:fixed;top:0;left:0;right:0;height:4px;background:rgba(34,211,238,0.95);box-shadow:0 0 20px rgba(34,211,238,0.9);z-index:99999;pointer-events:none;';
  document.body.appendChild(fallback);
  setTimeout(() => fallback.remove(), ms);
}

/** 완주 스탬프 "FLOW COMPLETE" (durationMs 후 숨김). ref 없으면 body에 임시 표시 */
export function showCompleteStamp(domRefs: FlowDomRefs, durationMs = 2000): void {
  const el = getRefEl(domRefs.stampOverlay);
  if (el) {
    el.classList.remove('hidden');
    const t = (el as HTMLDivElement & { _stampT?: ReturnType<typeof setTimeout> })._stampT;
    if (t) clearTimeout(t);
    (el as HTMLDivElement & { _stampT?: ReturnType<typeof setTimeout> })._stampT =
      setTimeout(() => el.classList.add('hidden'), durationMs);
    return;
  }
  if (typeof document === 'undefined') return;
  const fallback = document.createElement('div');
  fallback.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:99999;pointer-events:none;';
  fallback.innerHTML = '<span style="font-size:clamp(2rem,6vw,4rem);font-weight:900;letter-spacing:0.2em;color:rgb(52,211,153);text-shadow:0 0 30px rgba(52,211,153,0.9);">FLOW COMPLETE</span>';
  document.body.appendChild(fallback);
  setTimeout(() => fallback.remove(), durationMs);
}

/** 레벨 배지 토스트 LV1~LV5 (durationMs 후 숨김). ref 없으면 body에 임시 표시 */
export function showLevelBadge(domRefs: FlowDomRefs, levelNum: number, durationMs = 500): void {
  const el = getRefEl(domRefs.badgeToast);
  if (el) {
    el.textContent = `LV${levelNum}`;
    el.classList.remove('hidden');
    const t = (el as HTMLDivElement & { _badgeT?: ReturnType<typeof setTimeout> })._badgeT;
    if (t) clearTimeout(t);
    (el as HTMLDivElement & { _badgeT?: ReturnType<typeof setTimeout> })._badgeT =
      setTimeout(() => el.classList.add('hidden'), durationMs);
    return;
  }
  if (typeof document === 'undefined') return;
  const fallback = document.createElement('div');
  fallback.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:1rem 2rem;border-radius:1rem;background:rgba(0,0,0,0.9);color:white;font-size:1.75rem;font-weight:bold;z-index:99998;pointer-events:none;';
  fallback.textContent = `LV${levelNum}`;
  document.body.appendChild(fallback);
  setTimeout(() => fallback.remove(), durationMs);
}
