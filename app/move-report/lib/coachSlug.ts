/** 브랜드·사칭·남용 방지: 예약 slug 외 추가 금지어 (소문자 정규화 후 비교) */
const SLUG_BLOCKLIST = new Set([
  'spokedu',
  'spokedu-kids',
  'spokedukids',
  'instagram',
  'facebook',
  'google',
  'naver',
  'kakao',
  'support',
  'help',
  'official',
  'move-report',
  'movereport',
  'spo-kedu',
]);

/** 예약어: 라우트·정적 경로와 충돌 방지 */
const RESERVED = new Set([
  'new',
  'dashboard',
  'shared',
  'api',
  'coach',
  'admin',
  'educator-beta',
  'opengraph-image',
  'intro',
  'setup',
  'survey',
  'result',
]);

/** 소문자·숫자·하이픈, 3~40자, 하이픈 연속 금지 */
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function normalizeCoachSlugInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, '-');
}

export function isValidCoachSlugFormat(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 40) return false;
  if (!SLUG_RE.test(slug)) return false;
  if (slug.includes('--')) return false;
  if (RESERVED.has(slug)) return false;
  return true;
}

/** DB unique·형식 통과 후에도 공개 등록을 막는 추가 차단 */
export function isCoachSlugBlocklisted(slug: string): boolean {
  const s = normalizeCoachSlugInput(slug);
  if (!s) return true;
  if (SLUG_BLOCKLIST.has(s)) return true;
  return false;
}
