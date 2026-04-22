/** 센터 curriculum 행: display_order 오름차순, 동률이면 id 내림차순(null order는 맨 뒤, id로 tie-break) */
export function sortCenterCurriculumByDisplayOrder<T extends { id?: number | null; display_order?: number | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const ao = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}
