import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const provider = readFileSync(join(process.cwd(), 'app/spokedu-master/operational/OperationalDataProvider.tsx'), 'utf8');
const merge = readFileSync(join(process.cwd(), 'app/spokedu-master/operational/operationalDataMerge.ts'), 'utf8');
const sessionType = readFileSync(join(process.cwd(), 'app/spokedu-master/types/operational.ts'), 'utf8');

describe('Operational soft refresh data contract', () => {
  it('does not use structural-sharing merge in the live provider reload path', () => {
    expect(provider).not.toContain('mergeStudentsPreservingEqualItems');
    expect(provider).not.toContain('mergeSessionsPreservingEqualItems');
    expect(provider).toContain('setStudents(nextStudents)');
    expect(provider).toContain('setSessions(nextSessions)');
  });

  it('documents session fingerprint gaps when merge helpers are used elsewhere', () => {
    expect(sessionType).toContain('roster?:');
    expect(sessionType).toContain('scheduleRuleId?:');
    expect(merge).toContain('sessionOperationalFingerprint');
    expect(merge).not.toMatch(/\broster\?:/);
    expect(merge).not.toContain('scheduleRuleId');
  });
});
