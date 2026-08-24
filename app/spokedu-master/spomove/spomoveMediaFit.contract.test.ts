import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  SPOMOVE_IMAGE_THUMB_ASPECT_CLASS,
  SPOMOVE_IMAGE_THUMB_OBJECT_FIT,
  SPOMOVE_VIDEO_FRAME_ASPECT_CLASS,
  SPOMOVE_VIDEO_POSTER_OBJECT_FIT,
} from './spomoveMediaFit';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const fitSsot = read('app/spokedu-master/spomove/spomoveMediaFit.ts');
const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
const sheet = read('app/spokedu-master/spomove/SpomoveGuidelineSheet.tsx');

describe('SPOMOVE media fit — IMAGE frozen / VIDEO full-frame', () => {
  it('locks SSOT: image cover + video contain', () => {
    expect(SPOMOVE_IMAGE_THUMB_OBJECT_FIT).toBe('cover');
    expect(SPOMOVE_IMAGE_THUMB_ASPECT_CLASS).toBe('aspect-[6/5]');
    expect(SPOMOVE_VIDEO_POSTER_OBJECT_FIT).toBe('contain');
    expect(SPOMOVE_VIDEO_FRAME_ASPECT_CLASS).toBe('aspect-video');
    expect(fitSsot).toContain("SPOMOVE_IMAGE_THUMB_OBJECT_FIT = 'cover'");
    expect(fitSsot).toContain("SPOMOVE_VIDEO_POSTER_OBJECT_FIT = 'contain'");
  });

  it('keeps Hub CardVisual image thumbs on frozen cover crop (not video contain)', () => {
    const cardVisual = hub.slice(hub.indexOf('function CardVisual'), hub.indexOf('function cardBadgeClass'));
    expect(cardVisual).toContain("data-spm-spomove-media=\"image-thumb\"");
    expect(cardVisual).toContain('aspect-[6/5]');
    expect(cardVisual).toContain('object-cover object-center');
    expect(cardVisual).not.toContain('object-contain');
    expect(cardVisual).not.toContain('posterObjectFit');
    expect(cardVisual).not.toContain('SPOMOVE_VIDEO_POSTER_OBJECT_FIT');
  });

  it('renders guide video preview with contain + aspect-video (no column stretch crop)', () => {
    const preview = sheet.slice(
      sheet.indexOf('function SpomoveScreenPreview'),
      sheet.indexOf('function BriefingSection'),
    );
    expect(preview).toContain('SPOMOVE_VIDEO_POSTER_OBJECT_FIT');
    expect(preview).toContain('SPOMOVE_VIDEO_FRAME_ASPECT_CLASS');
    expect(preview).toContain('posterObjectFit={SPOMOVE_VIDEO_POSTER_OBJECT_FIT}');
    expect(preview).toContain("data-spm-spomove-media=\"video-preview\"");
    expect(preview).not.toContain('aspect-auto');
    expect(preview).not.toContain('lg:h-full');
    expect(preview).not.toContain('object-cover');
    expect(preview).not.toContain('posterObjectFit="cover"');
  });

  it('does not route Hub image thumbs through video preview helpers', () => {
    expect(hub).not.toContain('getVideoThumbnailCandidates');
    expect(hub).not.toContain('TrackedVideoIframe');
    expect(hub).not.toContain('SPOMOVE_VIDEO_POSTER_OBJECT_FIT');
  });
});
