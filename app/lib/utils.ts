/**
 * 공통 유틸리티 함수
 */

/**
 * 시간 포맷팅 (초 → 분:초)
 * @param seconds 초 단위 시간 (optional)
 * @returns "분:초" 형식의 문자열 (예: "5:30")
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
