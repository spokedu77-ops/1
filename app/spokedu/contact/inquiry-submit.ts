import type { CurriculumInquiryPayload, DispatchInquiryPayload, InquiryPayload, PrivateInquiryPayload } from './inquiry-types';

const TEMP_INQUIRY_STORAGE_KEY = 'spokedu.contact.inquiries.temp';

type InquirySubmitResult = {
  ok: boolean;
  mode: 'api' | 'temp';
  message?: string;
};

function formatPrivateContent(payload: PrivateInquiryPayload): string {
  return [
    '[private 문의]',
    `name: ${payload.name}`,
    `phone: ${payload.phone}`,
    `email: ${payload.email}`,
    `type: ${payload.type}`,
    `createdAt: ${payload.createdAt}`,
    `childAge: ${payload.childAge}`,
    `exerciseExperience: ${payload.exerciseExperience}`,
    `concern: ${payload.concern}`,
    `preferredClassType: ${payload.preferredClassType}`,
    `preferredLocation: ${payload.preferredLocation}`,
    `preferredTime: ${payload.preferredTime}`,
    '',
    '[message]',
    payload.message,
  ].join('\n');
}

function formatDispatchInquiry(payload: DispatchInquiryPayload): string {
  return [
    '[dispatch 문의]',
    `name: ${payload.name}`,
    `phone: ${payload.phone}`,
    `email: ${payload.email}`,
    `type: ${payload.type}`,
    `createdAt: ${payload.createdAt}`,
    `organizationType: ${payload.organizationType}`,
    `targetAge: ${payload.targetAge}`,
    `expectedParticipants: ${payload.expectedParticipants}`,
    `availableSpace: ${payload.availableSpace}`,
    `preferredProgram: ${payload.preferredProgram}`,
    `proposalNeeded: ${payload.proposalNeeded}`,
    '',
    '[message]',
    payload.message,
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
        location: payload.organizationType,
        startDate: '',
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
      name_or_org: payload.name,
      phone: payload.phone,
      content_type: payload.contentType,
      target_age: payload.targetAge,
      purpose: payload.purpose,
      teacher_training: payload.trainingNeeded,
      partnership_type: payload.partnershipType,
      extra: payload.message,
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
