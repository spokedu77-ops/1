import { parseInlineMarkupToHtml } from './inlineMarkup';

export type RichPreviewField = 'text' | 'body';

function legacyTextToPreviewHtml(text: string): string {
  if (text.trim().length === 0) return '<p></p>';
  const html = parseInlineMarkupToHtml(text);
  const lines = html.split('\n');
  return lines.map((line) => `<p>${line || '<br>'}</p>`).join('');
}

/** 읽기 전용 블록 미리보기용 HTML (TipTap 마운트 전) */
export function resolveRichPreviewHtml({
  content,
  field,
  text,
}: {
  content: Record<string, unknown> | null | undefined;
  field: RichPreviewField;
  text: string;
}): string {
  const htmlKey = field === 'body' ? 'bodyHtml' : 'html';
  const legacyHtmlKey = field === 'body' ? 'legacyBodyHtml' : null;
  const html = content?.[htmlKey];
  if (typeof html === 'string' && html.trim().length > 0) return html;
  if (legacyHtmlKey) {
    const legacyHtml = content?.[legacyHtmlKey];
    if (typeof legacyHtml === 'string' && legacyHtml.trim().length > 0) return legacyHtml;
  }
  return legacyTextToPreviewHtml(text);
}

export function isRichPreviewEmpty(html: string, text: string): boolean {
  return text.trim().length === 0 && (html.trim().length === 0 || html === '<p></p>');
}
