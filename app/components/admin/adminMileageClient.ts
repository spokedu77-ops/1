export type MileageAdjustmentResponse = {
  ok: boolean;
  points?: number;
  logId?: string;
  error?: string;
  code?: string;
};

export function isSessionLinkedMileageReason(reason: string | null | undefined): boolean {
  const r = reason ?? '';
  return r.startsWith('[수업연동]') || r.startsWith('[수업연동/보조]');
}

/** 연동 로그 취소 — `/cancel` 미배포 시 adjustment reverse(RPC 위임)로 폴백 */
async function postMileageAdjustmentReverseViaRpc(payload: {
  teacherId: string;
  logId: string;
  expectedLogAmount: number;
  expectedLogReason: string;
}): Promise<MileageAdjustmentResponse> {
  const requestKey = crypto.randomUUID();
  const body = JSON.stringify({
    operation: 'reverse',
    teacherId: payload.teacherId,
    pointDelta: -payload.expectedLogAmount,
    logId: payload.logId,
    expectedLogAmount: payload.expectedLogAmount,
    expectedLogReason: payload.expectedLogReason,
    requestKey,
  });
  const response = await fetch('/api/admin/mileage/adjustment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const result = await response.json().catch(() => ({})) as MileageAdjustmentResponse;
  if (!response.ok) {
    return { ok: false, error: result.error ?? '마일리지 취소에 실패했습니다.', code: result.code };
  }
  return { ...result, ok: true };
}

export async function postMileageCancelSingle(payload: {
  teacherId: string;
  logId: string;
  expectedLogAmount: number;
  expectedLogReason: string;
}): Promise<MileageAdjustmentResponse> {
  const requestKey = crypto.randomUUID();
  const body = JSON.stringify({ ...payload, requestKey });
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('/api/admin/mileage/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const result = await response.json().catch(() => ({})) as MileageAdjustmentResponse;
      if (!response.ok) {
        if (response.status === 404) {
          return postMileageAdjustmentReverseViaRpc({
            teacherId: payload.teacherId,
            logId: payload.logId,
            expectedLogAmount: payload.expectedLogAmount,
            expectedLogReason: payload.expectedLogReason,
          });
        }
        return { ok: false, error: result.error ?? '마일리지 취소에 실패했습니다.', code: result.code };
      }
      return { ...result, ok: true };
    } catch (error) {
      lastError = error;
    }
  }
  return { ok: false, error: lastError instanceof Error ? lastError.message : '네트워크 오류가 발생했습니다.' };
}

export async function postMileageCancelSessionSettlement(payload: {
  sessionId: string;
  expectedMileageOption: string;
}): Promise<MileageAdjustmentResponse & { cancelled?: unknown[] }> {
  const requestKey = crypto.randomUUID();
  const body = JSON.stringify({ ...payload, requestKey });
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('/api/admin/mileage/cancel-settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const result = await response.json().catch(() => ({})) as MileageAdjustmentResponse & { cancelled?: unknown[] };
      if (!response.ok) return { ok: false, error: result.error ?? '수업 정산 취소에 실패했습니다.', code: result.code };
      return { ...result, ok: true };
    } catch (error) {
      lastError = error;
    }
  }
  return { ok: false, error: lastError instanceof Error ? lastError.message : '네트워크 오류가 발생했습니다.' };
}

/** @deprecated use postMileageCancelSingle */
export const postMileageCancel = postMileageCancelSingle;

export async function postMileageAdjustment(
  payload:
    | { operation: 'apply'; teacherId: string; pointDelta: number; reason: string }
    | { operation: 'reverse'; teacherId: string; pointDelta: number; logId: string; expectedLogAmount: number; expectedLogReason: string },
): Promise<MileageAdjustmentResponse> {
  if (
    payload.operation === 'reverse'
    && isSessionLinkedMileageReason(payload.expectedLogReason)
  ) {
    return postMileageCancelSingle({
      teacherId: payload.teacherId,
      logId: payload.logId,
      expectedLogAmount: payload.expectedLogAmount,
      expectedLogReason: payload.expectedLogReason,
    });
  }
  const requestKey = crypto.randomUUID();
  const body = JSON.stringify({ ...payload, requestKey });
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('/api/admin/mileage/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const result = await response.json().catch(() => ({})) as MileageAdjustmentResponse;
      if (!response.ok) {
        if (
          payload.operation === 'reverse'
          && result.code === 'MILEAGE_LINKED_LOG_REQUIRES_SESSION_FLOW'
        ) {
          return postMileageCancelSingle({
            teacherId: payload.teacherId,
            logId: payload.logId,
            expectedLogAmount: payload.expectedLogAmount,
            expectedLogReason: payload.expectedLogReason,
          });
        }
        return { ok: false, error: result.error ?? '마일리지 변경에 실패했습니다.', code: result.code };
      }
      return { ...result, ok: true };
    } catch (error) {
      lastError = error;
    }
  }
  return { ok: false, error: lastError instanceof Error ? lastError.message : '네트워크 오류가 발생했습니다.' };
}
