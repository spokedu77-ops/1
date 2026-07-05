import { describe, expect, it } from 'vitest';
import {
  buildVideoBlockContentFromUrl,
  isAllowedVideoEmbedUrl,
  parseVideoEmbedUrl,
  videoEmbedUnsupportedMessage,
  videoProviderLabel,
} from './videoEmbed';

describe('videoEmbed', () => {
  it('parses YouTube, Vimeo, and Loom share URLs', () => {
    expect(parseVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
    expect(parseVideoEmbedUrl('https://vimeo.com/123456789')).toEqual({
      provider: 'vimeo',
      videoId: '123456789',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    });
    expect(parseVideoEmbedUrl('https://www.loom.com/share/abcdef12-3456-7890-abcd-ef1234567890')).toEqual({
      provider: 'loom',
      videoId: 'abcdef12-3456-7890-abcd-ef1234567890',
      embedUrl: 'https://www.loom.com/embed/abcdef12-3456-7890-abcd-ef1234567890',
    });
  });

  it('allows only trusted embed hosts', () => {
    expect(isAllowedVideoEmbedUrl('https://www.loom.com/embed/abc')).toBe(true);
    expect(isAllowedVideoEmbedUrl('https://evil.example/embed/x')).toBe(false);
  });

  it('builds persisted block content from parsed URLs', () => {
    expect(buildVideoBlockContentFromUrl('https://vimeo.com/99')).toMatchObject({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/99',
    });
    expect(buildVideoBlockContentFromUrl('https://example.com/x')).toEqual({ url: 'https://example.com/x' });
  });

  it('labels providers and unsupported copy', () => {
    expect(videoProviderLabel('loom')).toBe('Loom');
    expect(videoEmbedUnsupportedMessage()).toMatch(/Loom/);
  });
});
