import type {
  CurriculumCommercialMode,
} from '@/app/spokedu/data/curriculum-commercial-modes';
import { curriculumModeLabel } from '@/app/spokedu/data/curriculum-commercial-modes';
import type { LeadEnvelope, LeadRoute } from '@/app/spokedu/data/lead-envelope';
import {
  privateFormatLabel,
  privateStartDirectionLabel,
  type PrivatePreferredFormat,
  type PrivateStartDirection,
} from '@/app/spokedu/data/private-page';

export type ConsultStructuredColumns = {
  lead_route: LeadRoute;
  curriculum_mode: CurriculumCommercialMode | null;
  private_start_direction: PrivateStartDirection | null;
  private_preferred_format: PrivatePreferredFormat | null;
  conversion_evidence_slug: string | null;
  lead_context: LeadEnvelope;
  source_lead_id?: string | null;
};

export type LeadInboxSummary = {
  badge: string;
  lines: readonly { label: string; value: string }[];
};

export function summarizeLeadRow(row: {
  lead_route: string | null;
  curriculum_mode: string | null;
  private_start_direction: string | null;
  private_preferred_format: string | null;
  conversion_evidence_slug: string | null;
  lead_context: LeadEnvelope | null;
  content: string;
  consult_type: string;
}): LeadInboxSummary {
  const route = (row.lead_route as LeadRoute | null) ?? inferRouteFallback(row);
  const ctx = row.lead_context;

  if (route === 'private') {
    const direction =
      row.private_start_direction &&
      (['confidence', 'fundamental', 'sport-prep', 'peer-group'] as const).includes(
        row.private_start_direction as PrivateStartDirection,
      )
        ? privateStartDirectionLabel(row.private_start_direction as PrivateStartDirection)
        : '미선택';
    const format =
      row.private_preferred_format &&
      (['one-to-one', 'small-group', 'undecided'] as const).includes(
        row.private_preferred_format as PrivatePreferredFormat,
      )
        ? privateFormatLabel(row.private_preferred_format as PrivatePreferredFormat)
        : '미정';
    const selection = ctx?.selection?.route === 'private' ? ctx.selection : null;
    return {
      badge: `개인수업 · ${direction}`,
      lines: [
        { label: '방식', value: format },
        { label: '강사 희망', value: selection?.instructorPreference?.trim() || '없음' },
        { label: '지역', value: selection?.region?.trim() || '—' },
        { label: '시간', value: selection?.schedule?.trim() || '—' },
      ],
    };
  }

  if (route === 'curriculum') {
    const mode = (row.curriculum_mode as CurriculumCommercialMode | null) ?? null;
    const modeLabel = mode ? curriculumModeLabel(mode) : '모드 미지정';
    const selection = ctx?.selection?.route === 'curriculum' ? ctx.selection : null;
    return {
      badge: `커리큘럼 · ${modeLabel}`,
      lines: [
        { label: '요청', value: selection?.contentType?.trim() || '—' },
        { label: '목적', value: selection?.purpose?.trim() || '—' },
        { label: '형태', value: selection?.partnershipType?.trim() || '—' },
        { label: '대상', value: selection?.targetAge?.trim() || '—' },
      ],
    };
  }

  if (route === 'dispatch') {
    const selection = ctx?.selection?.route === 'dispatch' ? ctx.selection : null;
    const programs = selection?.programs?.length ? selection.programs.join(', ') : extractProgramsFromContent(row.content);
    return {
      badge: `기관수업 · ${programs.split(',')[0]?.trim() || '운영안'}`,
      lines: [
        { label: '기관', value: selection?.organizationName?.trim() || extractOrgFromContent(row.content) },
        { label: '프로그램', value: programs || '—' },
        { label: '대상', value: selection?.targetAges?.length ? selection.targetAges.join(', ') : '—' },
        { label: '인원', value: selection?.headcount?.trim() || '—' },
        { label: '특수', value: selection?.specialNeeds?.trim() || '—' },
      ],
    };
  }

  return {
    badge: '기타 문의',
    lines: [{ label: '본문', value: row.content.slice(0, 80) || '—' }],
  };
}

function inferRouteFallback(row: { consult_type: string; content: string }): LeadRoute {
  if (row.consult_type === 'tutoring') return 'private';
  if (row.content.includes('[커리큘럼')) return 'curriculum';
  if (row.content.includes('[기관 맞춤 제안서 요청]')) return 'dispatch';
  return 'other';
}

function extractOrgFromContent(content: string): string {
  const m = content.match(/기관명\/센터명:\s*(.+)/);
  return m?.[1]?.trim() && m[1].trim() !== '-' ? m[1].trim() : '—';
}

function extractProgramsFromContent(content: string): string {
  const m = content.match(/희망 프로그램:\s*(.+)/);
  return m?.[1]?.trim() && m[1].trim() !== '-' ? m[1].trim() : '';
}
