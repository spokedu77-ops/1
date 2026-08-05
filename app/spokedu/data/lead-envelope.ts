import type { CurriculumCommercialMode } from './curriculum-commercial-modes';
import type { PrivatePreferredFormat, PrivateStartDirection } from './private-page';

export type LeadRoute = 'private' | 'curriculum' | 'dispatch' | 'other';

export type AcquisitionEntrySurface = 'home' | 'programs' | 'record' | 'campaign' | 'direct';

export type AcquisitionContext = {
  entrySurface: AcquisitionEntrySurface;
  entryId?: string;
  utmSource?: string;
  utmCampaign?: string;
};

export type PrivateRouteSelection = {
  route: 'private';
  startDirection?: PrivateStartDirection;
  preferredFormat?: PrivatePreferredFormat;
  sport?: string;
  instructorPreference?: string;
  region?: string;
  schedule?: string;
};

export type CurriculumRouteSelection = {
  route: 'curriculum';
  mode: CurriculumCommercialMode;
  contentType?: string;
  purpose?: string;
  teacherTraining?: string;
  partnershipType?: string;
  targetAge?: string;
};

export type DispatchRouteSelection = {
  route: 'dispatch';
  programs: readonly string[];
  targetAges: readonly string[];
  headcount?: string;
  specialNeeds?: string;
  location?: string;
  organizationName?: string;
};

export type OtherRouteSelection = {
  route: 'other';
  note?: string;
};

export type RouteSelection =
  | PrivateRouteSelection
  | CurriculumRouteSelection
  | DispatchRouteSelection
  | OtherRouteSelection;

/** 클라이언트가 보내는 입력 — submittedAt 없음 */
export type LeadEnvelopeInput = {
  schemaVersion: 1;
  route: LeadRoute;
  acquisition: AcquisitionContext;
  selection: RouteSelection;
  /** CTA를 발생시킨 사례만 (브라우징 이력 금지) */
  conversionEvidenceSlug?: string;
  ctaIntentId: string;
};

/** 서버가 확정한 immutable snapshot */
export type LeadEnvelope = LeadEnvelopeInput & {
  schemaVersion: 1;
};

export type AllowedCtaIntentId =
  | 'private_fit_consult'
  | 'package_quote'
  | 'training_consult'
  | 'master_view'
  | 'master_org_inquiry'
  | 'license_consult'
  | 'dispatch_proposal'
  | 'other_contact';

const ENTRY_SURFACES: readonly AcquisitionEntrySurface[] = [
  'home',
  'programs',
  'record',
  'campaign',
  'direct',
];

export function isLeadRoute(value: string): value is LeadRoute {
  return value === 'private' || value === 'curriculum' || value === 'dispatch' || value === 'other';
}

export function isAcquisitionEntrySurface(value: string): value is AcquisitionEntrySurface {
  return (ENTRY_SURFACES as readonly string[]).includes(value);
}

export function normalizeAcquisition(raw: unknown): AcquisitionContext {
  if (!raw || typeof raw !== 'object') {
    return { entrySurface: 'direct' };
  }
  const obj = raw as Record<string, unknown>;
  const surface =
    typeof obj.entrySurface === 'string' && isAcquisitionEntrySurface(obj.entrySurface)
      ? obj.entrySurface
      : 'direct';
  return {
    entrySurface: surface,
    entryId: typeof obj.entryId === 'string' && obj.entryId.trim() ? obj.entryId.trim() : undefined,
    utmSource: typeof obj.utmSource === 'string' && obj.utmSource.trim() ? obj.utmSource.trim() : undefined,
    utmCampaign:
      typeof obj.utmCampaign === 'string' && obj.utmCampaign.trim() ? obj.utmCampaign.trim() : undefined,
  };
}

/** route + selection 조합에 허용된 CTA */
export function isAllowedCtaIntent(route: LeadRoute, selection: RouteSelection, ctaIntentId: string): boolean {
  if (route === 'private' && selection.route === 'private') {
    return ctaIntentId === 'private_fit_consult';
  }
  if (route === 'curriculum' && selection.route === 'curriculum') {
    switch (selection.mode) {
      case 'package':
        return ctaIntentId === 'package_quote';
      case 'training':
        return ctaIntentId === 'training_consult';
      case 'master':
        return ctaIntentId === 'master_org_inquiry' || ctaIntentId === 'master_view';
      case 'license':
        return ctaIntentId === 'license_consult';
      default:
        return false;
    }
  }
  if (route === 'dispatch' && selection.route === 'dispatch') {
    return ctaIntentId === 'dispatch_proposal';
  }
  if (route === 'other' && selection.route === 'other') {
    return ctaIntentId === 'other_contact';
  }
  return false;
}

export type BuildLeadEnvelopeResult =
  | { ok: true; envelope: LeadEnvelope }
  | { ok: false; message: string };

