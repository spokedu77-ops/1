import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/api/spokedu-master/sessions/route.ts'), 'utf8');

describe('Lite Session memo contract', () => {
  it('keeps Session memo readable and writable for Lite under PD-011', () => {
    expect(source).not.toContain("access.plan === 'lite' && input.memo");
    expect(source).not.toContain("access.plan === 'lite' ? { ...session, memo: null }");
    expect(source).not.toContain("access.plan === 'lite' ? { ...aggregate, memo: null }");
    expect(source).not.toContain("access.plan === 'lite' ? { ...result[0], memo: null }");
    expect(source).toContain('p_memo: input.memo');
  });
});

