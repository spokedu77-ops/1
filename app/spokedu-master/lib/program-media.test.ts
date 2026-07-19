import { describe, expect, it } from 'vitest';

import { getVideoThumbnail, getVideoThumbnailCandidates } from './program-media';

describe('program media', () => {
  it('uses the broadly available YouTube thumbnail size by default', () => {
    expect(getVideoThumbnail('https://youtu.be/yrfoL2OC5K4'))
      .toBe('https://img.youtube.com/vi/yrfoL2OC5K4/hqdefault.jpg');
  });

  it('prefers maxres for large preview surfaces with fallbacks', () => {
    expect(getVideoThumbnail('https://youtu.be/yrfoL2OC5K4', 'max'))
      .toBe('https://img.youtube.com/vi/yrfoL2OC5K4/maxresdefault.jpg');
    expect(getVideoThumbnailCandidates('https://youtu.be/yrfoL2OC5K4')).toEqual([
      'https://img.youtube.com/vi/yrfoL2OC5K4/maxresdefault.jpg',
      'https://img.youtube.com/vi/yrfoL2OC5K4/sddefault.jpg',
      'https://img.youtube.com/vi/yrfoL2OC5K4/hqdefault.jpg',
    ]);
  });

  it('keeps lite media on hq only', () => {
    expect(getVideoThumbnailCandidates('https://youtu.be/yrfoL2OC5K4', { lite: true })).toEqual([
      'https://img.youtube.com/vi/yrfoL2OC5K4/hqdefault.jpg',
    ]);
  });
});
