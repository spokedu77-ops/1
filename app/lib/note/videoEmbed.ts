export type VideoEmbedProvider = 'youtube' | 'vimeo' | 'loom';

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
  'www.loom.com',
  'loom.com',
]);

const ALLOWED_VIDEO_PROVIDERS = new Set<VideoEmbedProvider>(['youtube', 'vimeo', 'loom']);

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

function parseLoomId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'loom.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'share' && parts[0] !== 'embed') return null;
    const id = parts[1];
    return id && /^[a-f0-9-]{32,36}$/i.test(id) ? id : null;
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

  const loomId = parseLoomId(trimmed);
  if (loomId) {
    return {
      provider: 'loom',
      videoId: loomId,
      embedUrl: `https://www.loom.com/embed/${loomId}`,
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
    if (typeof provider === 'string' && ALLOWED_VIDEO_PROVIDERS.has(provider as VideoEmbedProvider)) {
      const videoId = embedUrl.split('/').filter(Boolean).pop() ?? '';
      if (videoId) {
        return {
          provider: provider as VideoEmbedProvider,
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
  if (provider === 'youtube') return 'YouTube';
  if (provider === 'vimeo') return 'Vimeo';
  return 'Loom';
}

export function videoEmbedPlaceholder(): string {
  return 'YouTube · Vimeo · Loom URL을 붙여넣으세요';
}

export function videoEmbedUnsupportedMessage(): string {
  return 'YouTube, Vimeo, Loom 링크만 지원합니다.';
}
