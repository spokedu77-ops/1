/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import {
  detectClipboardHtmlSource,
  parseNotionCalloutElement,
  parseNotionToggleElement,
} from './notePasteHtmlNotion';
import { parseClipboardHtmlToBlocks } from './notePasteHtml';

describe('notePasteHtmlNotion', () => {
  it('detects notion and google docs html sources', () => {
    expect(detectClipboardHtmlSource('<!-- notion -->')).toBe('notion');
    expect(detectClipboardHtmlSource('<b id="docs-internal-guid-123">x</b>')).toBe('google-docs');
    expect(detectClipboardHtmlSource('<p>plain</p>')).toBe('generic');
  });

  it('parses callout element', () => {
    document.body.innerHTML = '<div class="callout" role="note">Hello</div>';
    const el = document.body.firstElementChild!;
    expect(parseNotionCalloutElement(el)).toMatchObject({ type: 'callout', text: 'Hello' });
  });

  it('parses details/summary toggle with children', () => {
    document.body.innerHTML = '<details open><summary>Title</summary><p>Body</p></details>';
    const el = document.body.firstElementChild!;
    const spec = parseNotionToggleElement(el, (nodes) => {
      const specs = [];
      for (const node of nodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const child = node as Element;
        if (child.tagName === 'P') specs.push({ type: 'text', text: child.textContent ?? '' });
      }
      return specs;
    });
    expect(spec).toMatchObject({ type: 'toggle', text: 'Title', collapsed: false });
    expect(spec?.children?.[0]).toMatchObject({ type: 'text', text: 'Body' });
  });

  it('integrates notion callout through html paste pipeline', () => {
    const specs = parseClipboardHtmlToBlocks(
      '<div class="callout" role="note">Important</div><p>Next</p>',
    );
    expect(specs?.[0]).toMatchObject({ type: 'callout', text: 'Important' });
    expect(specs?.[1]).toMatchObject({ type: 'text', text: 'Next' });
  });

  it('does not duplicate nested list item text into the parent LI', () => {
    const specs = parseClipboardHtmlToBlocks(
      '<ul><li>긴줄넘기<ul><li>하위</li></ul></li><li>다른항목</li></ul>',
    );
    expect(specs).toEqual([
      expect.objectContaining({ type: 'bulletList', text: '긴줄넘기', listNestLevel: 0 }),
      expect.objectContaining({ type: 'bulletList', text: '하위', listNestLevel: 1 }),
      expect.objectContaining({ type: 'bulletList', text: '다른항목', listNestLevel: 0 }),
    ]);
    const texts = specs?.map((spec) => spec.text) ?? [];
    expect(texts.filter((text) => text.includes('긴줄넘기'))).toHaveLength(1);
    expect(texts.filter((text) => text.includes('하위'))).toHaveLength(1);
  });

  it('strips Notion bullet glyph DIVs and lone "." markers from list paste', () => {
    const specs = parseClipboardHtmlToBlocks(
      '<ul><li><div>.</div><div>육상 (릴레이)</div></li></ul>',
    );
    expect(specs).toHaveLength(1);
    expect(specs?.[0]).toMatchObject({ type: 'bulletList', text: '육상 (릴레이)' });
    expect(specs?.[0]?.text).not.toMatch(/^\./);
  });

  it('does not create a text block from a lone Notion bullet glyph DIV', () => {
    const specs = parseClipboardHtmlToBlocks(
      '<div>.</div><div>본문만</div>',
    );
    expect(specs?.some((spec) => spec.text === '.')).toBe(false);
    expect(specs?.some((spec) => spec.text === '본문만')).toBe(true);
  });
});
