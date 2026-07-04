import { notePointerTargetElement } from './notePointerTarget';

export type MarqueeRect = { left: number; top: number; right: number; bottom: number };

export function rowSubstantiallyInMarquee(row: DOMRect, marquee: MarqueeRect): boolean {
  const overlapTop = Math.max(row.top, marquee.top);
  const overlapBottom = Math.min(row.bottom, marquee.bottom);
  const overlapHeight = Math.max(0, overlapBottom - overlapTop);
  if (overlapHeight < row.height * 0.35) return false;
  const cx = (row.left + row.right) / 2;
  const cy = (row.top + row.bottom) / 2;
  return cx >= marquee.left && cx <= marquee.right && cy >= marquee.top && cy <= marquee.bottom;
}

export function getMarqueeSelectedBlockIds(marquee: MarqueeRect): string[] {
  const ids: string[] = [];
  document.querySelectorAll<HTMLElement>('[data-note-block-row]').forEach((row) => {
    if (!rowSubstantiallyInMarquee(row.getBoundingClientRect(), marquee)) return;
    const id = row.getAttribute('data-block-id');
    if (id) ids.push(id);
  });
  return ids;
}

export function isMarqueeSelectStartBlocked(target: EventTarget | null): boolean {
  const el = notePointerTargetElement(target);
  if (!el) return false;
  return !!el.closest(
    'button, input, textarea, a, .note-block-gutter, [data-note-ignore-whitespace]',
  );
}
