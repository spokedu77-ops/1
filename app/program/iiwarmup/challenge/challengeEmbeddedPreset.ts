/**
 * SPOMOVE 임베드 챌린지 — 칸별 이미지(Supabase public URL 등) 또는 텍스트 폴백.
 * 이미지 URL이 비어 있으면 같은 인덱스의 텍스트가 표시됩니다.
 * 4단계 × 8칸 — 스튜디오 defaultLevels와 동일한 텍스트 구성.
 */

/** 텍스트 폴백 (이미지 URL이 없을 때) */
export const CHALLENGE_EMBED_TEXT_FALLBACK: Record<number, string[]> = {
  1: ['앞', '뒤', '앞', '뒤', '앞', '뒤', '앞', '뒤'],
  2: ['앞', '뒤', '앞', '뒤', '앞', '뒤', '오른쪽', '왼쪽'],
  3: ['앞', '뒤', '앞', '뒤', '오른쪽', '왼쪽', '오른쪽', '왼쪽'],
  4: ['앞', '뒤', '오른쪽', '왼쪽', '오른쪽', '왼쪽', '좌우', '앞뒤'],
};

/**
 * 단계별 칸 이미지 URL. Supabase Storage public URL을 넣으면 됩니다.
 * 빈 문자열이면 CHALLENGE_EMBED_TEXT_FALLBACK 해당 칸 텍스트 사용.
 */
export const CHALLENGE_EMBED_IMAGE_URLS: Record<number, string[]> = {
  1: ['', '', '', '', '', '', '', ''],
  2: ['', '', '', '', '', '', '', ''],
  3: ['', '', '', '', '', '', '', ''],
  4: ['', '', '', '', '', '', '', ''],
};

function isRemoteImageUrl(s: string): boolean {
  const t = s.trim();
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('//');
}

/** 최종 그리드 문자열 배열 (URL 또는 글자) — SpokeduRhythmGame initialLevelData용 */
export function buildEmbeddedChallengeLevelData(): Record<number, string[]> {
  const result: Record<number, string[]> = {};
  for (let lv = 1; lv <= 4; lv++) {
    const texts = CHALLENGE_EMBED_TEXT_FALLBACK[lv] ?? [];
    const urls = CHALLENGE_EMBED_IMAGE_URLS[lv] ?? [];
    result[lv] = texts.map((t, i) => {
      const u = (urls[i] ?? '').trim();
      return u.length > 0 ? u : t;
    });
  }
  return result;
}

/** 선로딩할 고유 http(s) 이미지 URL 목록 */
export function collectEmbeddedImageUrls(levelData: Record<number, string[]>): string[] {
  const seen = new Set<string>();
  for (const arr of Object.values(levelData)) {
    for (const cell of arr) {
      if (typeof cell === 'string' && isRemoteImageUrl(cell)) {
        const u = cell.trim();
        if (u.startsWith('//')) {
          seen.add(`https:${u}`);
        } else {
          seen.add(u);
        }
      }
    }
  }
  return [...seen];
}

export function preloadImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return Promise.resolve();
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  ).then(() => {});
}
