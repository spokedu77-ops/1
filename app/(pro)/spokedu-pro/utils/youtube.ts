/**
 * YouTube URL → video id / 썸네일 URL (카드·모달 공용)
 */
export function getYouTubeId(url: string): string | null {
  if (!url?.trim()) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.trim().match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function getYouTubeThumbnailUrl(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
