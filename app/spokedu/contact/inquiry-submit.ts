import { storeInquiryDraft } from './inquiry-draft';
import type {
  CurriculumInquiryPayload,
  DispatchInquiryPayload,
  InquiryPayload,
  OtherInquiryPayload,
  PrivateInquiryPayload,
  SpomoveInquiryPayload,
} from './inquiry-types';

export type InquirySubmitResult =
  | { ok: true; mode: 'api' }
  | { ok: false; mode: 'temp' };

function formatPrivateContent(payload: PrivateInquiryPayload): string {
  return [
    '[개인·소그룹 수업 문의]',
    `이름: ${payload.name}`,
    `연락처: ${payload.phone}`,
    `이메일: ${payload.email}`,
    `희망 지역: ${payload.preferredRegion}`,
    `문의 내용: ${payload.message}`,
    `아이 연령: ${payload.childAge}`,
    `희망 수업 형태: ${payload.preferredClassType}`,
    `희망 장소: ${payload.preferredLocation}`,
    `createdAt: ${payload.createdAt}`,
  ].join('\n');
}

function formatDispatchInquiry(payload: DispatchInquiryPayload): string {
  return [
    '[기관 프로그램 문의]',
    `이름: ${payload.name}`,
    `연락처: ${payload.phone}`,
    `이메일: ${payload.email}`,
    `희망 지역: ${payload.preferredRegion}`,
    `문의 내용: ${payload.message}`,
    `기관명: ${payload.organizationName}`,
    `대상 연령: ${payload.targetAge}`,
    `예상 인원: ${payload.expectedParticipants}`,
    `희망 운영 형태: ${payload.preferredOperation}`,
    `createdAt: ${payload.createdAt}`,
  ].join('\n');
}

function formatSpomoveInquiry(payload: SpomoveInquiryPayload): string {
  return [
    '[SPOMOVE 도입 문의]',
    `이름: ${payload.name}`,
    `연락처: ${payload.phone}`,
    `이메일: ${payload.email}`,
    `희망 지역: ${payload.preferredRegion}`,
    `문의 내용: ${payload.message}`,
    `기관명: ${payload.organizationName}`,
    `대상 연령: ${payload.targetAge}`,
    `예상 인원: ${payload.expectedParticipants}`,
    `희망 운영 형태: ${payload.preferredOperation}`,
    `createdAt: ${payload.createdAt}`,
  ].join('\n');
}

function formatCurriculumExtra(payload: CurriculumInquiryPayload): string {
  return [
    '[커리큘럼·지도자 교육 문의]',
    `이름: ${payload.name}`,
    `연락처: ${payload.phone}`,
    `이메일: ${payload.email}`,
    `희망 지역: ${payload.preferredRegion}`,
    `문의 내용: ${payload.message}`,
    `기관명 또는 소속: ${payload.nameOrOrg}`,
    `문의 목적: ${payload.inquiryPurpose}`,
    `활용 대상: ${payload.utilizationTarget}`,
    `createdAt: ${payload.createdAt}`,
  ].join('\n');
}

function formatOtherExtra(payload: OtherInquiryPayload): string {
  return [
    '[기타 협업 문의]',
    `이름: ${payload.name}`,
    `연락처: ${payload.phone}`,
    `이메일: ${payload.email}`,
    `희망 지역: ${payload.preferredRegion}`,
    `문의 내용: ${payload.message}`,
    `기관명 또는 소속: ${payload.nameOrOrg}`,
    `협업 목적: ${payload.collaborationPurpose}`,
    `createdAt: ${payload.createdAt}`,
  ].join('\n');
}

type LegacyRequest = {
  endpoint: string;
  body: Record<string, unknown>;
};

function toLegacyRequest(payload: InquiryPayload): LegacyRequest {
  if (payload.type === 'private') {
    return {
      endpoint: '/api/private/leads',
      body: {
        type: payload.type,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        content: formatPrivateContent(payload),
      },
    };
  }

  if (payload.type === 'dispatch') {
    return {
      endpoint: '/api/dispatch/leads',
      body: {
        type: payload.type,
        organization: payload.organizationName,
        manager: payload.name,
        phone: payload.phone,
        email: payload.email,
        location: payload.preferredRegion,
        startDate: '',
        endDate: '',
        headcount: payload.expectedParticipants,
        specialNeeds: payload.message,
        inquiry: formatDispatchInquiry(payload),
        programs: payload.preferredOperation ? [payload.preferredOperation] : [],
        targetAge: payload.targetAge ? [payload.targetAge] : [],
        source: 'spokedu-contact-dispatch',
      },
    };
  }

  if (payload.type === 'spomove') {
    return {
      endpoint: '/api/dispatch/leads',
      body: {
        type: 'dispatch',
        organization: payload.organizationName,
        manager: payload.name,
        phone: payload.phone,
        email: payload.email,
        location: payload.preferredRegion,
        startDate: '',
        endDate: '',
        headcount: payload.expectedParticipants,
        specialNeeds: payload.message,
        inquiry: formatSpomoveInquiry(payload),
        programs: ['SPOMOVE', ...(payload.preferredOperation ? [payload.preferredOperation] : [])],
        targetAge: payload.targetAge ? [payload.targetAge] : [],
        source: 'spokedu-contact-spomove',
      },
    };
  }

  if (payload.type === 'other') {
    return {
      endpoint: '/api/curriculum/leads',
      body: {
        type: 'curriculum',
        name_or_org: payload.nameOrOrg || payload.name,
        phone: payload.phone,
        email: payload.email,
        content_type: payload.collaborationPurpose || '기타 협업',
        target_age: payload.preferredRegion,
        purpose: payload.message,
        teacher_training: '해당 없음',
        partnership_type: '기타 협업',
        extra: formatOtherExtra(payload),
      },
    };
  }

  return {
    endpoint: '/api/curriculum/leads',
    body: {
      type: payload.type,
      name_or_org: payload.nameOrOrg,
      phone: payload.phone,
      email: payload.email,
      content_type: payload.inquiryPurpose,
      target_age: payload.preferredRegion,
      purpose: payload.utilizationTarget,
      teacher_training: '검토 중',
      partnership_type: payload.utilizationTarget,
      extra: formatCurriculumExtra(payload),
    },
  };
}

export async function submitInquiry(payload: InquiryPayload): Promise<InquirySubmitResult> {
  const request = toLegacyRequest(payload);

  try {
    const response = await fetch(request.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null;

    if (!response.ok || !result?.ok) {
      throw new Error(result?.message || result?.error || '문의 접수에 실패했습니다.');
    }

    return { ok: true, mode: 'api' };
  } catch {
    storeInquiryDraft(payload);
    return { ok: false, mode: 'temp' };
  }
}
