/**
 * 내부 검증 후보 전용 실행 가드.
 * 기존 catalogStatus === 'hold' 전역 차단과 섞지 않는다.
 */
export function canLaunchInternalSpomoveCandidate(
  preset: { internalCandidate?: boolean } | null | undefined,
  isAdmin: boolean | undefined,
): boolean {
  if (!preset?.internalCandidate) return true;
  return isAdmin === true;
}
