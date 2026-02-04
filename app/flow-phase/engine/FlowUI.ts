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
