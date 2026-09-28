import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
const weights = [
  [400, 'Paperlogy-4Regular.woff2'],
  [500, 'Paperlogy-5Medium.woff2'],
  [600, 'Paperlogy-6SemiBold.woff2'],
  [700, 'Paperlogy-7Bold.woff2'],
  [800, 'Paperlogy-8ExtraBold.woff2'],
] as const;

function sourceFiles(root: string) {
  return (fs.readdirSync(path.join(process.cwd(), root), { recursive: true, encoding: 'utf8' }) as string[])
    .map((entry) => path.join(root, entry))
    .filter((entry) => !entry.endsWith('spomoveTypography.contract.test.ts') && /\.(tsx?|css)$/.test(entry) && fs.statSync(path.join(process.cwd(), entry)).isFile());
}

describe('Paperlogy one-family typography contract', () => {
  it('maps every supported local weight and makes Paperlogy first in both tokens', () => {
    const css = read('app/globals.css');
    for (const [weight, filename] of weights) {
      expect(fs.existsSync(path.join(process.cwd(), 'public/fonts/paperlogy', filename))).toBe(true);
      expect(css).toContain(`url("/fonts/paperlogy/${filename}") format("woff2")`);
      expect(css).toMatch(new RegExp(`font-family: "Paperlogy";[\\s\\S]*?font-weight: ${weight};`));
    }
    expect(css).toMatch(/--spm-font-body:\s*"Paperlogy"/);
    expect(css).toMatch(/--spm-font-display:\s*"Paperlogy"/);
    expect(css).toContain('font-synthesis: none;');
    expect(css).not.toMatch(/font-weight:\s*900/);
  });

  it('uses body typography at the MASTER and Session roots and 800 display typography for stimuli', () => {
    expect(read('app/spokedu-master/components/layout/AppShell.tsx')).toContain('data-spm-app-shell="true"');
    expect(read('app/spokedu-master/spomove/session/page.tsx')).toContain("style={{ fontFamily: 'var(--spm-font-body)' }}");
    expect(read('app/admin/spomove/training/_player/lib/reactTrainStartCountdown.tsx')).toContain("fontFamily: 'var(--spm-font-display)'");
    expect(read('app/admin/spomove/training/_player/components/BeatWaveReactionTraining.tsx')).toContain('font-family:var(--spm-font-display);font-weight:800;font-synthesis:none');
  });

  it('has no legacy brand fonts or 900-weight branding in MASTER/SPOMOVE sources', () => {
    const files = [...sourceFiles('app/spokedu-master'), ...sourceFiles('app/admin/spomove/training/_player')];
    const legacy = files.filter((file) => /Black Han|BlackHan|Bebas Neue|Bebas|Barlow Condensed/.test(read(file)));
    const weight900 = files.filter((file) => /font-black|font-weight:\s*900|fontWeight.{0,20}900/.test(read(file)));
    expect(legacy).toEqual([]);
    expect(weight900).toEqual([]);
  });

  it('keeps semantic typography roles in the shared MASTER SSOT', () => {
    const ui = read('app/spokedu-master/lib/masterUiClasses.ts');
    expect(ui).toContain("font-extrabold leading-[1.10] tracking-[-0.035em]");
    expect(ui).toContain("font-extrabold leading-[1.15] tracking-[-0.03em]");
    expect(ui).toContain("font-extrabold leading-[1.22] tracking-[-0.022em]");
    expect(ui).toContain("font-bold leading-[1.30] tracking-[-0.015em]");
  });
});
