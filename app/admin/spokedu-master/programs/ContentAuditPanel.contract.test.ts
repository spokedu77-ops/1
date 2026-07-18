import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(join(process.cwd(), 'app/admin/spokedu-master/programs/page.tsx'), 'utf8');
const panel = readFileSync(
  join(process.cwd(), 'app/admin/spokedu-master/programs/ContentAuditPanel.tsx'),
  'utf8',
);

describe('admin programs Phase E audit tab', () => {
  it('keeps the audit UI inside /admin/spokedu-master/programs', () => {
    expect(page).toContain("key: 'content-audit', label: 'Phase E 감사'");
    expect(page).toContain("import { ContentAuditPanel } from './ContentAuditPanel'");
    expect(page).toContain("activeTab === 'content-audit'");
    expect(page).toContain('openProgramFromAudit');
  });

  it('loads the content-audit API and opens the program editor from a row', () => {
    expect(panel).toContain('/api/admin/spokedu-master/programs/content-audit?limit=');
    expect(panel).toContain('onOpenProgram');
    expect(panel).toContain('편집기에서 열기');
    expect(panel).toContain('표 복사');
  });
});
