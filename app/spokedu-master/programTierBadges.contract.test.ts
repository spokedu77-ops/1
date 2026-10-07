import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER program tier badges', () => {
  it('labels lesson and SPOMOVE gateways with their canonical tiers', () => {
    const programs = read('app/spokedu-master/programs/page.tsx');
    expect(programs).toContain('tier="Lite"');
    expect(programs).toContain('tier="Premium"');
    expect(programs).toContain('aria-label={`${title} · ${tier} 프로그램 둘러보기`}');
  });

  it('always links the SPOMOVE hub to the public SPOMAT guide', () => {
    const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    expect(hub).toContain('href="/spomat"');
    expect(hub).toContain('SPOMAT 알아보기');
  });
});

