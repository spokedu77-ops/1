import { getYouTubeVideoId } from '@/app/lib/curriculum/youtubeVideoId';

/**
 * YouTube URL → video id / 썸네일 URL (카드·모달 공용)
 */
export function getYouTubeId(url: string): string | null {
  return getYouTubeVideoId(url);
}

export function getYouTubeThumbnailUrl(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
