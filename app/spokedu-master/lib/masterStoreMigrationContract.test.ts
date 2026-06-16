import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('SPOKEDU MASTER store legacy operational migration contract', () => {
  const source = () => readSource('app/spokedu-master/store/index.ts');

  it('bumps the active persist version and archives legacy operational slices during migration', () => {
    const text = source();

    expect(text).toContain('version: 12');
    expect(text).toContain('createLegacyOperationalArchiveFromPersistedStore');
    expect(text).toContain('legacyClassRecords');
    expect(text).toContain('legacyStudents');
  });

  it('does not persist active students or classRecords anymore', () => {
    const text = source();
    const partializeBlock = text.slice(text.indexOf('partialize: (state) => ({'));

    expect(partializeBlock).not.toContain('students: state.students');
    expect(partializeBlock).not.toContain('classRecords: state.classRecords');
  });

  it('removes active operational Store actions', () => {
    const text = source();

    expect(text).not.toContain('addStudent:');
    expect(text).not.toContain('removeStudent:');
    expect(text).not.toContain('saveClassRecord:');
    expect(text).not.toContain('saveQuickClassRecord:');
  });
});
