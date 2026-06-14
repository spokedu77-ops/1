import { describe, expect, it } from 'vitest';

import { getVideoThumbnail } from './program-media';

describe('program media', () => {
  it('uses the broadly available YouTube thumbnail size', () => {
    expect(getVideoThumbnail('https://youtu.be/yrfoL2OC5K4'))
      .toBe('https://img.youtube.com/vi/yrfoL2OC5K4/hqdefault.jpg');
  });
});
