import type { TeacherInput } from '../types';

export function jsonMetadataSpan(memo: string, tag: string): { start: number; end: number } | null {
  const tags = /\b[A-Z][A-Z0-9_]*:/g;
  let match: RegExpExecArray | null;
  let result: { start: number; end: number } | null = null;
  while ((match = tags.exec(memo))) {
    let start = tags.lastIndex;
    while (/\s/.test(memo[start] ?? '') && start < memo.length) start++;
    if (memo[start] !== '[' && memo[start] !== '{') {
      if (match[0] === tag) throw new Error('SESSION_METADATA_INVALID');
      continue;
    }
    let depth = 0; let quoted = false; let escape = false; let end = -1;
    for (let i = start; i < memo.length; i++) {
      const char = memo[i];
      if (escape) { escape = false; continue; }
      if (quoted && char === '\\') { escape = true; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (quoted) continue;
      if (char === '[' || char === '{') depth++;
      if (char === ']' || char === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end < 0) throw new Error('SESSION_METADATA_INVALID');
    if (match[0] === tag) {
      if (result) throw new Error('SESSION_METADATA_DUPLICATE');
      JSON.parse(memo.slice(start, end));
      result = { start, end };
    }
    tags.lastIndex = end;
  }
  return result;
}

/** Replace only the JSON value; all other bytes, including snapshots, remain intact. */
export function replaceSessionAssistants(memo: string | null | undefined, assistants: TeacherInput[]): string {
  const source = memo ?? '';
  const span = jsonMetadataSpan(source, 'EXTRA_TEACHERS:');
  const value = JSON.stringify(assistants.map(({ id, price }) => ({ id, price })));
  if (span) return source.slice(0, span.start) + value + source.slice(span.end);
  if (!assistants.length) return source;
  return source + (source && !source.endsWith('\n') ? '\n' : '') + 'EXTRA_TEACHERS:' + value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateSessionAssistants(assistants: TeacherInput[], mainId: string | null): string | null {
  if (assistants.length > 2) return '보조강사는 최대 2명까지 배정할 수 있습니다.';
  const ids = new Set(mainId ? [mainId.toLowerCase()] : []);
  for (const teacher of assistants) {
    if (!UUID.test(teacher.id)) return '보조강사를 선택한 뒤 저장해 주세요.';
    if (ids.has(teacher.id.toLowerCase())) return '메인·보조강사는 중복 배정할 수 없습니다.';
    if (!Number.isSafeInteger(teacher.price) || teacher.price < 0) return '보조강사 금액은 0 이상의 정수여야 합니다.';
    ids.add(teacher.id.toLowerCase());
  }
  return null;
}

export function postponeRestoreAvailability(memo: string | null | undefined): 'snapshot' | 'legacy' | 'invalid' {
  try {
    const source = memo ?? '';
    const span = jsonMetadataSpan(source, 'POSTPONE_SNAPSHOT:');
    if (!span) return 'legacy';
    const snapshot: unknown = JSON.parse(source.slice(span.start, span.end));
    if (!Array.isArray(snapshot) || !snapshot.length) return 'invalid';
    return snapshot.every((item) => item && typeof item.id === 'string' && UUID.test(item.id)
      && typeof item.oldStartAt === 'string' && Number.isFinite(Date.parse(item.oldStartAt))
      && typeof item.shiftedStartAt === 'string' && Number.isFinite(Date.parse(item.shiftedStartAt))
      && Object.hasOwn(item, 'oldMemo') && Object.hasOwn(item, 'shiftedMemo')) ? 'snapshot' : 'invalid';
  } catch { return 'invalid'; }
}
