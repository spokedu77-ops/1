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
});
