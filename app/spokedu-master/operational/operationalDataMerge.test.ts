import { describe, expect, it } from 'vitest';
import type { MasterClassDto, MasterSessionDto, MasterStudentDto } from '../types/operational';
import {
  mergeClassesPreservingEqualItems,
  mergeSessionsPreservingEqualItems,
  mergeStudentsPreservingEqualItems,
  studentOperationalFingerprint,
} from './operationalDataMerge';

const baseStudent = (): MasterStudentDto => ({
  id: 's1',
  legacyId: null,
  name: 'Kim',
  meta: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
});

describe('operationalDataMerge', () => {
  it('reuses the same student reference when id and payload match', () => {
    const current = [baseStudent()];
    const next = [{ ...baseStudent() }];
    const merged = mergeStudentsPreservingEqualItems(current, next);
    expect(merged[0]).toBe(current[0]);
  });

  it('returns a new student reference when the same id has different content', () => {
    const current = [baseStudent()];
    const next = [{ ...baseStudent(), name: 'Lee', updatedAt: '2026-01-03T00:00:00.000Z' }];
    const merged = mergeStudentsPreservingEqualItems(current, next);
    expect(merged[0]).not.toBe(current[0]);
    expect(merged[0]?.name).toBe('Lee');
  });

  it('detects fingerprint changes for meta and guidance fields', () => {
    const left = baseStudent();
    const right = { ...baseStudent(), guidanceNote: 'note' };
    expect(studentOperationalFingerprint(left)).not.toBe(studentOperationalFingerprint(right));
  });

  it('reuses class references only when roster membership matches', () => {
    const current: MasterClassDto[] = [{
      id: 'c1',
      name: 'A',
      studentIds: ['s1', 's2'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }];
    const next: MasterClassDto[] = [{
      ...current[0]!,
      studentIds: ['s2', 's1'],
    }];
    expect(mergeClassesPreservingEqualItems(current, next)[0]).toBe(current[0]);

    const changed: MasterClassDto[] = [{
      ...current[0]!,
      studentIds: ['s1'],
      updatedAt: '2026-01-04T00:00:00.000Z',
    }];
    expect(mergeClassesPreservingEqualItems(current, changed)[0]).not.toBe(current[0]);
  });

  it('updates session references when attendance version changes for the same id', () => {
    const session = (): MasterSessionDto => ({
      id: 'sess1',
      classId: 'c1',
      className: 'A',
      startAt: '2026-01-01T09:00:00.000Z',
      endAt: '2026-01-01T10:00:00.000Z',
      startedAt: null,
      status: 'scheduled',
      memo: null,
      attendanceVersion: 1,
      parentNotice: null,
      completedAt: null,
      programs: [],
      attendance: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const current = [session()];
    const next = [{ ...session(), attendanceVersion: 2, updatedAt: '2026-01-01T01:00:00.000Z' }];
    const merged = mergeSessionsPreservingEqualItems(current, next);
    expect(merged[0]).not.toBe(current[0]);
    expect(merged[0]?.attendanceVersion).toBe(2);
  });
});
