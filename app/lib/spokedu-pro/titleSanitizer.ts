/**
 * 센터 커리큘럼·구 CSV에서 붙던 접두를 UI/검색 표시용으로 제거.
 * - "[2월 4주] …" / "［2월 4주］ …" / "8월 4주 …"
 * - "메인 프로그램 1: …" / "서브 프로그램 2: …"
 * 접두가 여러 겹이면 반복 제거.
 */
export function stripMonthWeekPrefix(title: string): string {
  let s = String(title ?? '').trim();
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s.replace(/^\s*[\[［]\s*\d{1,2}\s*월\s*\d{1,2}\s*주\s*[\]］]\s*/u, '');
    s = s.replace(/^\s*\d{1,2}\s*월\s*\d{1,2}\s*주\s*/u, '');
    s = s.replace(/^\s*(메인|서브)\s*프로그램\s*\d+\s*:\s*/iu, '');
    s = s.trim();
  }
  return s;
}

