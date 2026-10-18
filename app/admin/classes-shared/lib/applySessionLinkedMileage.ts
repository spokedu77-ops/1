export function appendMileageActionLabel(prev: string, label: string): string {
  const selected = prev ? prev.split(',').map((item) => item.trim()).filter(Boolean) : [];
  if (selected.includes(label)) return selected.join(',');
  return [...selected, label].join(',');
}
type SessionMileageInput = {
  sessionId: string;
  mileage_option: string | null | undefined;
  nextActionStr: string;
};

export type SessionMileageResult = {
  ok: boolean;
  error?: string;
  code?: string;
  warning?: string;
  total?: number;
  teacherCount?: number;
};

/** Admin-only server settlement. One retry reuses the same idempotency key. */
export async function applySessionLinkedMileage(
  input: SessionMileageInput,
): Promise<SessionMileageResult> {
  const requestKey = crypto.randomUUID();
  const body = JSON.stringify({
    sessionId: input.sessionId,
    expectedAction: input.mileage_option ?? '',
    nextAction: input.nextActionStr,
    requestKey,
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('/api/admin/mileage/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const payload = await response.json().catch(() => ({})) as SessionMileageResult;
      if (!response.ok) return { ok: false, error: payload.error ?? '마일리지 저장에 실패했습니다.', code: payload.code };
      return payload;
    } catch (error) {
      lastError = error;
    }
  }
  return { ok: false, error: lastError instanceof Error ? lastError.message : '네트워크 오류가 발생했습니다.' };
}
