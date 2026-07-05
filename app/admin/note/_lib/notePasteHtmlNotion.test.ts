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
});
