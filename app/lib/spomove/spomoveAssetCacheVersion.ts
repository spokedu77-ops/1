/**
 * Asset Hub → Storage 공개 URL cache-bust 버전.
 * 매 요청마다 Date.now() 대신 pack 수정 시점(updated_at) 또는 경로 fingerprint를 씁니다.
 * 에셋이 바뀌지 않으면 ?v= 값이 동일해 브라우저·SW 캐시를 재사용합니다.
 */

export function parsePackUpdatedAtMs(updatedAt: string | null | undefined): number | undefined {
  if (!updatedAt) return undefined;
  const t = Date.parse(updatedAt);
  return Number.isFinite(t) ? t : undefined;
}

/** updated_at 없을 때 paths만으로 안정적인 버전 생성 */
export function fingerprintSpomoveAssetPaths(paths: readonly (string | null)[]): number {
  let h = 5381;
  for (const p of paths) {
    const s = p ?? '';
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

export function resolveSpomovePackCacheBust(
  updatedAt: string | null | undefined,
  paths: readonly (string | null)[],
): number | undefined {
  const fromUpdated = parsePackUpdatedAtMs(updatedAt);
  if (fromUpdated != null) return fromUpdated;
  const hasPath = paths.some((p) => typeof p === 'string' && p.trim());
  if (!hasPath) return undefined;
  return fingerprintSpomoveAssetPaths(paths);
}
