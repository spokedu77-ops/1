import type { NoteBlock } from './types';
import type { PastedBlockSpec } from './notePasteBlocks';

const BLOCK_TAGS = new Set(['H1', 'H2', 'H3', 'P', 'UL', 'OL', 'LI', 'HR', 'PRE', 'BLOCKQUOTE', 'DIV']);

function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

function elementText(el: Element): string {
  return (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

function elementInnerHtml(el: Element): string | undefined {
  const inner = el.innerHTML.trim();
  if (!inner) return undefined;
  return stripUnsafeHtml(inner);
}

function pushTextBlock(out: PastedBlockSpec[], type: NoteBlock['type'], el: Element) {
  const text = elementText(el);
  const html = elementInnerHtml(el);
  if (!text && !html) return;
  out.push({ type, text, html });
}

function parseTodoDiv(el: Element): PastedBlockSpec | null {
  const checkbox = el.querySelector('input[type="checkbox"]');
  if (!checkbox) return null;
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('input[type="checkbox"]').forEach((node) => node.remove());
  const text = (clone.textContent ?? '').replace(/\u00a0/g, ' ').trim();
  return {
    type: 'todo',
    text,
    html: elementInnerHtml(clone),
    checked: (checkbox as HTMLInputElement).checked,
  };
}

function parseListItems(listEl: Element, ordered: boolean): PastedBlockSpec[] {
  const out: PastedBlockSpec[] = [];
  const type: NoteBlock['type'] = ordered ? 'numberedList' : 'bulletList';
  for (const child of listEl.children) {
    if (child.tagName !== 'LI') continue;
    const text = elementText(child);
    const html = elementInnerHtml(child);
    if (!text && !html) continue;
    out.push({ type, text, html });
    for (const nested of child.children) {
      if (nested.tagName === 'UL') out.push(...parseListItems(nested, false));
      if (nested.tagName === 'OL') out.push(...parseListItems(nested, true));
    }
  }
  return out;
}

function walkElements(nodes: Iterable<Node>, out: PastedBlockSpec[]) {
  for (const node of nodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    const tag = el.tagName;

    if (tag === 'META' || tag === 'STYLE' || tag === 'HEAD') continue;

    if (tag === 'H1') { pushTextBlock(out, 'heading', el); continue; }
    if (tag === 'H2') { pushTextBlock(out, 'heading2', el); continue; }
    if (tag === 'H3') { pushTextBlock(out, 'heading3', el); continue; }
    if (tag === 'P') { pushTextBlock(out, 'text', el); continue; }
    if (tag === 'HR') { out.push({ type: 'divider', text: '' }); continue; }
    if (tag === 'PRE') { pushTextBlock(out, 'code', el); continue; }
    if (tag === 'BLOCKQUOTE') { pushTextBlock(out, 'callout', el); continue; }
    if (tag === 'UL') { out.push(...parseListItems(el, false)); continue; }
    if (tag === 'OL') { out.push(...parseListItems(el, true)); continue; }
    if (tag === 'LI') continue;

    if (tag === 'DIV') {
      const todo = parseTodoDiv(el);
      if (todo) {
        out.push(todo);
        continue;
      }
      const hasBlockChild = [...el.children].some((child) => BLOCK_TAGS.has(child.tagName));
      if (hasBlockChild) {
        walkElements(el.childNodes, out);
        continue;
      }
      pushTextBlock(out, 'text', el);
      continue;
    }

    if (el.children.length > 0) {
      walkElements(el.childNodes, out);
    }
  }
}

function parseWithDomParser(html: string): PastedBlockSpec[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: PastedBlockSpec[] = [];
  walkElements(doc.body.childNodes, out);
  return out;
}

/** Notion·Docs HTML — 블록 단위 분리. DOMParser 없으면 null(기본 paste). */
export function parseClipboardHtmlToBlocks(html: string): PastedBlockSpec[] | null {
  const trimmed = html.trim();
  if (!trimmed || !/<[a-z][\s\S]*>/i.test(trimmed)) return null;
  if (typeof DOMParser === 'undefined') return null;

  const specs = parseWithDomParser(trimmed);
  if (specs.length === 0) return null;
  return specs;
}

export function shouldSplitHtmlPaste(specs: PastedBlockSpec[]): boolean {
  if (specs.length > 1) return true;
  const only = specs[0];
  if (!only) return false;
  return only.type !== 'text' || !!only.html?.includes('<');
}
