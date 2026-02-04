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

/**
 * 채팅 타임스탬프 포맷팅
 * 표기 규칙:
 * - 오늘: "오후 3:30" (로컬 타임존 Asia/Seoul)
 * - 어제: "어제"
 * - 이번 주: "월요일"
 * - 그 외: "YYYY.MM.DD"
 * 
 * @param inputISO ISO 8601 형식의 날짜 문자열
 * @returns 포맷팅된 날짜/시간 문자열
 */
export function formatChatTimestamp(inputISO: string): string {
  if (!inputISO) return '';
  
  const now = new Date();
  const target = new Date(inputISO);
  
  // Asia/Seoul 타임존으로 변환
  const nowSeoul = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const targetSeoul = new Date(target.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  
  // 날짜 비교를 위해 시간을 0시로 리셋
  const todayStart = new Date(nowSeoul);
  todayStart.setHours(0, 0, 0, 0);
  
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 이번 주 월요일
  
  const targetDateStart = new Date(targetSeoul);
  targetDateStart.setHours(0, 0, 0, 0);
  
  // 오늘인지 확인
  if (targetDateStart.getTime() === todayStart.getTime()) {
    // 오늘: "오후 3:30" 형식
    const hour = targetSeoul.getHours();
    const minute = targetSeoul.getMinutes();
    const period = hour >= 12 ? '오후' : '오전';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${period} ${displayHour}:${minute.toString().padStart(2, '0')}`;
  }
  
  // 어제인지 확인
  if (targetDateStart.getTime() === yesterdayStart.getTime()) {
    return '어제';
  }
  
  // 이번 주인지 확인 (월요일 이후)
  if (targetDateStart.getTime() >= weekStart.getTime()) {
    // 이번 주: 요일 표시
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return weekdays[targetSeoul.getDay()];
  }
  
  // 그 외: "YYYY.MM.DD" 형식
  const year = targetSeoul.getFullYear();
  const month = (targetSeoul.getMonth() + 1).toString().padStart(2, '0');
  const day = targetSeoul.getDate().toString().padStart(2, '0');
  return `${year}.${month}.${day}`;
}
