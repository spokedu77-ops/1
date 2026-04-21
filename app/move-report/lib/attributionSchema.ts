/** URL·제출·이벤트 meta에 실을 수 있는 attribution 키 (referrer_host는 캡처 전용, 공유 URL에는 붙이지 않음) */
export const MOVE_REPORT_ATTRIBUTION_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ref',
  'gclid',
  'fbclid',
] as const;

const STORED_KEYS = new Set<string>([...MOVE_REPORT_ATTRIBUTION_QUERY_KEYS, 'referrer_host']);

const MAX_LEN = 256;

/** API/DB 저장용: 허용 키만 문자열로 정규화 */
export function normalizeMoveReportAttribution(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!STORED_KEYS.has(k)) continue;
    if (typeof v !== 'string') continue;
    const t = v.trim().slice(0, MAX_LEN);
    if (t) out[k] = t;
  }
  return out;
}
