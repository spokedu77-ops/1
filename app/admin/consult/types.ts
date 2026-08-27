import type { LeadEnvelope } from '@/app/spokedu/data/lead-envelope';
import type { LeadSummaryView } from '@/app/lib/admin/leadInboxSummary';

export type ConsultRow = {
  id: string;
  parent_name: string;
  phone: string | null;
  child_age: string | null;
  content: string;
  consult_type: 'tutoring' | 'center' | string;
  status: string;
  created_at: string;
  lead_route?: string | null;
  lead_context?: LeadEnvelope | null;
  curriculum_mode?: string | null;
  private_start_direction?: string | null;
  private_preferred_format?: string | null;
  conversion_evidence_slug?: string | null;
  source_lead_id?: string | null;
  /** 목록 API가 서버에서 붙인 요약(선택) */
  summary?: LeadSummaryView;
};

export const STATUS_LABEL: Record<string, string> = {
  pending: '미확인',
  done: '확인완료',
};

export type RouteTab = 'all' | 'private' | 'curriculum' | 'dispatch' | 'other';

export function formatConsultDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return iso;
  }
}

export function formatConsultDateShort(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}
