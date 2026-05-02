/**
 * 관리자 유입 출처 표시용 — events.meta.attribution 및 코치 메타를 우선순위로 정리.
 * 1) mr_source  2) utm_source  3) coachSlug(메타) → coach_link
 * 4) shared 관련 이벤트는 shared  5) referrer_host  6) 직접
 */

export type MoveReportSourceBucket = 'mr_source' | 'utm' | 'coach_link' | 'shared' | 'ref' | 'direct';

function parseAttribution(meta: unknown): Record<string, string> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
  const m = meta as { attribution?: unknown };
  if (!m.attribution || typeof m.attribution !== 'object' || Array.isArray(m.attribution)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m.attribution as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return out;
}

const SHARED_EVENTS = new Set(['move_report_shared_page_viewed', 'move_report_shared_page_start_clicked', 'move_report_shared_page_link_copied']);

export function classifyMoveReportEventSource(meta: unknown, eventName?: string): { label: string; bucket: MoveReportSourceBucket } {
  const attr = parseAttribution(meta);
  const mr = attr.mr_source?.trim();
  if (mr === 'coach_link') return { label: 'coach_link', bucket: 'coach_link' };
  if (mr === 'shared') return { label: 'shared', bucket: 'shared' };
  if (mr === 'parent_direct') return { label: 'parent_direct', bucket: 'mr_source' };
  if (mr === 'educator_campaign') return { label: 'educator_campaign', bucket: 'mr_source' };
  if (mr) return { label: `mr_source:${mr}`, bucket: 'mr_source' };

  const utm = attr.utm_source?.trim();
  if (utm) return { label: utm, bucket: 'utm' };

  const m = meta as { coachSlug?: unknown } | null;
  if (typeof m?.coachSlug === 'string' && m.coachSlug.trim()) {
    return { label: 'coach_link', bucket: 'coach_link' };
  }

  if (eventName && SHARED_EVENTS.has(eventName)) {
    return { label: 'shared', bucket: 'shared' };
  }

  const ref = attr.referrer_host?.trim();
  if (ref) return { label: ref, bucket: 'ref' };

  return { label: '(직접 / 미분류)', bucket: 'direct' };
}
