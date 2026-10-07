import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INSTITUTION_LAB_DESTINATION, normalizeInstitutionLoginId } from './institutionAccount';

describe('normalizeInstitutionLoginId', () => {
  it('normalizes operator-issued institution IDs without mapping them in client code', () => {
    expect(normalizeInstitutionLoginId('  기관01  ')).toBe('기관01');
    expect(normalizeInstitutionLoginId(' Center-A ')).toBe('center-a');
  });

  it('rejects non-string input as an empty identifier', () => {
    expect(normalizeInstitutionLoginId(null)).toBe('');
  });

  it('reuses the existing production LAB route', () => {
    expect(INSTITUTION_LAB_DESTINATION).toBe('/spokedu-lab/dashboard');
    const teacherLayout = readFileSync(join(process.cwd(), 'app/teacher/layout.tsx'), 'utf8');
    expect(teacherLayout).toContain("router.replace('/spokedu-lab/dashboard')");
    expect(teacherLayout).not.toContain("router.replace('/spokedu-master/dashboard')");
  });
});
