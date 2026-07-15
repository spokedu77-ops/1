import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeOperationalRecordById } from './OperationalDataProvider';
import type { MasterClassRecordDto } from '../types/operational';

const root = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('OperationalDataProvider server-first contract', () => {
  const source = () => readSource('app/spokedu-master/operational/OperationalDataProvider.tsx');

  it('waits for a stable auth user UUID before fetching server data', () => {
    const text = source();

    expect(text).toContain('UUID_PATTERN');
    expect(text).toContain("profile?.id");
    expect(text).toContain("? profile.id : null");
    expect(text).toContain("if (!ownerId || !canUseRecords)");
  });

  it('clears previous owner data before loading and on logout', () => {
    const text = source();

    expect(text).toContain('const clearData = useCallback');
    expect(text.match(/clearData\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(text).toContain('activeOwnerRef.current = null');
  });

  it('uses only server operational APIs and never falls back to legacy storage', () => {
    const text = source();

    expect(text).toContain("'/api/spokedu-master/students'");
    expect(text).toContain("'/api/spokedu-master/class-records'");
    expect(text).not.toContain('localStorage');
    expect(text).not.toContain('useMasterStore');
    expect(text).not.toContain('spokedu-master-store');
  });

  it('does not trust ownerId in client mutations', () => {
    const text = source();

    expect(text).toContain('createStudent');
    expect(text).toContain('deleteStudent');
    expect(text).toContain('saveClassRecord');
    expect(text).not.toContain('owner_id');
  });

  it('keeps one class record when an idempotent retry returns the same DB id', () => {
    const original: MasterClassRecordDto = {
      id: 'record-1',
      legacyId: 'request-key',
      date: '2026-06-20',
      lessonTitle: 'Old',
      classId: null,
      programId: 52,
      programTitle: 'Program',
      recordType: 'detailed',
      memo: null,
      parentNoteSnapshot: null,
      present: 0,
      absent: 0,
      focusCount: 0,
      skillCount: 0,
      students: [],
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
    };
    const retry: MasterClassRecordDto = {
      ...original,
      lessonTitle: 'Server copy',
      updatedAt: '2026-06-20T00:01:00.000Z',
    };

    expect(mergeOperationalRecordById([original], retry)).toEqual([retry]);
  });
});

describe('student soft delete route contract', () => {
  const source = () => readSource('app/api/spokedu-master/students/[id]/route.ts');

  it('requires MASTER access and soft deletes only current owner rows', () => {
    const text = source();

    expect(text).toContain('requireSpokeduMasterAccess');
    expect(text).toContain(".eq('owner_id', access.userId)");
    expect(text).toContain(".eq('id', id)");
    expect(text).toContain('deleted_at');
    expect(text).not.toContain('delete()');
  });
});
