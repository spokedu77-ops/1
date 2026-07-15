/** content PATCH 배치·디바운스 타이머가 살아 있으면 idle reconcile을 미룬다 */
let contentSavePending = false;

export function setNoteContentSavePending(pending: boolean): void {
  contentSavePending = pending;
}

export function isNoteContentSavePending(): boolean {
  return contentSavePending;
}
