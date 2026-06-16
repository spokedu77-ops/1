import { describe, expect, it, vi } from 'vitest';
import {
  buildLegacyOperationalBackupJson,
  parseLegacyOperationalStore,
  readLegacyOperationalPreview,
} from './legacyOperationalImport';
import { LEGACY_OPERATIONAL_ARCHIVE_KEY, LEGACY_OPERATIONAL_SOURCE_KEY } from './legacyOperationalArchive';

function store(state: Record<string, unknown>, version = 11) {
  return JSON.stringify({ state, version });
}

const student = {
  id: 'student-1',
  name: ' 학생 1 ',
  group: ' A ',
  meta: '만 8세 / 수강 6개월',
  level: 'gold',
  attendance: 90,
  classes: 10,
  streak: 3,
  risk: 'low',
  skills: [{ label: '균형', value: 44, delta: '+3%' }],
  badges: ['20회'],
  history: ['legacy'],
};

const record = {
  id: 'record-1',
  date: '2026-06-17',
  lessonTitle: '수업',
  classId: 'A',
  programId: '52',
  programTitle: '프로그램',
  recordType: 'detailed',
  memo: '메모',
  parentNoteSnapshot: '학부모',
  students: [
    {
      studentId: 'student-1',
      studentName: '학생 1',
      attendance: 'present',
      focused: true,
      skills: ['협응력', 3, { label: '속도' }, ' 협응력 ', '균형'],
      memo: 'QA',
    },
  ],
};

