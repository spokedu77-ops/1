import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const route = readFileSync(join(process.cwd(), 'app/api/admin/curriculum/route.ts'), 'utf8');

describe('/api/admin/curriculum PATCH reorder contract', () => {
  it('documents that reorder is not a single database transaction', () => {
    expect(route).toContain('Not a single DB transaction');
  });

  it('snapshots display_order before reorder and rolls back applied rows on failure', () => {
    expect(route).toContain(".select('id, display_order')");
    expect(route).toContain('beforeOrder');
    expect(route).toContain('applied.push(entry)');
    expect(route).toContain('for (let index = applied.length - 1');
    expect(route).toContain('display_order: previous');
  });

  it('invalidates program source cache after success and after partial failure', () => {
    const reorderBlock = route.slice(route.indexOf('const reorder = parseReorder'), route.indexOf('const id = Number(body.id)'));
    const catchBody = reorderBlock.match(/catch \(reorderError\) \{([\s\S]*?\n    \})/)?.[1] ?? '';
    expect(reorderBlock).toContain('invalidateSpokeduMasterProgramSourceCache()');
    expect(catchBody).toContain('invalidateSpokeduMasterProgramSourceCache()');
    expect(catchBody).toContain('rollbackFailed');
  });
});
