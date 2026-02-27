/**
 * 현재 날짜 기준 weekKey 계산 (구독자 페이지 자동 주차) — KST 기준
 * 월 내 일자: 1~7→W1, 8~14→W2, 15~21→W3, 22~28→W4
 * 주의: new Date()는 서버에서 UTC를 반환하므로 KST(+9) 오프셋을 적용
 */
import { generateWeekKey } from './dragAndDrop';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getCurrentWeekKey(): string {
  const nowKST = new Date(Date.now() + KST_OFFSET_MS);
  const year = nowKST.getUTCFullYear();
  const month = nowKST.getUTCMonth() + 1;
  const day = nowKST.getUTCDate();
  const week = Math.min(4, Math.ceil(day / 7));
  return generateWeekKey(year, month, week);
}
