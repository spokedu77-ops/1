/** YouTube URL에서 11자 video id 추출 (shorts/watch/embed 등) */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * 개인 커리큘럼 카드 썸네일 URL (YouTube 썸네일 우선, 없으면 저장된 thumbnail).
 * DB에는 공식적으로 url + link_2(매핑 link2) 최대 2개; 4개 이상은 스키마 확장 후 캐러셀 UI와 함께 추가.
 */
export function getPersonalCurriculumThumbnailUrl(
  item: { url?: string; thumbnail?: string | null } | null | undefined
): string {
  if (!item) return '';
  const id = getYouTubeId(item.url ?? '');
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  if (item.thumbnail?.includes('img.youtube.com')) {
    if (item.thumbnail.includes('vi/null')) return '';
    return item.thumbnail.replace('maxresdefault', 'hqdefault');
  }
  return (item.thumbnail ?? '').trim();
}
