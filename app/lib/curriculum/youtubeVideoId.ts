/**
 * YouTube URL → 11자 영상 ID (Shorts / 라이브 / watch / embed / youtu.be 공통)
 */
export function getYouTubeVideoId(raw: string): string | null {
  let url = (raw ?? '').trim().replace(/\u200b/g, '');
  if (!url) return null;

  if (url.startsWith('//')) url = `https:${url}`;
  if (/^(?:youtube\.com|m\.youtube\.com|www\.youtube\.com)\//i.test(url)) {
    url = `https://${url}`;
  }

  const patterns: RegExp[] = [
    /(?:youtube\.com\/shorts\/|m\.youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?=[?&#/]|$)/i,
    /(?:youtube\.com\/live\/|m\.youtube\.com\/live\/)([a-zA-Z0-9_-]{11})(?=[?&#/]|$)/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})(?=[?&#/]|$)/i,
    /[?&]v=([a-zA-Z0-9_-]{11})(?=[?&#/]|$)/i,
    /embed\/([a-zA-Z0-9_-]{11})(?=[?&#/]|$)/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]?.length === 11) return m[1];
  }

  const legacy = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*)/i;
  const match = url.match(legacy);
  if (match && match[2].length === 11) return match[2];
  return null;
}
