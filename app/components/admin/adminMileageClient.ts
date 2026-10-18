export type MileageAdjustmentResponse = {
  ok: boolean;
  points?: number;
  logId?: string;
  error?: string;
  code?: string;
};

export async function postMileageAdjustment(
  payload:
    | { operation: 'apply'; teacherId: string; pointDelta: number; reason: string }
    | { operation: 'reverse'; teacherId: string; pointDelta: number; logId: string; expectedLogAmount: number; expectedLogReason: string },
): Promise<MileageAdjustmentResponse> {
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
      if (!response.ok) return { ok: false, error: result.error ?? '마일리지 변경에 실패했습니다.', code: result.code };
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  return { ok: false, error: lastError instanceof Error ? lastError.message : '네트워크 오류가 발생했습니다.' };
}
