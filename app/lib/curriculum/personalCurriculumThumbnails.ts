/** YouTube URL에서 비디오 ID 추출 (11자) */
export function getYouTubeIdFromUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function getSafePersonalThumbnailUrl(item: { url?: string; thumbnail?: string | null }): string {
  const id = getYouTubeIdFromUrl(item.url ?? '');
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  const thumb = item.thumbnail;
  if (thumb?.includes('img.youtube.com')) {
    if (thumb.includes('vi/null')) return '';
    return thumb.replace('maxresdefault', 'hqdefault');
  }
  return thumb ?? '';
}
