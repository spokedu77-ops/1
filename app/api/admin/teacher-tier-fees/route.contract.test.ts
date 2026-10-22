import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  join(process.cwd(), 'app/api/admin/teacher-tier-fees/route.ts'),
  'utf8',
);
const storeSource = readFileSync(
  join(process.cwd(), 'app/lib/teacherTierFeesStore.ts'),
  'utf8',
);

describe('teacher tier fees server read contract', () => {
  it('keeps the read behind admin auth and service-role access', () => {
    expect(routeSource).toContain('requireAdmin');
    expect(routeSource).toContain('getServiceSupabase');
    expect(routeSource).toContain(".from('teacher_tier_fees')");
    expect(routeSource).toContain("'Cache-Control': 'private, no-store'");
  });

  it('uses the protected API instead of a browser RLS table read', () => {
    expect(storeSource).toContain("fetch('/api/admin/teacher-tier-fees'");
    expect(storeSource).not.toContain(".from('teacher_tier_fees')");
    expect(storeSource).toContain("source: 'fallback'");
  });
});
