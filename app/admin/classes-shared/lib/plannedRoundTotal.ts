/**
 * 표시용 총 회차(분모): 계약 상 `round_total`이 있으면 그 최댓값을 쓴다.
 * `round_index`만으로 max를 내면 취소·재정렬 후 1..6처럼 줄어든 인덱스 때문에 3/6처럼 잘못 보일 수 있다.
 *
 * 운영 분리:
 * - DB에 잘못 저장된 round_* 값은 화면에서 덮어쓰지 말고 `sql/64_fix_round_index_after_cancel_bug.sql` 등으로 보정한다.
 * - 이 모듈은 **읽기/표시** 일관성용이다.
 */
export function resolvePlannedTotal(rows: {
  status?: string | null;
  round_total?: number | null;
  round_index?: number | null;
}[]): number {
  const nonDeleted = rows.filter((r) => String(r.status ?? '') !== 'deleted');
  let maxRt = 0;
  for (const r of nonDeleted) {
    const n = Number(r.round_total);
    if (Number.isFinite(n) && n > 0) maxRt = Math.max(maxRt, n);
  }
  if (maxRt > 0) return maxRt;

  const baseAll = nonDeleted.filter((r) => String(r.status ?? '') !== 'postponed');
  const indices = baseAll
    .map((r) => r.round_index)
    .filter((v): v is number => typeof v === 'number');
  if (indices.length > 0) return Math.max(...indices);
  return Math.max(1, baseAll.length || 1);
}

/** 세션 행을 group_id별로 모아 각 그룹에 `resolvePlannedTotal` 적용 (캘린더 훅·관리자 대시보드 공통). */
export function buildGroupPlannedTotals(
  rows: {
    group_id?: string | null;
    status?: string | null;
    round_total?: number | null;
    round_index?: number | null;
  }[]
): Record<string, number> {
  const byGroup = new Map<string, typeof rows>();
  for (const r of rows) {
    const gid = r.group_id;
    if (!gid) continue;
    if (!byGroup.has(gid)) byGroup.set(gid, []);
    byGroup.get(gid)!.push(r);
  }
  const out: Record<string, number> = {};
  for (const [gid, list] of byGroup) {
    out[gid] = resolvePlannedTotal(list);
  }
  return out;
}
