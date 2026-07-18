/** private 랜딩 ↔ Move Report 요약 공유 키 */

export const PRIVATE_MOVE_REPORT_SUMMARY_KEY = 'private.moveReport.summary';
export const PRIVATE_MOVE_REPORT_SHARE_URL_KEY = 'private.moveReport.shareUrl';
export const PRIVATE_MOVE_REPORT_EVENT = 'private-move-report-summary';

export function readPrivateMoveReportSummary(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(PRIVATE_MOVE_REPORT_SUMMARY_KEY)?.trim() ?? '';
}

export function writePrivateMoveReportSummary(value: string): void {
  if (typeof window === 'undefined') return;
  const normalized = value.trim();
  if (!normalized) {
    window.localStorage.removeItem(PRIVATE_MOVE_REPORT_SUMMARY_KEY);
  } else {
    window.localStorage.setItem(PRIVATE_MOVE_REPORT_SUMMARY_KEY, normalized);
  }
  window.dispatchEvent(
    new CustomEvent(PRIVATE_MOVE_REPORT_EVENT, {
      detail: { summary: normalized },
    }),
  );
}

export function clearPrivateMoveReportSummary(): void {
  writePrivateMoveReportSummary('');
}
