import type { CurriculumInquiryPayload, DispatchInquiryPayload, InquiryPayload, PrivateInquiryPayload } from './inquiry-types';

const TEMP_INQUIRY_STORAGE_KEY = 'spokedu.contact.inquiries.temp';

type InquirySubmitResult = {
  ok: boolean;
  mode: 'api' | 'temp';
  message?: string;
};

function formatPrivateContent(payload: PrivateInquiryPayload): string {
  return [
    '[개인·소그룹 수업 문의]',
    `보호자 이름: ${payload.guardianName}`,
    `연락처: ${payload.phone}`,
    `아이 연령: ${payload.childAge}`,
    `운동 경험: ${payload.exerciseExperience}`,
    `현재 고민: ${payload.concern}`,
    `희망 수업 형태: ${payload.preferredClassType}`,
    `희망 장소: ${payload.preferredLocation}`,
    `희망 요일/시간: ${payload.preferredTime}`,
    `type: ${payload.type}`,
    `createdAt: ${payload.createdAt}`,
  ].join('\n');
}

function formatDispatchInquiry(payload: DispatchInquiryPayload): string {
  return [
    '[기관 파견 수업 문의]',
    `기관명: ${payload.organizationName}`,
    `담당자: ${payload.managerName}`,
    `연락처: ${payload.phone}`,
    `기관 유형: ${payload.organizationType}`,
    `대상 연령: ${payload.targetAge}`,
    `예상 참여 인원: ${payload.expectedParticipants}`,
    `사용 가능한 공간: ${payload.availableSpace}`,
    `희망 일정: ${payload.preferredSchedule}`,
    `희망 프로그램: ${payload.preferredProgram}`,
    `제안서 필요 여부: ${payload.proposalNeeded}`,
    `type: ${payload.type}`,
    `createdAt: ${payload.createdAt}`,
  ].join('\n');
}

function formatCurriculumExtra(payload: CurriculumInquiryPayload): string {
  return [
    '[커리큘럼·콘텐츠 문의]',
    `이름/기관명: ${payload.nameOrOrg}`,
    `연락처: ${payload.phone}`,
    `type: ${payload.type}`,
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
        name: payload.guardianName,
        phone: payload.phone,
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
        manager: payload.managerName,
        phone: payload.phone,
        email: '',
        location: payload.organizationType,
        startDate: payload.preferredSchedule,
        endDate: '',
        headcount: payload.expectedParticipants,
        specialNeeds: payload.availableSpace,
        inquiry: formatDispatchInquiry(payload),
        programs: payload.preferredProgram ? [payload.preferredProgram] : [],
        targetAge: payload.targetAge ? [payload.targetAge] : [],
        source: 'spokedu-contact-dispatch',
      },
    };
  }

  return {
    endpoint: '/api/curriculum/leads',
    body: {
      type: payload.type,
      name_or_org: payload.nameOrOrg,
      phone: payload.phone,
      content_type: payload.contentType,
      target_age: payload.targetAge,
      purpose: payload.purpose,
      teacher_training: payload.trainingNeeded,
      partnership_type: payload.partnershipType,
      extra: formatCurriculumExtra(payload),
    },
  };
}

function storeTemporaryInquiry(payload: InquiryPayload) {
  if (typeof window === 'undefined') return;
  try {
    const prevRaw = window.localStorage.getItem(TEMP_INQUIRY_STORAGE_KEY);
    const prev = prevRaw ? (JSON.parse(prevRaw) as InquiryPayload[]) : [];
    const next = [payload, ...prev].slice(0, 50);
    window.localStorage.setItem(TEMP_INQUIRY_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[spokedu/contact] temp inquiry store failed', error);
  }
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
  } catch (error) {
    storeTemporaryInquiry(payload);
    return {
      ok: true,
      mode: 'temp',
      message: error instanceof Error ? error.message : '문의를 임시 저장했습니다.',
    };
  }
}
