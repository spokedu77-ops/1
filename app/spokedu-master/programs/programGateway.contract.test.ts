import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('app/spokedu-master/programs/page.tsx', 'utf8');
const assets = readFileSync('app/spokedu-master/lib/programGatewayAssets.ts', 'utf8');

function pngDimensions(path: string) {
  const bytes = readFileSync(path);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('program gateway cards', () => {
  it('uses the supplied near-16:9 images without changing destinations or order', () => {
    const play = pngDimensions('public/images/spokedu/programs/program-gate-play.png');
    const spomove = pngDimensions('public/images/spokedu/programs/program-gate-spomove.png');
    expect(play).toEqual({ width: 1672, height: 941 });
    expect(spomove).toEqual({ width: 1200, height: 675 });
    expect(Math.abs(play.width / play.height - 16 / 9)).toBeLessThan(0.002);
    expect(spomove.width / spomove.height).toBe(16 / 9);
    expect(assets).toContain("lessonHero: '/images/spokedu/programs/program-gate-play.png'");
    expect(assets).toContain("spomoveHero: '/images/spokedu/programs/program-gate-spomove.png'");
    expect(page.indexOf('href="/spokedu-lab/library"')).toBeLessThan(page.indexOf('href="/spokedu-lab/spomove"'));
  });

  it('keeps equal 16:9 responsive cards with badges outside the image', () => {
    expect(page).toContain('md:grid-cols-2');
    expect(page).toContain('relative aspect-[16/9] overflow-hidden');
    expect(page).toContain('className="object-contain"');
    expect(page).toContain('className="flex min-h-[166px] flex-1 flex-col');
    expect(page).toContain('className="mt-auto inline-flex');
    expect(page).not.toContain('absolute left-3 top-3 z-10');
  });
});
