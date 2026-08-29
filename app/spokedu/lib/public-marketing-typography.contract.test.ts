import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

function utility(source: string, name: string): string {
  const match = source.match(new RegExp('export const ' + name + "\\s*=\\s*[\\r\\n ]*([`'])([^`']+)\\1;"));
  expect(match, `${name} must be a static canonical utility`).not.toBeNull();
  return match?.[2] ?? '';
}

describe('public marketing typography contract', () => {
  const globals = read('app/globals.css');
  const utilities = read('app/spokedu/lib/ui-classes.ts');
  const publicSource = [
    collectSource('app/spokedu/components'),
    collectSource('app/spokedu/contact'),
    collectSource('app/spokedu/programs'),
  ].join('\n');

  it('owns the two font families in the marketing foundation', () => {
    expect(globals).toMatch(/@font-face\s*{[^}]*font-family:\s*"Cafe24SsurroundAir"[^}]*Cafe24SsurroundAir\.woff/);
    expect(existsSync(join(root, 'public/fonts/Cafe24SsurroundAir.woff'))).toBe(true);
    expect(globals).toMatch(/--spokedu-marketing-font-display:\s*Pretendard/);
    expect(globals).toMatch(/--spokedu-marketing-font-body:\s*Pretendard,\s*"Noto Sans KR",\s*"Apple SD Gothic Neo",\s*"Malgun Gothic",\s*system-ui/);
    expect(globals).toMatch(/--spokedu-marketing-font-metric:\s*var\(--spokedu-marketing-font-display\)/);
    expect(globals).toMatch(/\.spokedu-marketing\s*{[^}]*font-family:\s*var\(--spokedu-marketing-font-body\)/);
  });

  it('keeps the V17 hero scale and the approved Home major/compact hierarchy', () => {
    expect(utility(utilities, 'marketingHeroDisplay')).toContain('text-[clamp(44px,6vw,76px)]');
    expect(utility(utilities, 'marketingHeroDisplay')).toContain('max-[480px]:text-[38px]');
    expect(utility(utilities, 'marketingSectionDisplay')).toContain('text-[clamp(34px,5vw,58px)]');

    const home = read('app/spokedu/components/home/home-editorial.module.css');
    expect(home).not.toMatch(/\.heroTitle\s*{/);
    expect(home).not.toMatch(/\.sectionTitle\s*{/);
    expect(home).not.toMatch(/\.bridgeTitle\s*{/);
    expect(home).not.toMatch(/font-size:\s*clamp\(/);
  });

  it('keeps the V17 subscription headings on the approved bold rendering', () => {
    const v17 = read('app/spokedu/components/subscription-v17/subscription-v17.module.css');
    expect(v17).toMatch(/--font-display:\s*Pretendard/);
    expect(v17).toMatch(/\.root :global\(\.hero h1\)\s*{[^}]*font-weight:\s*700/);
    expect(v17).toMatch(/\.root :global\(\.section-title\)\s*{[^}]*font-weight:\s*700/);
  });

  it.each(['marketingHeroDisplay', 'marketingSectionDisplay'])('%s uses the approved Pretendard 700 display contract', (name) => {
    const value = utility(utilities, name);
    expect(value).toContain('[font-family:var(--spokedu-marketing-font-display)]');
    expect(value).toContain('font-bold');
    expect(value).not.toContain('Cafe24SsurroundAir');
    expect(value).not.toContain('font-normal');
    expect(value).not.toContain('[font-synthesis:none]');
  });

  it('keeps Home heading CSS limited to layout composition only', () => {
    const home = read('app/spokedu/components/home/home-editorial.module.css');
    expect(home).not.toMatch(/font-family:\s*"Cafe24SsurroundAir"/);
    expect(home).not.toMatch(/font-weight:\s*400/);
    expect(home).not.toMatch(/\.(?:heroTitle|sectionTitle|compactTitle|bridgeTitle)\s*{/);
  });

  it.each(['marketingCompactDisplay', 'marketingMetricDisplay'])('%s keeps its explicit lightweight display role', (name) => {
    const value = utility(utilities, name);
    expect(value).toContain('[font-family:var(--spokedu-marketing-font-display)]');
    expect(value).toContain('font-normal');
  });

  it.each(['marketingBody', 'marketingSectionLead', 'marketingCaption'])('%s remains on the body family', (name) => {
    expect(utility(utilities, name)).toContain('[font-family:var(--spokedu-marketing-font-body)]');
  });

  it('removes migrated legacy public heading utilities and direct display declarations', () => {
    expect(publicSource).not.toMatch(/\b(?:homeHeroH1|homeSectionH2|landingH1|landingSectionTitle)\b/);
    expect(publicSource).not.toContain('[font-family:var(--spokedu-marketing-font-display)]');
  });

  it('keeps key public page titles and section titles on canonical utilities', () => {
    expect(read('app/spokedu/components/home/home-editorial-landing.tsx')).toMatch(/<h1[\s\S]*marketingHeroDisplay/);
    expect(read('app/spokedu/components/home/home-editorial-landing.tsx')).toMatch(/<h2[\s\S]*marketingSectionDisplay/);
    expect(read('app/spokedu/components/landing-hero.tsx')).toMatch(/<motion\.h1[\s\S]*marketingHeroDisplay/);
    expect(read('app/spokedu/components/education-hub-landing.tsx')).toMatch(/<h1[\s\S]*marketingHeroDisplay/);
    expect(read('app/spokedu/components/education-hub-landing.tsx')).toMatch(/<h2[\s\S]*marketingSectionDisplay/);
    expect(read('app/spokedu/components/spomove-program-landing.tsx')).toMatch(/<h1[\s\S]*marketingHeroDisplay/);
    expect(read('app/spokedu/components/spomove-program-landing.tsx')).toMatch(/<h2[\s\S]*marketingSectionDisplay/);
  });

  it('does not hide migration behind broad heading overrides', () => {
    expect(globals).not.toMatch(/\.spokedu-marketing\s+(?:h1|h2)/);
    expect(read('app/spokedu/components/home/home-editorial.module.css')).not.toMatch(/:is\(h1,\s*h2\)/);
  });
});
