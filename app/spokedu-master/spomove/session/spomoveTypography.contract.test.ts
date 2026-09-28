import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('SPOMOVE typography contract', () => {
  it('loads the local Black Han Sans display face and keeps the body stack', () => {
    const css = read('app/globals.css');
    expect(css).toContain('url("/fonts/BlackHanSans-Regular.woff2")');
    expect(css).toMatch(/--spm-font-display:[^;]*"Black Han Sans"/);
    expect(css).toMatch(/--spm-font-body:[^;]*"SUIT"[^;]*"Pretendard"[^;]*"Wanted Sans"/);
    expect(fs.existsSync(path.join(process.cwd(), 'public/fonts/BlackHanSans-Regular.woff2'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'public/fonts/BlackHanSans-OFL.txt'))).toBe(true);
  });

  it('uses body typography at the Session root and display typography for countdowns and HUD', () => {
    expect(read('app/spokedu-master/spomove/session/page.tsx'))
      .toContain("style={{ fontFamily: 'var(--spm-font-body)' }}");
    expect(read('app/admin/spomove/training/_player/lib/reactTrainStartCountdown.tsx'))
      .toContain("fontFamily: 'var(--spm-font-display)'");
    expect(read('app/admin/spomove/training/_player/components/BeatWaveReactionTraining.tsx'))
      .toContain('font-family:var(--spm-font-display);font-weight:400;font-synthesis:none');
  });

  it('has no legacy Bebas or Barlow runtime hardcodes', () => {
    const roots = [
      'app/admin/spomove/training/_player',
      'app/spokedu-master/spomove',
    ];
    const files = roots.flatMap((root) => (fs.readdirSync(path.join(process.cwd(), root), { recursive: true, encoding: 'utf8' }) as string[])
      .map((entry) => path.join(root, entry))
      .filter((entry) => !entry.endsWith('spomoveTypography.contract.test.ts') && /\.(tsx?|css)$/.test(entry) && fs.statSync(path.join(process.cwd(), entry)).isFile()));
    const matches = files.filter((file) => /Bebas Neue|Barlow Condensed/.test(read(file)));
    expect(matches).toEqual([]);
  });
});