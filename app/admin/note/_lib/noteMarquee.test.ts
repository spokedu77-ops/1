/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  getMarqueeSelectedBlockIds,
  isMarqueeSelectStartBlocked,
  rowSubstantiallyInMarquee,
} from './noteMarquee';

describe('rowSubstantiallyInMarquee', () => {
  it('requires overlap and center inside marquee', () => {
    const row = { top: 100, bottom: 140, left: 0, right: 200, height: 40, width: 200 } as DOMRect;
    const marquee = { left: 10, top: 90, right: 210, bottom: 150 };
    expect(rowSubstantiallyInMarquee(row, marquee)).toBe(true);

    const tinyOverlap = { left: 10, top: 90, right: 210, bottom: 105 };
    expect(rowSubstantiallyInMarquee(row, tinyOverlap)).toBe(false);

    const centerOutside = { left: 300, top: 90, right: 500, bottom: 150 };
    expect(rowSubstantiallyInMarquee(row, centerOutside)).toBe(false);
  });
});

describe('getMarqueeSelectedBlockIds', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-note-block-row data-block-id="a" style="position:absolute;top:0;left:0;width:200px;height:40px"></div>
      <div data-note-block-row data-block-id="b" style="position:absolute;top:50px;left:0;width:200px;height:40px"></div>
      <div data-note-block-row data-block-id="c" style="position:absolute;top:200px;left:0;width:200px;height:40px"></div>
    `;
    for (const row of document.querySelectorAll<HTMLElement>('[data-note-block-row]')) {
      const top = Number.parseFloat(row.style.top) || 0;
      const height = Number.parseFloat(row.style.height) || 40;
      row.getBoundingClientRect = () => ({
        top,
        bottom: top + height,
        left: 0,
        right: 200,
        width: 200,
        height,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;
    }
  });

  it('selects rows whose center falls in marquee', () => {
    const ids = getMarqueeSelectedBlockIds({ left: 0, top: 0, right: 300, bottom: 80 });
    expect(ids.sort()).toEqual(['a', 'b']);
  });
});

describe('isMarqueeSelectStartBlocked', () => {
  it('blocks gutter and form controls', () => {
    document.body.innerHTML = `
      <button id="btn">x</button>
      <div class="note-block-gutter" id="gutter"></div>
      <div id="plain">ok</div>
    `;
    expect(isMarqueeSelectStartBlocked(document.getElementById('btn'))).toBe(true);
    expect(isMarqueeSelectStartBlocked(document.getElementById('gutter'))).toBe(true);
    expect(isMarqueeSelectStartBlocked(document.getElementById('plain'))).toBe(false);
  });
});
