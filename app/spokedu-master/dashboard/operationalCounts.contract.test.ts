import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dashboard = readFileSync(join(process.cwd(), 'app/spokedu-master/dashboard/DashboardView.tsx'), 'utf8');
const opsBar = readFileSync(join(process.cwd(), 'app/spokedu-master/dashboard/CompactOpsBar.tsx'), 'utf8');

describe('dashboard operational count contract', () => {
  it('does not show operational counts as zero before records are ready', () => {
    expect(opsBar).toContain('recordCount: number | null');
    expect(opsBar).toContain('기록 확인 중');
    expect(dashboard).toContain("recordCount={operationalStatus === 'ready' ? classRecords.length : null}");
    expect(dashboard).toContain("studentMemoCount={operationalStatus === 'ready' ? studentMemoCount : null}");
  });
});
