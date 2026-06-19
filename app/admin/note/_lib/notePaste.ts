export function normalizeClipboardPlainText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function splitClipboardLines(raw: string): string[] {
  return normalizeClipboardPlainText(raw).split('\n');
}

/** 여러 줄 plain 붙여넣기 — TipTap 기본 HTML paste 대신 처리 */
export function shouldHandlePlainMultilinePaste(plain: string): boolean {
  return splitClipboardLines(plain).length > 1;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 줄마다 문단으로 삽입 (현재 블록 안) */
export function plainMultilineToInsertHtml(lines: string[]): string {
  return lines
    .map((line) => (line.length > 0 ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
    .join('');
}

const ADMIN_NOTE_ID_RE = /^(?:https?:\/\/[^/]+)?\/admin\/note\?id=([0-9a-f-]{36})$/i;
const PUBLIC_NOTE_TOKEN_RE = /^(?:https?:\/\/[^/]+)?\/note\/p\/([a-zA-Z0-9_-]+)$/;

/** 한 줄로 붙여넣은 노트·공개 페이지 URL */
export function tryParsePastedNotePageLink(plain: string): { href: string; label: string } | null {
  const trimmed = plain.trim();
  const adminMatch = trimmed.match(ADMIN_NOTE_ID_RE);
  if (adminMatch) {
    return { href: `/admin/note?id=${adminMatch[1]}`, label: '페이지 열기' };
  }
  const publicMatch = trimmed.match(PUBLIC_NOTE_TOKEN_RE);
  if (publicMatch) {
    return { href: `/note/p/${publicMatch[1]}`, label: '공개 페이지' };
  }
  return null;
}

export function parseAdminNoteDocumentIdFromHref(href: string): string | null {
  try {
    const url = href.startsWith('/') ? new URL(href, 'https://note.local') : new URL(href);
    if (!url.pathname.endsWith('/admin/note')) return null;
    const id = url.searchParams.get('id');
    return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function notePageLinkInsertHtml(link: { href: string; label: string }): string {
  return `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
}
