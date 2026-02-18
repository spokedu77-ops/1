/**
 * 연간 커리큘럼용 주차 계산 (캘린더 기준)
 * 한국 기준 주 시작 = 일요일 (일요일~토요일이 한 주).
 * 해당 월 1일이 포함된 주를 1주차로 두고, 오늘이 그 달의 몇 주차인지 반환.
 */
export function getCurrentWeekOfMonth(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startOfWeek1 = new Date(first);
  startOfWeek1.setDate(first.getDate() - first.getDay());
  const sundayOfThisWeek = new Date(now);
  sundayOfThisWeek.setDate(now.getDate() - now.getDay());
  const diffMs = sundayOfThisWeek.getTime() - startOfWeek1.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  let week = Math.floor(diffDays / 7) + 1;
  if (week < 1) week = 1;
  if (week > 4) week = 4;
  return week;
}
