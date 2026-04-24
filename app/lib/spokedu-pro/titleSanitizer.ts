/**
 * 센터 커리큘럼 import에서 붙던 "[N월 N주]" 접두사를 UI/저장 모두에서 제거하기 위한 유틸.
 */
export function stripMonthWeekPrefix(title: string): string {
  return String(title ?? '').replace(/^\s*\[\s*\d+\s*월\s*\d+\s*주\s*\]\s*/u, '').trim();
}

