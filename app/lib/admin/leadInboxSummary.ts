import type {
  CurriculumCommercialMode,
} from '@/app/spokedu/data/curriculum-commercial-modes';
import { curriculumModeLabel } from '@/app/spokedu/data/curriculum-commercial-modes';
import type { LeadEnvelope, LeadRoute } from '@/app/spokedu/data/lead-envelope';
import { isLeadRoute } from '@/app/spokedu/data/lead-envelope';
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

/** 목록·상세·필터에서 공통으로 쓰는 route 판별 입력 */
export type LeadRouteResolvable = {
  lead_route?: string | null;
  consult_type?: string | null;
  content?: string | null;
  lead_context?: LeadEnvelope | null;
};

export type LeadSummaryFacts = {
  location?: string;
  preferredTime?: string;
  coachGender?: string;
  sport?: string;
  format?: string;
  organization?: string;
  programs?: string;
  targetAge?: string;
  headcount?: string;
  contentType?: string;
  purpose?: string;
  partnershipType?: string;
};

export type LeadSummaryView = {
  route: LeadRoute;
  title: string;
  /** 목록 문의 컬럼 2번째 줄 — route와 중복되지 않는 분류 정보 */
  subtitle?: string;
  facts: LeadSummaryFacts;
  tags: string[];
  request?: string;
  /** 상세 모달용 전체 fact 행 (비어 있으면 숨김) */
  detailRows: readonly { label: string; value: string }[];
};

const EMPTY_MARKERS = new Set([
  '',
  '-',
  '—',
  '없음',
  '미정',
  '미선택',
  '미지정',
  '[정보 미기재]',
  '별도 희망 없음',
  '상담 후 결정',
  '상관없음',
]);

const LIST_TAG_LIMIT = 4;

