import DOMPurify from 'isomorphic-dompurify';

export function sanitizeNoticeHtml(html: string): string {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'img', 'div', 'span'],
      ALLOWED_ATTR: ['src', 'alt', 'class'],
    });
  }
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}
