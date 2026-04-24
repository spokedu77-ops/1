/**
 * YouTube watch / share / short URL → iframe용 embed URL
 * (watch?v=, youtu.be/, /embed/ 이미 인 경우)
 */
export function youtubeWatchOrShareToEmbedSrc(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0];
      if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
      return null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch' || u.pathname === '/watch/') {
        const id = u.searchParams.get('v');
        if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
      }
      const embedMatch = u.pathname.match(/^\/embed\/([\w-]+)/);
      if (embedMatch?.[1] && /^[\w-]{11}$/.test(embedMatch[1])) {
        return `https://www.youtube.com/embed/${embedMatch[1]}`;
      }
      const shortsMatch = u.pathname.match(/^\/shorts\/([\w-]+)/);
      if (shortsMatch?.[1] && /^[\w-]{11}$/.test(shortsMatch[1])) {
        return `https://www.youtube.com/embed/${shortsMatch[1]}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}
