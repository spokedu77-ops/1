import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(join(process.cwd(), 'app/api/admin/curriculum/route.ts'), 'utf8');
const pageSource = readFileSync(join(process.cwd(), 'app/admin/curriculum/page.tsx'), 'utf8');

describe('admin curriculum server write contract', () => {
  it('routes curriculum mutations through requireAdmin API', () => {
    expect(routeSource).toContain('requireAdmin');
    expect(routeSource).toContain('invalidateSpokeduMasterProgramSourceCache');
    expect(routeSource).toContain(".from('curriculum')");
    expect(pageSource).toContain("fetch('/api/admin/curriculum'");
    expect(pageSource).toContain("fetch(`/api/admin/curriculum?id=");
    expect(pageSource).not.toMatch(/supabase\.from\(['"]curriculum['"]\)\.(update|insert|delete)/);
  });
});
