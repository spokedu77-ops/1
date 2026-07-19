import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/api/admin/spokedu-master/programs/content-audit/route.ts'),
  'utf8',
);

describe('admin content-audit route contract', () => {
  it('requires admin and uses service role reads only', () => {
    expect(source).toContain("requireAdmin");
    expect(source).toContain('getServiceSupabase');
    expect(source).toContain('buildContentAuditItem');
    expect(source).not.toContain('createServerSupabaseClient');
  });

  it('returns Phase E checklist columns for top N programs', () => {
    expect(source).toContain("checklistColumns: ['영상', '준비물', '단계', '태그']");
    expect(source).not.toContain("'안전'");
    expect(source).toContain('parseLimit');
    expect(source).toContain('summarizeContentAudit');
  });
});
