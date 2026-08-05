/**
 * Note content authority — 서버·클라 공유 SSOT.
 *
 * 계약: 사용자 본문·체크는 Intent(matching base) 없이 침묵 회귀·동일길이 덮어쓰기 금지.
 * admin/note · noteOpLog 모두 이 모듈만 사용한다. 경로별 predicate 분기 금지.
 * 문서(공통보드·업무노트·하위페이지)와 무관 — 같은 판정만 탄다.
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

/** todo checked — true만 체크됨. 키 없음/false 동일축으로 비교 */
export function readNoteContentAuthorityChecked(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false;
  return (content as Record<string, unknown>).checked === true;
}

/** 비어 있지 않은 html 권위 문자열 — text와 별축 (서식-only 침묵 교체 차단) */
export function readNoteContentAuthorityHtml(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const html = (content as Record<string, unknown>).html;
  if (typeof html !== 'string' || isEmptyHtml(html)) return '';
  return html.trim();
}

export function noteContentHasCheckedField(content: unknown): boolean {
  return Boolean(content && typeof content === 'object' && 'checked' in (content as object));
}

/** 사용자 기록 보호 대상 — text/title/html/url/page·체크 */
export function noteContentHasProtectableUserPayload(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false;
  if (readNoteContentAuthorityChecked(content)) return true;
  if (readNoteContentAuthorityText(content).trim().length > 0) return true;
  return noteContentHasStructuredPresence(content);
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
 * - base가 현재와 다르면: incoming≠current 이면 ignore (OT stale) — text·structured·checked
 * - base 일치: 의도된 편집 허용 (동일길이 rewrite·체크 토글 포함)
 * - base 없음: 빈→채움·엄격 확장만 허용. 동일길이·비확장 rewrite·침묵 체크 뒤집기 금지
 */
export function shouldIgnoreRegressiveContentPatch(
  currentContent: unknown,
  incomingContent: unknown,
  baseContent?: unknown,
): boolean {
  const currentText = readNoteContentAuthorityText(currentContent).trim();
  const incomingText = readNoteContentAuthorityText(incomingContent).trim();
  const baseText = readNoteContentAuthorityText(baseContent).trim();
  const currentHtml = readNoteContentAuthorityHtml(currentContent);
  const incomingHtml = readNoteContentAuthorityHtml(incomingContent);
  const baseHtml = readNoteContentAuthorityHtml(baseContent);
  const currentHasStructured = noteContentHasStructuredPresence(currentContent);
  const incomingHasStructured = noteContentHasStructuredPresence(incomingContent);
  const baseHasStructured = noteContentHasStructuredPresence(baseContent);
  const currentChecked = readNoteContentAuthorityChecked(currentContent);
  const incomingChecked = readNoteContentAuthorityChecked(incomingContent);
  const baseChecked = readNoteContentAuthorityChecked(baseContent);
  const baseHasCheckedField = noteContentHasCheckedField(baseContent);
  const currentHasCheckedField = noteContentHasCheckedField(currentContent);

  // 빈 본문이어도 체크된 todo는 보호 대상
  if (!currentText && !currentHasStructured && !currentChecked) return false;

  const baseProvided = Boolean(baseText || baseHasStructured || baseHasCheckedField || baseHtml);
  const baseCheckedMatches = !currentHasCheckedField && !baseHasCheckedField
    ? true
    : baseChecked === currentChecked;
  const baseMatchesCurrent = baseProvided
    && baseText === currentText
    && baseHasStructured === currentHasStructured
    && baseCheckedMatches
    && baseHtml === currentHtml;

  const incomingEqualsCurrent = incomingText === currentText
    && incomingHasStructured === currentHasStructured
    && incomingChecked === currentChecked
    && incomingHtml === currentHtml;

  if (baseProvided && !baseMatchesCurrent) {
    // stale base: no-op만 허용 (체크·html 포함)
    return !incomingEqualsCurrent;
  }

  if (!incomingText && !incomingHasStructured) {
    // 비우기·빈 본문 체크 변경: matching base만 허용
    return !baseMatchesCurrent;
  }
  if (!incomingText) return !baseMatchesCurrent;

  if (incomingText === currentText) {
    if (incomingChecked === currentChecked && incomingHtml === currentHtml) return false;
    // 본문 문자열 동일·체크/html만 flip: Intent(matching base) 필수
    return !baseMatchesCurrent;
  }
  if (isStrictNoteTextExtension(currentText, incomingText)) return false;

  // 동일길이·비확장 rewrite: matching base 필수
  if (baseMatchesCurrent) return false;
  return true;
}
