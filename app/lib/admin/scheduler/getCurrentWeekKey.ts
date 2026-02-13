/**
 * 현재 날짜 기준 weekKey 계산 (구독자 페이지 자동 주차)
 * 월 내 일자: 1~7→W1, 8~14→W2, 15~21→W3, 22~28→W4, 29~31→W5
 */
import { generateWeekKey } from './dragAndDrop';

export function getCurrentWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const week = Math.min(5, Math.ceil(day / 7));
  return generateWeekKey(year, month, week);
}
