/** 회차 테이블에서 날짜·시간을 입력 후 버튼으로 확정할 때 사용 */

export type SessionScheduleDraft = { dateStr: string; timeStr: string };

export function mergeSessionScheduleDraft(
  prev: SessionScheduleDraft | undefined,
  savedDateStr: string,
  savedTimeStr: string,
  partial: Partial<Pick<SessionScheduleDraft, "dateStr" | "timeStr">>
): SessionScheduleDraft {
  return {
    dateStr: partial.dateStr ?? prev?.dateStr ?? savedDateStr,
    timeStr: partial.timeStr ?? prev?.timeStr ?? savedTimeStr,
  };
}

export function isSessionScheduleDraftDirty(
  draft: SessionScheduleDraft,
  savedDateStr: string,
  savedTimeStr: string
): boolean {
  return draft.dateStr !== savedDateStr || draft.timeStr !== savedTimeStr;
}

/** 수업 길이(ms)는 기존 start_at/end_at에서 유지 */
export function isoRangeFromDateTimeInputs(
  rowStartIso: string,
  rowEndIso: string,
  dateStr: string,
  timeStr: string
): { start_at: string; end_at: string } | null {
  if (!dateStr?.trim() || !timeStr?.trim()) return null;
  const anchorStart = new Date(rowStartIso);
  const anchorEnd = new Date(rowEndIso);
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if (![y, m, d].every((v) => Number.isFinite(v)) || ![hh, mm].every((v) => Number.isFinite(v))) {
    return null;
  }
  const startAt = new Date(anchorStart);
  startAt.setFullYear(y, m - 1, d);
  startAt.setHours(hh, mm, 0, 0);
  const durationMs = anchorEnd.getTime() - anchorStart.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  const endAt = new Date(startAt.getTime() + durationMs);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;
  return { start_at: startAt.toISOString(), end_at: endAt.toISOString() };
}
