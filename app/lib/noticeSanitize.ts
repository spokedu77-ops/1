const ALLOWED_TAGS = new Set(['P', 'BR', 'IMG', 'DIV', 'SPAN']);
const ALLOWED_ATTRIBUTES = new Set(['src', 'alt', 'class']);
const URI_ATTRIBUTES = new Set(['src']);

function isSafeAttributeValue(name: string, value: string): boolean {
  if (!URI_ATTRIBUTES.has(name)) return true;
  const normalized = value.trim().toLowerCase();
  return !normalized.startsWith('javascript:') && !normalized.startsWith('data:text/html');
}

function sanitizeElement(element: Element): void {
  for (const child of Array.from(element.children)) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }

    for (const attr of Array.from(child.attributes)) {
      const attrName = attr.name.toLowerCase();
      if (!ALLOWED_ATTRIBUTES.has(attrName) || !isSafeAttributeValue(attrName, attr.value)) {
        child.removeAttribute(attr.name);
      }
    }

    sanitizeElement(child);
  }
}

function sanitizeWithDomParser(html: string): string | null {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return null;
  }

  const doc = new window.DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  sanitizeElement(root);
  return root.innerHTML;
}

function sanitizeServerFallback(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/\s+src\s*=\s*(["'])\s*data:text\/html[\s\S]*?\1/gi, '')
    .replace(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi, (tag, tagName: string) => {
      const normalizedTagName = tagName.toUpperCase();
      if (!ALLOWED_TAGS.has(normalizedTagName)) return '';

      const isClosingTag = /^<\s*\//.test(tag);
      if (isClosingTag || normalizedTagName === 'BR') {
        return normalizedTagName === 'BR' ? '<br>' : `</${tagName.toLowerCase()}>`;
      }

      const safeAttrs = Array.from(tag.matchAll(/\s+([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))
        .map(([, name, doubleQuotedValue, singleQuotedValue]) => {
          const attrName = name.toLowerCase();
          const attrValue = doubleQuotedValue ?? singleQuotedValue ?? '';
          if (!ALLOWED_ATTRIBUTES.has(attrName) || !isSafeAttributeValue(attrName, attrValue)) {
            return '';
          }
          return ` ${attrName}="${attrValue.replace(/"/g, '&quot;')}"`;
        })
        .join('');

      return `<${tagName.toLowerCase()}${safeAttrs}>`;
    });
}

export function sanitizeNoticeHtml(html: string): string {
  return sanitizeWithDomParser(html) ?? sanitizeServerFallback(html);
}
