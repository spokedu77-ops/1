/** 한글 음절 마지막 받침 여부 (이/가·은/는·을/를 선택) */
function hangulSyllableHasBatchim(ch: string): boolean {
  if (!ch) return false;
  const code = ch.codePointAt(0);
  if (code === undefined || code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function lastCharForParticle(name: string): string {
  const t = name.trim();
  if (!t) return '';
  const chars = Array.from(t);
  return chars[chars.length - 1] ?? '';
}

/**
 * 설문 원문(q/선지)에서 "아이·우리 아이"를 입력 이름으로 치환.
 * 이름이 비었거나 기본값 `아이`면 원문 유지.
 */
export function personalizeMoveReportQuestion(text: string, displayName: string): string {
  const raw = (displayName ?? '').trim();
  if (!raw || raw === '아이') return text;

  const last = lastCharForParticle(raw);
  const batchim = hangulSyllableHasBatchim(last);
  const iga = batchim ? '이' : '가';
  const eunneun = batchim ? '은' : '는';
  const eulreul = batchim ? '을' : '를';

  let s = text;
  const replacements: [string, string][] = [
    ['우리 아이의', `${raw}의`],
    ['우리 아이가', `${raw}${iga}`],
    ['우리 아이는', `${raw}${eunneun}`],
    ['우리 아이를', `${raw}${eulreul}`],
    ['아이의', `${raw}의`],
    ['아이는', `${raw}${eunneun}`],
    ['아이가', `${raw}${iga}`],
  ];
  for (const [from, to] of replacements) {
    s = s.split(from).join(to);
  }
  return s;
}
