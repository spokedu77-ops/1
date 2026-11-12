let pendingPreparation: Promise<void> | null = null;

/** Reuse the validated completion path before reading payroll; concurrent views share it. */
export function prepareSettlementSessions(): Promise<void> {
  if (pendingPreparation) return pendingPreparation;
  pendingPreparation = completeEndedSessions().finally(() => {
    pendingPreparation = null;
  });
  return pendingPreparation;
}

async function completeEndedSessions(): Promise<void> {
  for (let batch = 0; batch < 20; batch++) {
    const response = await fetch('/api/sessions/auto-finish', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
    const result = await response.json();
    // 207 preserves actionable assignment issues in the reconciliation list.
    // Infrastructure/auth failures must not produce a seemingly final payroll.
    if (!response.ok || !['complete', 'needs-review'].includes(result.status)
      || !Number.isSafeInteger(result.count) || result.count < 0
      || typeof result.hasMore !== 'boolean') {
      throw new Error('수업 자동 완료를 확인하지 못했습니다. 다시 조회해 주세요.');
    }
    if (!result.hasMore) return;
    if (result.count === 0) break;
  }
  throw new Error('자동 완료 대상이 남아 있습니다. 수업 관리의 확인 필요 내역을 확인한 뒤 다시 조회해 주세요.');
}
