/**
 * Note content authority — 서버·클라 공유 SSOT.
 *
 * 계약: 사용자 본문은 Intent(matching base) 없이 침묵 회귀·동일길이 덮어쓰기 금지.
 * admin/note · noteOpLog 모두 이 모듈만 사용한다. 경로별 predicate 분기 금지.
 */

function isEmptyHtml(value: unknown): boolean {
  return value === ''
    || value === '<p></p>'
    || value === '<p><br></p>'
    || value === '<p><br class="ProseMirror-trailingBreak"></p>';
}

/** 권위 본문 문자열 — text/title/html 등 첫 비어 있지 않은 필드 */
export function readNoteContentAuthorityText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const record = content as Record<string, unknown>;
  for (const key of ['text', 'title', 'html', 'body', 'caption', 'url', 'page_document_id']) {
    const value = record[key];
    if (key === 'html' && isEmptyHtml(value)) continue;
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return '';
}

export function noteContentHasStructuredPresence(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false;
  const record = content as Record<string, unknown>;
  return Object.entries(record).some(([key, value]) => {
    if (['checked', 'collapsed', 'icon', 'blockColor', 'backgroundColor', 'color'].includes(key)) {
      return false;
    }
    if (typeof value === 'string') {
      if (key === 'html') return !isEmptyHtml(value);
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return false;
  });
}

/**
 * Passive/서버 공통 엄격 확장: 접두 + 더 김 + 짧은 접두(≤2) 오인·줄바꿈 paste 잔여 거부.
 */
export function isStrictNoteTextExtension(currentText: string, incomingText: string): boolean {
  if (!incomingText.startsWith(currentText) || incomingText.length <= currentText.length) {
    return false;
  }
  if (currentText.trim().length <= 2) return false;
  const suffix = incomingText.slice(currentText.length);
  if (/\n/.test(suffix) && suffix.trim().length > 0) return false;
  return true;
}

/**
 * true = 적용 금지 (stale / regressive).
 * false = materialize 허용.
 *
 * - base가 현재와 다르면: incoming≠current 이면 ignore (OT stale)
 * - base 일치: 의도된 편집 허용 (동일길이 rewrite 포함)
 * - base 없음: 빈→채움·엄격 확장만 허용. 동일길이·비확장 rewrite 금지
 */
export function shouldIgnoreRegressiveContentPatch(
  currentContent: unknown,
  incomingContent: unknown,
  baseContent?: unknown,
): boolean {
  const currentText = readNoteContentAuthorityText(currentContent).trim();
  const incomingText = readNoteContentAuthorityText(incomingContent).trim();
  const baseText = readNoteContentAuthorityText(baseContent).trim();
  const currentHasStructured = noteContentHasStructuredPresence(currentContent);
  const incomingHasStructured = noteContentHasStructuredPresence(incomingContent);
  const baseHasStructured = noteContentHasStructuredPresence(baseContent);

  if (!currentText && !currentHasStructured) return false;

  const baseProvided = Boolean(baseText || baseHasStructured);
  const baseMatchesCurrent = baseProvided
    && baseText === currentText
    && baseHasStructured === currentHasStructured;

  if (baseProvided && !baseMatchesCurrent) {
    return incomingText !== currentText
      || incomingHasStructured !== currentHasStructured;
  }

  if (!incomingText && !incomingHasStructured) {
    // 비우기: matching base만 허용
    return !baseMatchesCurrent;
  }
  if (!incomingText) return !baseMatchesCurrent;

  if (incomingText === currentText) return false;
  if (isStrictNoteTextExtension(currentText, incomingText)) return false;

  // 동일길이·비확장 rewrite: matching base 필수
  if (baseMatchesCurrent) return false;
  return true;
}
