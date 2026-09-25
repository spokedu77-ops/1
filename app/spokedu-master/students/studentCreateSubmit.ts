/** One in-flight create per draft. A second call in the same turn must not start another request. */
export function claimStudentCreateSubmit(lock: { current: boolean }) {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

/** Retry and double-submit reuse the draft key. A new sheet gets a new key. */
export function studentCreateLegacyId(existing: string | null, createId: () => string) {
  return existing ?? createId();
}
