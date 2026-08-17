import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function collectSource(directory: string): string {
  return readdirSync(join(root, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = join(directory, entry.name);
      if (entry.isDirectory()) return [collectSource(relative)];
      return /\.(?:ts|tsx)$/.test(entry.name) ? [read(relative)] : [];
    })
    .join('\n');
}

describe('public marketing visual foundation contract', () => {
  const globals = read('app/globals.css');
  const utilities = read('app/spokedu/lib/ui-classes.ts');
  const layout = read('app/spokedu/components/spokedu-marketing-layout.tsx');
  const publicSource = [
    collectSource('app/spokedu/components'),
    collectSource('app/spokedu/contact'),
  ].join('\n');

  it.each([
    'navy-deep', 'navy', 'blue', 'blue-hover', 'blue-soft', 'mint', 'paper', 'white',
    'ink', 'body', 'muted', 'border', 'dark-body', 'dark-eyebrow',
  ])('owns the %s color in globals', (token) => {
    expect(globals).toContain(`--spokedu-marketing-color-${token}:`);
  });

  it('owns the 14 / 22 / 32 radius hierarchy and three shadow levels', () => {
    expect(globals).toMatch(/--spokedu-marketing-radius-small:\s*0\.875rem/);
    expect(globals).toMatch(/--spokedu-marketing-radius-medium:\s*1\.375rem/);
    expect(globals).toMatch(/--spokedu-marketing-radius-large:\s*2rem/);
    expect(globals).toMatch(/--spokedu-marketing-radius-pill:\s*9999px/);
    expect(globals).toContain('--spokedu-marketing-shadow-subtle:');
    expect(globals).toContain('--spokedu-marketing-shadow-interactive:');
    expect(globals).toContain('--spokedu-marketing-shadow-media:');
    expect(globals).not.toContain('--spokedu-marketing-shadow-object:');
  });

  it('keeps color and content width in the CSS foundation rather than layout styles', () => {
    expect(globals).toMatch(/--spokedu-marketing-content-max:\s*77\.5rem/);
    expect(layout).not.toMatch(/spokeduMarketingTokens|style=\{spokeduMarketingTokens\}/);
  });

  it('defines canonical buttons directly with body font, small radius and semantic shadows', () => {
    expect(utilities).toMatch(/const marketingButtonBase\s*=\s*[\s\S]*spokedu-marketing-font-body/);
    expect(utilities).toMatch(/const marketingButtonBase\s*=\s*[\s\S]*marketingRadiusSmall/);
    expect(utilities).toMatch(/export const marketingButtonPrimary\s*=\s*[\s\S]*spokedu-marketing-shadow-subtle/);
    expect(utilities).not.toMatch(/export const (?:btnPrimary|btnSecondary|siteBtnPrimary|siteBtnSecondary)\b/);
  });

  it('keeps migrated public sources off legacy primitive names', () => {
    expect(publicSource).not.toMatch(/\b(?:btnPrimary|btnSecondary|siteBtnPrimary|siteBtnSecondary|landingCardFrame|siteContainer|homeSectionPad)\b/);
  });

  it('uses H1 role independently from its scale on Education and SPOMOVE', () => {
    for (const file of [
      'app/spokedu/components/education-hub-landing.tsx',
      'app/spokedu/components/spomove-program-landing.tsx',
    ]) {
      const source = read(file);
      expect(source).toMatch(/<h1[\s\S]*marketingHeroDisplay/);
      expect(source).toContain('marketingHeroDisplaySectionScale');
    }
  });
});
