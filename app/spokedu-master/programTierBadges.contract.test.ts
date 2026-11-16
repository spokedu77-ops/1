import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER program tier badges', () => {
  it('labels lesson and SPOMOVE gateways with their canonical tiers', () => {
    const programs = read('app/spokedu-master/programs/page.tsx');
    expect(programs).toContain('title="놀이체육" tier="라이트 · 프리미엄"');
    expect(programs).toContain('title="SPOMOVE" tier="프리미엄 전용"');
    expect(programs).toContain('href="/spokedu-lab/library"');
    expect(programs).toContain('href="/spokedu-lab/spomove"');
    expect(programs).toContain('{title} 시작하기');
  });

  it('always links the SPOMOVE hub to the public SPOMAT guide', () => {
    const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');
    expect(hub).toContain('href="/spomat"');
    expect(hub).toContain('SPOMAT 알아보기');
  });
});