export function trimLeadLine(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

export function isMeaningfulLeadValue(value: unknown): boolean {
  const v = trimLeadLine(value);
  if (!v) return false;
  if (EMPTY_MARKERS.has(v)) return false;
  return true;
}

/** content 원문의 `라벨 : 값` / `라벨: 값` 한 줄 추출 */
export function extractPrivateField(content: string, label: string): string {
  if (!content || !label) return '';
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 번호 접두(3. / 7.) 및 괄호 보조 표기 허용
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:\\d+\\.\\s*)?${escaped}(?:\\([^\\n)]*\\))?\\s*[:：]\\s*(.+)`,
    'i',
  );
  const m = content.match(re);
  if (!m?.[1]) return '';
  const raw = m[1].trim();
  if (!isMeaningfulLeadValue(raw)) return '';
  return raw;
}

export function resolveLeadRoute(row: LeadRouteResolvable): LeadRoute {
  // 1) lead_context.route 2) lead_route 3) consult_type 4) content
  const ctxRoute = row.lead_context?.route;
  if (ctxRoute && isLeadRoute(ctxRoute)) {
    return ctxRoute;
  }
  if (row.lead_route && isLeadRoute(row.lead_route)) {
    return row.lead_route;
  }
  const consultType = (row.consult_type ?? '').trim();
  if (consultType === 'tutoring') return 'private';
  if (consultType === 'center') return 'dispatch';

  const content = row.content ?? '';
  if (content.includes('[lead_route] private') || content.includes('[문의 type]\nprivate')) {
    return 'private';
  }
  if (content.includes('[커리큘럼') || content.includes('[lead_route] curriculum')) {
    return 'curriculum';
  }
  if (
    content.includes('[기관 맞춤 제안서 요청]') ||
    content.includes('[lead_route] dispatch') ||
    content.includes('[문의 type]\ndispatch')
  ) {
    return 'dispatch';
  }
  return 'other';
}

function shortenLocation(raw: string): string {
  return trimLeadLine(
    raw
      .replace(/\s*근처\s*$/u, '')
      .replace(/^(서울특별시|서울시|서울)\s*/u, '')
      .replace(/\s+/g, ' '),
  );
}

function normalizePreferredTime(raw: string): string {
  return trimLeadLine(raw)
    .replace(/\s*,\s*/g, '·')
    .replace(/\s*\/\s*/g, '·')
    .replace(/\s*·\s*/g, '·')
    .replace(/\s+/g, ' ');
}

function pushUnique(tags: string[], value: string | undefined, limit = LIST_TAG_LIMIT) {
  const v = trimLeadLine(value);
  if (!isMeaningfulLeadValue(v)) return;
  if (tags.some((t) => t === v)) return;
  if (tags.length >= limit) return;
  tags.push(v);
}

function sportTags(sport: string | undefined): string[] {
  if (!isMeaningfulLeadValue(sport)) return [];
  return sport!
    .split(/[·,|/]/)
    .map((s) => trimLeadLine(s))
    .filter((s) => isMeaningfulLeadValue(s));
}

function requestLooksLikePlaceInquiry(request: string | undefined): boolean {
  if (!request) return false;
  return /장소|위치|어디|공간|체육관|공원/.test(request);
}

type SummarizeInput = {
  lead_route?: string | null;
  curriculum_mode?: string | null;
  private_start_direction?: string | null;
  private_preferred_format?: string | null;
  conversion_evidence_slug?: string | null;
  lead_context?: LeadEnvelope | null;
  content?: string | null;
  consult_type?: string | null;
};

function asPrivateDirection(value: string | null | undefined): PrivateStartDirection | null {
  if (
    value &&
    (['confidence', 'fundamental', 'sport-prep', 'peer-group'] as const).includes(
      value as PrivateStartDirection,
    )
  ) {
    return value as PrivateStartDirection;
  }
  return null;
}

function asPrivateFormat(value: string | null | undefined): PrivatePreferredFormat | null {
  if (value && (['one-to-one', 'small-group', 'undecided'] as const).includes(value as PrivatePreferredFormat)) {
    return value as PrivatePreferredFormat;
  }
  return null;
}

function summarizePrivate(row: SummarizeInput, route: LeadRoute): LeadSummaryView {
  const content = row.content ?? '';
  const ctx = row.lead_context;
  const selection = ctx?.selection?.route === 'private' ? ctx.selection : null;

  const directionId =
    asPrivateDirection(row.private_start_direction) ??
    asPrivateDirection(selection?.startDirection ?? null);
  const directionLabel = directionId ? privateStartDirectionLabel(directionId) : null;

  const formatId =
    asPrivateFormat(row.private_preferred_format) ??
    asPrivateFormat(selection?.preferredFormat ?? null);
  const formatLabel = formatId ? privateFormatLabel(formatId) : '';

  const locationRaw =
    trimLeadLine(selection?.region) ||
    extractPrivateField(content, '방문 지역/장소') ||
    extractPrivateField(content, '희망 방문 지역 및 장소');
  const preferredTimeRaw =
    trimLeadLine(selection?.schedule) || extractPrivateField(content, '가능 시간대');
  const coachRaw =
    trimLeadLine(selection?.instructorPreference) || extractPrivateField(content, '지도자 희망');
  const sportRaw =
    trimLeadLine(selection?.sport) ||
    extractPrivateField(content, '희망 종목') ||
    extractPrivateField(content, '희망 종목(보조)') ||
    extractPrivateField(content, '관심 종목');
  const requestRaw =
    extractPrivateField(content, '전하고 싶은 말') ||
    extractPrivateField(content, '기타 문의 내용') ||
    extractPrivateField(content, '기타 문의');

  const locationFull = isMeaningfulLeadValue(locationRaw)
    ? trimLeadLine(locationRaw.replace(/\s*근처\s*$/u, ''))
    : undefined;
  const location = locationFull ? shortenLocation(locationFull) : undefined;
  const preferredTime = isMeaningfulLeadValue(preferredTimeRaw)
    ? normalizePreferredTime(preferredTimeRaw)
    : undefined;
  const coachGender = isMeaningfulLeadValue(coachRaw) ? trimLeadLine(coachRaw) : undefined;
  const sport = isMeaningfulLeadValue(sportRaw) ? trimLeadLine(sportRaw) : undefined;
  const format =
    isMeaningfulLeadValue(formatLabel) && formatId !== 'undecided' ? formatLabel : undefined;
  const request = isMeaningfulLeadValue(requestRaw) ? trimLeadLine(requestRaw) : undefined;

  const tags: string[] = [];
  const sports = sportTags(sport);
  if (sports.length >= 2 && sports.every((s) => /야구|축구|농구|배구|테니스|배드민턴|핸드볼/.test(s))) {
    pushUnique(tags, '구기종목');
  } else {
    for (const s of sports) pushUnique(tags, s);
  }
  pushUnique(tags, format);
  pushUnique(tags, coachGender);
  if (requestLooksLikePlaceInquiry(request)) pushUnique(tags, '장소 문의');

  const subtitle = directionLabel || format || sport || undefined;
  const title = subtitle ? `개인수업 · ${subtitle}` : '개인수업';

  const detailRows: { label: string; value: string }[] = [];
  if (directionLabel) detailRows.push({ label: '프로그램 방향', value: directionLabel });
  if (format) detailRows.push({ label: '수업 형태', value: format });
  if (locationFull) detailRows.push({ label: '지역', value: locationFull });
  if (preferredTime) detailRows.push({ label: '희망 시간', value: preferredTime });
  if (sport) detailRows.push({ label: '관심 종목', value: sport });
  if (coachGender) detailRows.push({ label: '지도자 희망', value: coachGender });

  return {
    route,
    title,
    subtitle,
    facts: {
      location,
      preferredTime,
      coachGender,
      sport,
      format,
    },
    tags,
    request,
    detailRows,
  };
}

function summarizeCurriculum(row: SummarizeInput, route: LeadRoute): LeadSummaryView {
  const content = row.content ?? '';
  const ctx = row.lead_context;
  const selection = ctx?.selection?.route === 'curriculum' ? ctx.selection : null;
  const mode = (row.curriculum_mode as CurriculumCommercialMode | null) ?? selection?.mode ?? null;
  const modeLabel = mode ? curriculumModeLabel(mode) : null;

  const contentType =
    trimLeadLine(selection?.contentType) ||
    extractPrivateField(content, '요청') ||
    extractPrivateField(content, '콘텐츠');
  const purpose = trimLeadLine(selection?.purpose) || extractPrivateField(content, '목적');
  const partnershipType =
    trimLeadLine(selection?.partnershipType) || extractPrivateField(content, '형태');
  const targetAge = trimLeadLine(selection?.targetAge) || extractPrivateField(content, '대상');

  const tags: string[] = [];
  pushUnique(tags, isMeaningfulLeadValue(contentType) ? contentType : undefined);
  pushUnique(tags, isMeaningfulLeadValue(purpose) ? purpose : undefined);
  pushUnique(tags, isMeaningfulLeadValue(partnershipType) ? partnershipType : undefined);

  const detailRows: { label: string; value: string }[] = [];
  if (isMeaningfulLeadValue(contentType)) detailRows.push({ label: '요청', value: contentType! });
  if (isMeaningfulLeadValue(purpose)) detailRows.push({ label: '목적', value: purpose! });
  if (isMeaningfulLeadValue(partnershipType)) {
    detailRows.push({ label: '형태', value: partnershipType! });
  }
  if (isMeaningfulLeadValue(targetAge)) detailRows.push({ label: '대상', value: targetAge! });

  return {
    route,
    title: modeLabel ? `커리큘럼 · ${modeLabel}` : '커리큘럼',
    subtitle: modeLabel || undefined,
    facts: {
      contentType: isMeaningfulLeadValue(contentType) ? contentType : undefined,
      purpose: isMeaningfulLeadValue(purpose) ? purpose : undefined,
      partnershipType: isMeaningfulLeadValue(partnershipType) ? partnershipType : undefined,
      targetAge: isMeaningfulLeadValue(targetAge) ? targetAge : undefined,
    },
    tags,
    detailRows,
  };
}

function extractOrgFromContent(content: string): string {
  return (
    extractPrivateField(content, '기관명/센터명') ||
    extractPrivateField(content, '기관명') ||
    ''
  );
}

function extractProgramsFromContent(content: string): string {
  return extractPrivateField(content, '희망 프로그램') || '';
}

function summarizeDispatch(row: SummarizeInput, route: LeadRoute): LeadSummaryView {
  const content = row.content ?? '';
  const ctx = row.lead_context;
  const selection = ctx?.selection?.route === 'dispatch' ? ctx.selection : null;

  const programsRaw = selection?.programs?.length
    ? selection.programs.join(', ')
    : extractProgramsFromContent(content);
  const organization =
    trimLeadLine(selection?.organizationName) || extractOrgFromContent(content) || undefined;
  const locationRaw =
    trimLeadLine(selection?.location) ||
    extractPrivateField(content, '기관 소재지') ||
    extractPrivateField(content, '지역') ||
    extractPrivateField(content, '장소') ||
    '';
  const locationFull = isMeaningfulLeadValue(locationRaw) ? trimLeadLine(locationRaw) : undefined;
  const location = locationFull ? shortenLocation(locationFull) : undefined;
  const targetAge = selection?.targetAges?.length
    ? selection.targetAges.join(', ')
    : extractPrivateField(content, '대상 연령') ||
      extractPrivateField(content, '대상') ||
      undefined;
  const headcount =
    trimLeadLine(selection?.headcount) || extractPrivateField(content, '인원') || undefined;
  const special =
    trimLeadLine(selection?.specialNeeds) ||
    extractPrivateField(content, '특수 아동 참여 유무') ||
    extractPrivateField(content, '특수') ||
    undefined;
  const startDate = extractPrivateField(content, '파견 희망 시작일');
  const endDate = extractPrivateField(content, '파견 희망 종료일');
  const period =
    isMeaningfulLeadValue(startDate) || isMeaningfulLeadValue(endDate)
      ? [startDate, endDate].filter((v) => isMeaningfulLeadValue(v)).join(' ~ ')
      : undefined;
  const inquiry =
    extractPrivateField(content, '희망 수업 내용/방향성') ||
    (() => {
      const idx = content.indexOf('[희망 수업 내용/방향성]');
      if (idx < 0) return '';
      return content
        .slice(idx)
        .split('\n')
        .slice(1)
        .map((l) => l.trim())
        .find((l) => l && l !== '-' && !l.startsWith('유입'));
    })() ||
    undefined;

  const programs = isMeaningfulLeadValue(programsRaw) ? trimLeadLine(programsRaw) : undefined;
  const programHead = programs?.split(',')[0]?.trim();
  const subtitle = programHead || (isMeaningfulLeadValue(organization) ? organization : undefined);

  const tags: string[] = [];
  if (programs) {
    for (const p of programs.split(/[,|/]/)) pushUnique(tags, p);
  }
  if (isMeaningfulLeadValue(targetAge)) pushUnique(tags, trimLeadLine(targetAge));
  if (isMeaningfulLeadValue(headcount)) pushUnique(tags, `인원 ${trimLeadLine(headcount)}`);
  if (period) pushUnique(tags, period);

  const detailRows: { label: string; value: string }[] = [];
  if (isMeaningfulLeadValue(organization)) detailRows.push({ label: '기관', value: organization! });
  if (locationFull) detailRows.push({ label: '소재지', value: locationFull });
  if (programs) detailRows.push({ label: '프로그램', value: programs });
  if (isMeaningfulLeadValue(targetAge)) detailRows.push({ label: '대상', value: trimLeadLine(targetAge!) });
  if (isMeaningfulLeadValue(headcount)) detailRows.push({ label: '인원', value: trimLeadLine(headcount!) });
  if (period) detailRows.push({ label: '운영 기간', value: period });
  if (isMeaningfulLeadValue(special)) detailRows.push({ label: '특수', value: trimLeadLine(special!) });

  const request = isMeaningfulLeadValue(inquiry)
    ? trimLeadLine(inquiry!)
    : isMeaningfulLeadValue(special)
      ? trimLeadLine(special!)
      : undefined;

  return {
    route,
    title: subtitle ? `기관수업 · ${subtitle}` : '기관수업',
    subtitle,
    facts: {
      organization: isMeaningfulLeadValue(organization) ? organization : undefined,
      programs,
      location,
      targetAge: isMeaningfulLeadValue(targetAge) ? trimLeadLine(targetAge!) : undefined,
      headcount: isMeaningfulLeadValue(headcount) ? trimLeadLine(headcount!) : undefined,
    },
    tags,
    request,
    detailRows,
  };
}

function summarizeOther(row: SummarizeInput, route: LeadRoute): LeadSummaryView {
  const content = (row.content ?? '').trim();
  const snippet = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .find((l) => !l.startsWith('[') && l.length > 2);
  const request = snippet ? snippet.slice(0, 120) : undefined;
  return {
    route,
    title: '기타 문의',
    facts: {},
    tags: [],
    request,
    detailRows: request ? [{ label: '본문', value: request }] : [],
  };
}

/** 문의 데이터 → 관리자 CRM용 구조화 요약 */
export function summarizeLeadRow(row: SummarizeInput): LeadSummaryView {
  const route = resolveLeadRoute(row);
  if (route === 'private') return summarizePrivate(row, route);
  if (route === 'curriculum') return summarizeCurriculum(row, route);
  if (route === 'dispatch') return summarizeDispatch(row, route);
  return summarizeOther(row, route);
}

/** 학습자/보호자 표시용: 이름 + 연령·성별 메타 */
export function parseConsultSubject(row: {
  parent_name: string;
  child_age?: string | null;
  content?: string | null;
}): { name: string; meta?: string } {
  const childAge = trimLeadLine(row.child_age);
  const fromContent =
    extractPrivateField(row.content ?? '', '학습자 정보') ||
    extractPrivateField(row.content ?? '', '아이 연령 / 성별 / 이름');

  const raw = trimLeadLine(row.parent_name) || fromContent || '이름 미상';
  const parts = raw
    .split(/\s*[/|·]\s*/)
    .map((p) => trimLeadLine(p))
    .filter(Boolean);

  if (parts.length >= 2) {
    const ageLike = parts.find((p) => /\d+\s*세/.test(p));
    const genderLike = parts.find((p) => /^(남|여|남성|여성|남아|여아)$/.test(p));
    const nameLike =
      parts.find((p) => p !== ageLike && p !== genderLike && !/^\d/.test(p)) || parts[parts.length - 1];
    const metaBits = [ageLike, genderLike].filter(Boolean) as string[];
    if (childAge && !metaBits.includes(childAge)) metaBits.unshift(childAge);
    return {
      name: nameLike || raw,
      meta: metaBits.length ? metaBits.join(' · ') : childAge || undefined,
    };
  }

  return {
    name: raw,
    meta: childAge || undefined,
  };
}
