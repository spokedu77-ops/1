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

export function buildRetryQueueItem(type: RetryQueueItem['type'], title: string, retryable = true): RetryQueueItem {
  return {
    id: `${type}-${Date.now()}`,
    type,
    title,
    createdAt: new Date().toISOString(),
    retryable,
  };
}