export function buildLeadEnvelope(input: LeadEnvelopeInput): BuildLeadEnvelopeResult {
  if (input.schemaVersion !== 1) {
    return { ok: false, message: '지원하지 않는 lead schemaVersion입니다.' };
  }
  if (!isLeadRoute(input.route)) {
    return { ok: false, message: 'lead_route가 올바르지 않습니다.' };
  }
  if (input.selection.route !== input.route) {
    return { ok: false, message: 'selection.route와 lead_route가 일치하지 않습니다.' };
  }
  if (!input.ctaIntentId.trim()) {
    return { ok: false, message: 'ctaIntentId가 필요합니다.' };
  }
  if (!isAllowedCtaIntent(input.route, input.selection, input.ctaIntentId)) {
    return { ok: false, message: '허용되지 않은 route·선택·CTA 조합입니다.' };
  }

  const acquisition = normalizeAcquisition(input.acquisition);
  const conversionEvidenceSlug = input.conversionEvidenceSlug?.trim() || undefined;

  return {
    ok: true,
    envelope: {
      schemaVersion: 1,
      route: input.route,
      acquisition,
      selection: input.selection,
      conversionEvidenceSlug,
      ctaIntentId: input.ctaIntentId.trim(),
    },
  };
}

/** 관리자 필터용 전용 컬럼 — envelope에서만 파생 (클라이언트 이중 전송 금지) */
export function deriveConsultColumns(envelope: LeadEnvelope): {
  lead_route: LeadRoute;
  curriculum_mode: CurriculumCommercialMode | null;
  private_start_direction: PrivateStartDirection | null;
  private_preferred_format: PrivatePreferredFormat | null;
  conversion_evidence_slug: string | null;
  lead_context: LeadEnvelope;
} {
  const curriculum_mode =
    envelope.selection.route === 'curriculum' ? envelope.selection.mode : null;
  const private_start_direction =
    envelope.selection.route === 'private' ? envelope.selection.startDirection ?? null : null;
  const private_preferred_format =
    envelope.selection.route === 'private' ? envelope.selection.preferredFormat ?? null : null;

  return {
    lead_route: envelope.route,
    curriculum_mode,
    private_start_direction,
    private_preferred_format,
    conversion_evidence_slug: envelope.conversionEvidenceSlug ?? null,
    lead_context: envelope,
  };
}

export type LeadResponseChecklist = {
  title: string;
  items: readonly string[];
};

export function getLeadResponseChecklist(args: {
  leadRoute: LeadRoute | null | undefined;
  curriculumMode?: CurriculumCommercialMode | null;
  privateStartDirection?: PrivateStartDirection | null;
}): LeadResponseChecklist {
  const route = args.leadRoute ?? 'other';

  if (route === 'private') {
    return {
      title: '개인수업 첫 통화 체크리스트',
      items: [
        '시작 방향·수업 형태 재확인',
        '지역·가능 시간·방문 장소',
        '지도자 희망(성별·종목 경험)',
        '첫 수업 후 적합성 재점검 안내',
      ],
    };
  }

  if (route === 'curriculum') {
    switch (args.curriculumMode) {
      case 'package':
        return {
          title: '자료·패키지 확인',
          items: ['대상 연령·기관 수', '프로그램·수업안 범위', '납품 형태(파일/교육 포함)', '희망 일정'],
        };
      case 'training':
        return {
          title: '교육·도입 확인',
          items: ['교육 인원', '장소·온라인 여부', '교육 시간·회차', '필요한 프로그램(SPOMOVE 포함)'],
        };
      case 'master':
        return {
          title: 'MASTER 기관·단체 확인',
          items: ['개인 지도자 vs 기관', '계정 수', 'SPOMOVE 사용 여부', '결제·도입 일정'],
        };
      case 'license':
        return {
          title: '라이선스·파트너 확인',
          items: ['국가·지역', '운영 형태', '예상 지도자 수', '번역·현지화 필요 여부'],
        };
      default:
        return {
          title: '커리큘럼 문의 확인',
          items: ['도입 모드 재확인', '필요 콘텐츠 범위', '일정·인원'],
        };
    }
  }

  if (route === 'dispatch') {
    return {
      title: '기관수업 확인',
      items: ['공간·인원·연령', '희망 프로그램', '일정·횟수', '특수·통합 운영 여부', '제안서 범위'],
    };
  }

  return {
    title: '일반 문의 확인',
    items: ['문의 목적', '연락 가능 시간', '다음 액션'],
  };
}

export function leadRouteLabel(route: LeadRoute | null | undefined): string {
  switch (route) {
    case 'private':
      return '개인수업';
    case 'curriculum':
      return '커리큘럼';
    case 'dispatch':
      return '기관수업';
    case 'other':
      return '기타';
    default:
      return '미분류';
  }
}
