import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('SPOKEDU LAB Open Graph image contract', () => {
  const route = read('app/api/spokedu-master/og/route.tsx');
  const layout = read('app/spokedu-master/layout.tsx');
  const labLayout = read('app/spokedu-lab/layout.tsx');
  const publicLabPage = read('app/(spokedu-public)/subscription/SpokeduLabLanding.tsx');

  it('uses the current LAB product capture and never renders the retired MASTER brand', () => {
    expect(route).toContain('/images/spokedu/subscription/library-program-cards-20261008-final.png');
    expect(route).not.toContain('home-master-ui.png');
    expect(route).not.toMatch(/SPOKEDU MASTER|>MASTER</);
    expect(route).toContain('SPOKEDU LAB');
  });

  it('declares the 1200 by 630 social image dimensions', () => {
    expect(route).toContain('width: 1200');
    expect(route).toContain('height: 630');
    expect(layout).toContain('width: 1200, height: 630');
  });

  it('uses the same versioned image for Open Graph, Twitter, MASTER, and LAB aliases', () => {
    expect(layout).toContain("const SPOKEDU_LAB_OG_IMAGE = '/api/spokedu-master/og?v=20261013-2'");
    expect(layout).toContain('images: [{ url: SPOKEDU_LAB_OG_IMAGE');
    expect(layout).toContain('images: [SPOKEDU_LAB_OG_IMAGE]');
    expect(labLayout).toContain("export { metadata, viewport } from '../spokedu-master/layout'");
    expect(publicLabPage).toContain("/api/spokedu-master/og?v=20261013-2");
    expect(publicLabPage).toContain('images: [OG_IMAGE_URL]');
  });
});