describe('legacy operational import preview', () => {
  it('parses normal Zustand persist JSON', () => {
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [record] }));

    expect(preview.sourceVersion).toBe(11);
    expect(preview.students.valid).toBe(1);
    expect(preview.records.valid).toBe(1);
    expect(preview.students.candidates[0]).toEqual({
      legacyId: 'student-1',
      name: '학생 1',
      group: 'A',
      meta: '만 8세 / 수강 6개월',
    });
  });

  it('handles a missing localStorage key without writing', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;

    const preview = readLegacyOperationalPreview(storage);

    expect(preview.students.total).toBe(0);
    expect(preview.records.total).toBe(0);
    expect(storage.getItem).toHaveBeenCalled();
    expect((storage as unknown as { setItem: ReturnType<typeof vi.fn> }).setItem).not.toHaveBeenCalled();
    expect((storage as unknown as { removeItem: ReturnType<typeof vi.fn> }).removeItem).not.toHaveBeenCalled();
  });

  it('returns explicit issues for broken JSON', () => {
    const preview = parseLegacyOperationalStore('{nope');

    expect(preview.students.issues[0].reason).toContain('파싱');
    expect(preview.records.issues[0].reason).toContain('파싱');
  });

  it('does not silently accept a different persist structure', () => {
    const preview = parseLegacyOperationalStore(JSON.stringify({ students: [] }));

    expect(preview.students.issues[0].reason).toContain('Zustand');
    expect(preview.records.issues[0].reason).toContain('Zustand');
  });

  it('keeps only actual student fields in candidate payload and preserves string meta', () => {
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [] }));
    const candidate = preview.students.candidates[0] as Record<string, unknown>;

    expect(candidate).toEqual({
      legacyId: 'student-1',
      name: '학생 1',
      group: 'A',
      meta: '만 8세 / 수강 6개월',
    });
    expect(candidate.level).toBeUndefined();
    expect(candidate.attendance).toBeUndefined();
    expect(preview.students.stringMetaPreserved).toBe(1);
  });

  it('preserves object meta', () => {
    const preview = parseLegacyOperationalStore(
      store({ students: [{ ...student, meta: { note: 'kept' } }], classRecords: [] }),
    );

    expect(preview.students.candidates[0].meta).toEqual({ note: 'kept' });
    expect(preview.students.objectMetaPreserved).toBe(1);
  });

  it('normalizes null meta to an empty object', () => {
    const preview = parseLegacyOperationalStore(
      store({ students: [{ ...student, meta: null }], classRecords: [] }),
    );

    expect(preview.students.candidates[0].meta).toEqual({});
  });

  it('normalizes array meta to an empty object with an issue', () => {
    const preview = parseLegacyOperationalStore(
      store({ students: [{ ...student, meta: ['bad'] }], classRecords: [] }),
    );

    expect(preview.students.candidates[0].meta).toEqual({});
    expect(preview.students.invalidMetaCoerced).toBe(1);
    expect(preview.students.issues.some((issue) => issue.reason.includes('meta'))).toBe(true);
  });

  it('normalizes numeric meta to an empty object with an issue', () => {
    const preview = parseLegacyOperationalStore(
      store({ students: [{ ...student, meta: 123 }], classRecords: [] }),
    );

    expect(preview.students.candidates[0].meta).toEqual({});
    expect(preview.students.invalidMetaCoerced).toBe(1);
  });

  it('reports excluded legacy fields', () => {
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [] }));

    expect(preview.excludedLegacyFields).toEqual([
      'attendance',
      'badges',
      'classes',
      'history',
      'level',
      'risk',
      'skills',
      'streak',
    ]);
  });

  it('detects duplicate student legacy IDs', () => {
    const preview = parseLegacyOperationalStore(store({ students: [student, student], classRecords: [] }));

    expect(preview.students.valid).toBe(1);
    expect(preview.students.duplicate).toBe(1);
  });

  it('detects duplicate record legacy IDs', () => {
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [record, record] }));

    expect(preview.records.valid).toBe(1);
    expect(preview.records.duplicate).toBe(1);
  });

  it('marks a normal child connection as importable', () => {
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [record] }));

    expect(preview.records.candidates[0].students[0]).toMatchObject({
      studentId: null,
      studentLegacyId: 'student-1',
      studentName: '학생 1',
      attendance: 'present',
      focused: true,
      memo: 'QA',
    });
  });

  it('preserves orphan child records with a name snapshot', () => {
    const orphanRecord = {
      ...record,
      students: [{ ...record.students[0], studentId: 'missing-student', studentName: '과거 학생' }],
    };
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [orphanRecord] }));

    expect(preview.records.valid).toBe(1);
    expect(preview.records.orphanStudentEntries).toBe(1);
    expect(preview.records.candidates[0].students[0]).toMatchObject({
      studentId: null,
      studentLegacyId: 'missing-student',
      studentName: '과거 학생',
    });
  });

  it('excludes invalid child entries and keeps valid siblings', () => {
    const mixedRecord = {
      ...record,
      students: [{ attendance: 'present' }, record.students[0]],
    };
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [mixedRecord] }));

    expect(preview.records.valid).toBe(1);
    expect(preview.records.excludedChildEntries).toBe(1);
    expect(preview.records.candidates[0].students).toHaveLength(1);
  });

  it('removes non-string skill payloads', () => {
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [record] }));

    expect(preview.records.candidates[0].students[0].skills).toEqual(['협응력', '균형']);
  });

  it('rejects unsupported attendance values', () => {
    const badRecord = {
      ...record,
      students: [{ ...record.students[0], attendance: 'late' }],
    };
    const preview = parseLegacyOperationalStore(store({ students: [student], classRecords: [badRecord] }));

    expect(preview.records.valid).toBe(0);
    expect(preview.records.invalid).toBe(1);
    expect(preview.records.excludedChildEntries).toBe(1);
  });

  it('keeps quick and detailed record types', () => {
    const preview = parseLegacyOperationalStore(
      store({
        students: [student],
        classRecords: [
          { ...record, id: 'record-quick', recordType: 'quick' },
          { ...record, id: 'record-detailed', recordType: 'detailed' },
        ],
      }),
    );

    expect(preview.records.candidates.map((candidate) => candidate.recordType)).toEqual(['quick', 'detailed']);
  });

  it('defaults missing recordType to detailed with a warning', () => {
    const { recordType, ...recordWithoutType } = record;
    expect(recordType).toBe('detailed');

    const preview = parseLegacyOperationalStore(
      store({ students: [student], classRecords: [recordWithoutType] }),
    );

    expect(preview.records.valid).toBe(1);
    expect(preview.records.candidates[0].recordType).toBe('detailed');
    expect(preview.records.recordTypeDefaulted).toBe(1);
    expect(preview.records.issues.some((issue) => issue.reason.includes('detailed'))).toBe(true);
  });

  it('rejects unsupported record types', () => {
    const preview = parseLegacyOperationalStore(
      store({ students: [student], classRecords: [{ ...record, recordType: 'legacy' }] }),
    );

    expect(preview.records.valid).toBe(0);
    expect(preview.records.issues[0].reason).toContain('유형');
  });

  it('keeps backup JSON raw content unchanged', () => {
    const raw = store({ students: [student], classRecords: [record] });
    const preview = parseLegacyOperationalStore(raw);
    const backup = JSON.parse(buildLegacyOperationalBackupJson(preview)) as { raw: string };

    expect(backup.raw).toBe(raw);
  });

  it('uses a verified archive before the active persist fallback', () => {
    const archive = {
      archiveVersion: 1,
      sourceKey: LEGACY_OPERATIONAL_SOURCE_KEY,
      sourceStoreVersion: 11,
      capturedAt: '2026-06-17T00:00:00.000Z',
      students: [student],
      classRecords: [record],
    };
    const storage = {
      getItem: vi.fn((key: string) => {
        if (key === LEGACY_OPERATIONAL_ARCHIVE_KEY) return JSON.stringify(archive);
        if (key === LEGACY_OPERATIONAL_SOURCE_KEY) return store({ students: [], classRecords: [] });
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;

    const preview = readLegacyOperationalPreview(storage);

    expect(preview.source).toBe('legacy-archive');
    expect(preview.archiveReady).toBe(true);
    expect(preview.students.valid).toBe(1);
    expect(preview.records.valid).toBe(1);
    expect((storage as unknown as { setItem: ReturnType<typeof vi.fn> }).setItem).not.toHaveBeenCalled();
  });

  it('falls back to active persist when no archive exists yet', () => {
    const values = new Map<string, string>();
    values.set(LEGACY_OPERATIONAL_SOURCE_KEY, store({ students: [student], classRecords: [record] }));
    const storage = {
      getItem: vi.fn((key: string) => {
        return values.get(key) ?? null;
      }),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: vi.fn(),
    } as unknown as Storage;

    const preview = readLegacyOperationalPreview(storage);

    expect(preview.source).toBe('legacy-archive');
    expect(preview.archiveReady).toBe(true);
    expect((storage as unknown as { setItem: ReturnType<typeof vi.fn> }).setItem).toHaveBeenCalledWith(
      LEGACY_OPERATIONAL_ARCHIVE_KEY,
      expect.any(String),
    );
  });

  it('uses archive content for backup JSON when available', () => {
    const archive = {
      archiveVersion: 1 as const,
      sourceKey: LEGACY_OPERATIONAL_SOURCE_KEY,
      sourceStoreVersion: 11,
      capturedAt: '2026-06-17T00:00:00.000Z',
      students: [student],
      classRecords: [record],
    };
    const preview = parseLegacyOperationalStore(
      store({ students: archive.students, classRecords: archive.classRecords }),
      'legacy-archive',
      archive,
    );
    const backup = JSON.parse(buildLegacyOperationalBackupJson(preview)) as { archive: unknown; raw?: string };

    expect(backup.archive).toEqual(archive);
    expect(backup.raw).toBeUndefined();
  });
});
