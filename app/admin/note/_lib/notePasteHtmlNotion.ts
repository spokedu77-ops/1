import type { PastedBlockSpec } from './notePasteBlocks';

export type ClipboardHtmlSource = 'notion' | 'google-docs' | 'generic';

export function detectClipboardHtmlSource(html: string): ClipboardHtmlSource {
  const lower = html.toLowerCase();
  if (
    lower.includes('notion')
    || lower.includes('data-notion')
    || lower.includes('<!-- notion')
  ) {
    return 'notion';
  }
  if (
    lower.includes('docs-internal-guid')
    || lower.includes('google docs')
    || lower.includes('id="docs-internal-guid')
  ) {
    return 'google-docs';
  }
  return 'generic';
}

function elementText(el: Element): string {
  return (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

function elementInnerHtml(el: Element): string | undefined {
  const inner = el.innerHTML.trim();
  if (!inner) return undefined;
  return stripUnsafeHtml(inner);
}

function classHints(el: Element): string {
  return `${el.className ?? ''} ${el.getAttribute('role') ?? ''}`.toLowerCase();
}

function isCalloutElement(el: Element): boolean {
  const hint = classHints(el);
  return hint.includes('callout') || el.getAttribute('role') === 'note';
}

function isToggleElement(el: Element): boolean {
  return classHints(el).includes('toggle');
}

function parseNestedBlockContainer(
  parseChildNodes: (nodes: Iterable<Node>) => PastedBlockSpec[],
  nodes: Iterable<Node>,
): PastedBlockSpec[] {
  return parseChildNodes(nodes);
}

export function parseNotionToggleElement(
  el: Element,
  parseChildNodes: (nodes: Iterable<Node>) => PastedBlockSpec[],
): PastedBlockSpec | null {
  if (el.tagName === 'DETAILS') {
    const summary = el.querySelector('summary');
    const title = summary ? elementText(summary) : elementText(el);
    const wrapper = document.createElement('div');
    for (const node of el.childNodes) {
      if (node === summary) continue;
      wrapper.appendChild(node.cloneNode(true));
    }
    const childSpecs = parseNestedBlockContainer(parseChildNodes, wrapper.childNodes);
    if (!title && childSpecs.length === 0) return null;
    return {
      type: 'toggle',
      text: title,
      html: summary ? elementInnerHtml(summary) : undefined,
      collapsed: !(el as HTMLDetailsElement).open,
      children: childSpecs,
    };
  }

  if (!isToggleElement(el)) return null;

  const titleEl = el.querySelector('[data-toggle-title], summary, .toggle-title, h1, h2, h3, p');
  const title = titleEl ? elementText(titleEl) : elementText(el);
  const contentRoot = el.querySelector('.toggle-content, .indented, [data-toggle-body]') ?? el;
  const clone = contentRoot.cloneNode(true) as Element;
  titleEl?.remove();
  clone.querySelector('[data-toggle-title], summary')?.remove();
  const children = parseNestedBlockContainer(parseChildNodes, clone.childNodes);
  if (!title && children.length === 0) return null;
  return {
    type: 'toggle',
    text: title,
    html: titleEl ? elementInnerHtml(titleEl) : undefined,
    children,
  };
}

export function parseNotionCalloutElement(el: Element): PastedBlockSpec | null {
  if (!isCalloutElement(el)) return null;
  const text = elementText(el);
  const html = elementInnerHtml(el);
  if (!text && !html) return null;
  return { type: 'callout', text, html };
}

export function unwrapGoogleDocsElement(el: Element): Element {
  if (el.tagName !== 'B' && el.tagName !== 'SPAN') return el;
  const parent = el.parentElement;
  if (!parent) return el;
  const id = el.getAttribute('id') ?? '';
  if (!id.includes('docs-internal-guid') && el.tagName !== 'SPAN') return el;
  const replacement = document.createElement('span');
  replacement.innerHTML = el.innerHTML;
  return replacement;
}
