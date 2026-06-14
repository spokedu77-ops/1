export type ServiceFailureCode =
  | 'offline'
  | 'permission-denied'
  | 'subscription-expired'
  | 'monthly-limit-exceeded'
  | 'kakao-provider-error'
  | 'pdf-render-failed'
  | 'token-expired';

export type ApiResult<T> =
  | { ok: true; data: T; queued?: boolean }
  | { ok: false; code: ServiceFailureCode; message: string; retryable: boolean };

export type RetryQueueItem = {
  id: string;
  type: 'kakao-summary' | 'pdf-report' | 'class-record-sync';
  title: string;
  createdAt: string;
  retryable: boolean;
};

export type CenterValidationResult = {
  centerId: string;
  centerName: string;
  plan: 'team';
  teacherSlots: number;
};

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function buildRetryQueueItem(type: RetryQueueItem['type'], title: string, retryable = true): RetryQueueItem {
  return {
    id: `${type}-${Date.now()}`,
    type,
    title,
    createdAt: new Date().toISOString(),
    retryable,
  };
}

export async function validateCenterCode(code: string): Promise<ApiResult<CenterValidationResult>> {
  await wait(450);
  const normalized = code.trim().toUpperCase();
  if (normalized.length < 10) {
    return {
      ok: false,
      code: 'permission-denied',
      message: '센터 코드는 10자 이상이어야 합니다.',
      retryable: false,
    };
  }
  return {
    ok: true,
    data: {
      centerId: normalized,
      centerName: normalized.startsWith('SPOMOVE') ? 'SPOMOVE 인증 센터' : '연결된 체육 센터',
      plan: 'team',
      teacherSlots: 3,
    },
  };
}
