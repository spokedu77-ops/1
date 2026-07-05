import type { NoteBlock } from './types';
import type { PastedBlockSpec } from './notePasteBlocks';
import { parseCodeLanguageFromClassName } from './noteCodeBlock';
import {
  detectClipboardHtmlSource,
  parseNotionCalloutElement,
  parseNotionToggleElement,
  unwrapGoogleDocsElement,
} from './notePasteHtmlNotion';
import type { NoteTableCell } from './noteTableBlock';

const BLOCK_TAGS = new Set([
  'H1', 'H2', 'H3', 'P', 'UL', 'OL', 'LI', 'HR', 'PRE', 'BLOCKQUOTE', 'DIV',
  'IMG', 'FIGURE', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'DETAILS', 'SUMMARY',
]);

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

function preElementText(el: Element): string {
  const codeEl = el.querySelector('code');
  const source = codeEl ?? el;
  return (source.textContent ?? '').replace(/\r\n/g, '\n');
}

function parsePreBlock(el: Element): PastedBlockSpec | null {
  const text = preElementText(el);
  if (!text.trim()) return null;
  const codeEl = el.querySelector('code');
  const language = parseCodeLanguageFromClassName(codeEl?.getAttribute('class'));
  return { type: 'code', text, language };
}

function parseImageElement(el: Element): PastedBlockSpec | null {
  const src = el.getAttribute('src')?.trim();
  if (!src) return null;
  return {
    type: 'image',
    text: '',
    imageUrl: src,
    caption: el.getAttribute('alt')?.trim() ?? '',
  };
}

function parseFigureBlock(el: Element): PastedBlockSpec | null {
  const img = el.querySelector('img');
  if (!img) return null;
  const src = img.getAttribute('src')?.trim();
  if (!src) return null;
  const figcaption = el.querySelector('figcaption');
  const caption = figcaption ? elementText(figcaption) : (img.getAttribute('alt')?.trim() ?? '');
  return { type: 'image', text: '', imageUrl: src, caption };
}

function parseTableCell(el: Element): NoteTableCell {
  return {
    text: elementText(el),
    html: elementInnerHtml(el),
  };
}

function parseTableBlock(el: Element): PastedBlockSpec | null {
  const rowEls = el.querySelectorAll('tr');
  if (rowEls.length === 0) return null;
  const rows = Array.from(rowEls).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) => parseTableCell(cell)),
  ).filter((row) => row.length > 0);
  if (rows.length === 0) return null;
  const hasHeaderRow = el.querySelector('thead tr') != null
    || rows[0]?.some((_, index) => rowEls[0]?.children[index]?.tagName === 'TH') === true;
  return {
    type: 'table',
    text: '',
    tableContent: {
      rows,
      hasHeaderRow,
      columnCount: rows[0]?.length ?? 1,
    },
  };
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripTags(value: string): string {
  return decodeBasicHtmlEntities(value.replace(/<[^>]*>/g, '')).trim();
}

function readHtmlAttribute(source: string, name: string): string | undefined {
  const match = source.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, 'i'));
  return match?.[2]?.trim() || undefined;
}

function elementInnerHtmlFallback(html: string): string | undefined {
  const safe = stripUnsafeHtml(html).trim();
  return safe ? safe : undefined;
}

function parsePreBlockFallback(html: string): PastedBlockSpec | null {
  const preMatch = html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i);
  if (!preMatch?.[1]) return null;
  const codeMatch = preMatch[1].match(/<code\b([^>]*)>([\s\S]*?)<\/code>/i);
  const codeAttrs = codeMatch?.[1] ?? '';
  const rawText = codeMatch?.[2] ?? preMatch[1];
  const text = decodeBasicHtmlEntities(rawText.replace(/<[^>]*>/g, '')).replace(/\r\n/g, '\n');
  if (!text.trim()) return null;
  const language = parseCodeLanguageFromClassName(readHtmlAttribute(codeAttrs, 'class'));
  return { type: 'code', text, language };
}

function parseFigureBlockFallback(html: string): PastedBlockSpec | null {
  const figureMatch = html.match(/<figure\b[^>]*>([\s\S]*?)<\/figure>/i);
  const source = figureMatch?.[1] ?? html;
  const imgMatch = source.match(/<img\b([^>]*)>/i);
  if (!imgMatch?.[1]) return null;
  const src = readHtmlAttribute(imgMatch[1], 'src');
  if (!src) return null;
  const captionMatch = source.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
  const caption = captionMatch?.[1] ? stripTags(captionMatch[1]) : (readHtmlAttribute(imgMatch[1], 'alt') ?? '');
  return { type: 'image', text: '', imageUrl: src, caption };
}

function parseTableBlockFallback(html: string): PastedBlockSpec | null {
  const tableMatch = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch?.[1]) return null;
  const rowMatches = Array.from(tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));
  const rows = rowMatches.map((rowMatch) =>
    Array.from(rowMatch[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)).map((cellMatch) => ({
      text: stripTags(cellMatch[1]),
      html: elementInnerHtmlFallback(cellMatch[1]),
    })),
  ).filter((row) => row.length > 0);
  if (rows.length === 0) return null;
  const hasHeaderRow = /<thead\b/i.test(tableMatch[1]) || /<th\b/i.test(rowMatches[0]?.[1] ?? '');
  return {
    type: 'table',
    text: '',
    tableContent: {
      rows,
      hasHeaderRow,
      columnCount: rows[0]?.length ?? 1,
    },
  };
}

