export type VideoEmbedProvider = 'youtube' | 'vimeo';

export type ParsedVideoEmbed = {
  provider: VideoEmbedProvider;
  embedUrl: string;
  videoId: string;
};

const ALLOWED_EMBED_HOSTS = new Set([
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
]);

function parseYoutubeId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/')[2];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/')[2];
        return id && /^[\w-]{11}$/.test(id) ? id : null;
      }
      const id = url.searchParams.get('v');
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}

function parseVimeoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;

    const parts = url.pathname.split('/').filter(Boolean);
    const id = host === 'player.vimeo.com'
      ? parts[1]
      : parts[0];
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function parseVideoEmbedUrl(input: string): ParsedVideoEmbed | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const youtubeId = parseYoutubeId(trimmed);
  if (youtubeId) {
    return {
      provider: 'youtube',
      videoId: youtubeId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }

  const vimeoId = parseVimeoId(trimmed);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      videoId: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  return null;
}

export function isAllowedVideoEmbedUrl(embedUrl: string): boolean {
  try {
    const url = new URL(embedUrl.trim());
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.replace(/^www\./, '');
    return ALLOWED_EMBED_HOSTS.has(host) || ALLOWED_EMBED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function resolveVideoEmbedContent(
  content: Record<string, unknown> | null | undefined,
): ParsedVideoEmbed | null {
  const embedUrl = typeof content?.embedUrl === 'string' ? content.embedUrl.trim() : '';
  const provider = content?.provider;
  const url = typeof content?.url === 'string' ? content.url.trim() : '';

  if (embedUrl && isAllowedVideoEmbedUrl(embedUrl)) {
    const fromUrl = url ? parseVideoEmbedUrl(url) : null;
    if (fromUrl && fromUrl.embedUrl === embedUrl) return fromUrl;
    if (provider === 'youtube' || provider === 'vimeo') {
      const videoId = embedUrl.split('/').filter(Boolean).pop() ?? '';
      if (videoId) {
        return {
          provider,
          videoId,
          embedUrl,
        };
      }
    }
  }

  if (url) return parseVideoEmbedUrl(url);
  return null;
}

export function buildVideoBlockContentFromUrl(url: string): Record<string, unknown> {
  const trimmed = url.trim();
  const parsed = parseVideoEmbedUrl(trimmed);
  if (!parsed) {
    return { url: trimmed };
  }
  return {
    url: trimmed,
    provider: parsed.provider,
    embedUrl: parsed.embedUrl,
  };
}

export function videoProviderLabel(provider: VideoEmbedProvider): string {
  return provider === 'youtube' ? 'YouTube' : 'Vimeo';
}
