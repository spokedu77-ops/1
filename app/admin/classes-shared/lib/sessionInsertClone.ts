/**
 * 세션 행을 복제해 `sessions` INSERT에 넣기 전에 정리합니다.
 *
 * **체크리스트:** `public.sessions`에 새 UNIQUE 제약·인덱스가 생기면, 그 컬럼을 아래에서 반드시 제외하세요.
 * (현재: `short_code` → `idx_sessions_short_code_unique`)
 *
 * PK·서버 타임스탬프도 함께 제거해 INSERT 시 DB 기본값/트리거에 맡깁니다.
 */
export function omitSessionIdentityForInsertClone(
  row: Record<string, unknown>
): Record<string, unknown> {
  const { id, created_at, updated_at, short_code, ...rest } = row;
  void id;
  void created_at;
  void updated_at;
  void short_code;
  return rest;
}
