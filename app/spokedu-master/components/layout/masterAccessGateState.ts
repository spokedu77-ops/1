export type MasterAccessGuardStatus = 'checking' | 'allowed' | 'redirecting' | 'denied' | 'error';

export type MasterAccessGuardShape = {
  status: MasterAccessGuardStatus;
  snapshot: unknown | null;
};

/** Block protected shell content only before the first verified snapshot (or while redirecting). */
export function isMasterAccessShellPending(isProtectedRoute: boolean, guard: MasterAccessGuardShape) {
  if (!isProtectedRoute) return false;
  if (guard.status === 'redirecting') return true;
  if (!guard.snapshot && guard.status === 'checking') return true;
  return false;
}

/** Skip a hard access fetch when a verified snapshot is already on the client. */
export function shouldSkipHardAccessFetch(guard: MasterAccessGuardShape) {
  return guard.snapshot != null && guard.status === 'allowed';
}

export function isStaleAccessRequest(requestId: number, latestRequestId: number) {
  return requestId !== latestRequestId;
}

/** Soft recheck: keep the current UI on transient failures when a snapshot already exists. */
export function shouldPreserveSnapshotOnSoftRecheckFailure(guard: MasterAccessGuardShape) {
  return guard.snapshot != null && guard.status === 'allowed';
}
