/**
 * 표시용 총 회차(분모): 계약 상 `round_total`이 있으면 그 최댓값을 쓴다.
 * `round_index`만으로 max를 내면 취소·재정렬 후 1..6처럼 줄어든 인덱스 때문에 3/6처럼 잘못 보일 수 있다.
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