function parseWithoutDomParser(html: string): PastedBlockSpec[] {
  const out: PastedBlockSpec[] = [];
  const pre = parsePreBlockFallback(html);
  if (pre) out.push(pre);
  const figure = parseFigureBlockFallback(html);
  if (figure) out.push(figure);
  const table = parseTableBlockFallback(html);
  if (table) out.push(table);
  return out;
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

function parseListItems(listEl: Element, ordered: boolean, depth = 0): PastedBlockSpec[] {
  const out: PastedBlockSpec[] = [];
  const type: NoteBlock['type'] = ordered ? 'numberedList' : 'bulletList';
  for (const child of listEl.children) {
    if (child.tagName !== 'LI') continue;
    const text = elementText(child);
    const html = elementInnerHtml(child);
    if (!text && !html) continue;
    out.push({ type, text, html, listNestLevel: depth });
    for (const nested of child.children) {
      if (nested.tagName === 'UL') out.push(...parseListItems(nested, false, depth + 1));
      if (nested.tagName === 'OL') out.push(...parseListItems(nested, true, depth + 1));
    }
  }
  return out;
}

function walkElements(nodes: Iterable<Node>, out: PastedBlockSpec[], htmlSource: ReturnType<typeof detectClipboardHtmlSource>) {
  const parseChildNodes = (childNodes: Iterable<Node>) => {
    const nested: PastedBlockSpec[] = [];
    walkElements(childNodes, nested, htmlSource);
    return nested;
  };

  for (const node of nodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    let el = node as Element;
    if (htmlSource === 'google-docs') {
      el = unwrapGoogleDocsElement(el);
    }
    const tag = el.tagName;

    if (tag === 'META' || tag === 'STYLE' || tag === 'HEAD') continue;
    if (tag === 'SUMMARY') continue;

    if (tag === 'H1') { pushTextBlock(out, 'heading', el); continue; }
    if (tag === 'H2') { pushTextBlock(out, 'heading2', el); continue; }
    if (tag === 'H3') { pushTextBlock(out, 'heading3', el); continue; }
    if (tag === 'P') { pushTextBlock(out, 'text', el); continue; }
    if (tag === 'HR') { out.push({ type: 'divider', text: '' }); continue; }
    if (tag === 'PRE') {
      const codeBlock = parsePreBlock(el);
      if (codeBlock) out.push(codeBlock);
      continue;
    }
    if (tag === 'BLOCKQUOTE') { pushTextBlock(out, 'quote', el); continue; }
    if (tag === 'IMG') {
      const image = parseImageElement(el);
      if (image) out.push(image);
      continue;
    }
    if (tag === 'FIGURE') {
      const figure = parseFigureBlock(el);
      if (figure) out.push(figure);
      continue;
    }
    if (tag === 'TABLE') {
      const table = parseTableBlock(el);
      if (table) out.push(table);
      continue;
    }
    if (tag === 'DETAILS') {
      const toggle = parseNotionToggleElement(el, parseChildNodes);
      if (toggle) {
        out.push(toggle);
        continue;
      }
    }
    if (tag === 'UL') { out.push(...parseListItems(el, false)); continue; }
    if (tag === 'OL') { out.push(...parseListItems(el, true)); continue; }
    if (tag === 'LI') continue;
    if (tag === 'TBODY' || tag === 'THEAD' || tag === 'TR' || tag === 'TD' || tag === 'TH') continue;

    if (tag === 'DIV') {
      const todo = parseTodoDiv(el);
      if (todo) {
        out.push(todo);
        continue;
      }
      const toggle = parseNotionToggleElement(el, parseChildNodes);
      if (toggle) {
        out.push(toggle);
        continue;
      }
      const callout = parseNotionCalloutElement(el);
      if (callout) {
        out.push(callout);
        continue;
      }
      const hasBlockChild = [...el.children].some((child) => BLOCK_TAGS.has(child.tagName));
      if (hasBlockChild) {
        walkElements(el.childNodes, out, htmlSource);
        continue;
      }
      pushTextBlock(out, 'text', el);
      continue;
    }

    if (el.children.length > 0) {
      walkElements(el.childNodes, out, htmlSource);
    }
  }
}

function parseWithDomParser(html: string): PastedBlockSpec[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: PastedBlockSpec[] = [];
  const source = detectClipboardHtmlSource(html);
  walkElements(doc.body.childNodes, out, source);
  return out;
}

/** Notion·Docs HTML — 블록 단위 분리. DOMParser 없으면 구조 블록만 보존한다. */
export function parseClipboardHtmlToBlocks(html: string): PastedBlockSpec[] | null {
  const trimmed = html.trim();
  if (!trimmed || !/<[a-z][\s\S]*>/i.test(trimmed)) return null;
  if (typeof DOMParser === 'undefined') {
    const fallbackSpecs = parseWithoutDomParser(trimmed);
    return fallbackSpecs.length > 0 ? fallbackSpecs : null;
  }

  const specs = parseWithDomParser(trimmed);
  if (specs.length === 0) return null;
  return specs;
}

export function shouldSplitHtmlPaste(specs: PastedBlockSpec[]): boolean {
  if (specs.length > 1) return true;
  const only = specs[0];
  if (!only) return false;
  if (only.type === 'image' || only.type === 'table' || only.type === 'divider') return true;
  if (only.type === 'toggle' && (only.children?.length ?? 0) > 0) return true;
  if (only.listNestLevel != null && only.listNestLevel > 0) return true;
  return only.type !== 'text' || !!only.html?.includes('<');
}
