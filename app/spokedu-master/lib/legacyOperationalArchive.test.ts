import { describe, expect, it, vi } from 'vitest';
import {
  createLegacyOperationalArchiveFromPersistedStore,
  ensureLegacyOperationalArchive,
  LEGACY_OPERATIONAL_ARCHIVE_KEY,
  LEGACY_OPERATIONAL_SOURCE_KEY,
  readLegacyOperationalArchive,
  removeLegacyOperationalArchive,
} from './legacyOperationalArchive';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const legacyStudent = {
  id: 'student-1',
  name: '학생 1',
  meta: '만 8세 / 수강 6개월',
  level: 'legacy-level',
  attendance: 90,
  skills: [{ label: '균형', value: 44, delta: '+3%' }],
};

const legacyRecord = {
  id: 'record-1',
  date: '2026-06-17',
  students: [{ studentId: 'student-1', studentName: '학생 1', attendance: 'present' }],
};

describe('legacy operational archive', () => {
  it('copies raw students and classRecords from active persist when archive is missing', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_OPERATIONAL_SOURCE_KEY,
      JSON.stringify({ state: { students: [legacyStudent], classRecords: [legacyRecord] }, version: 11 }),
    );

    const result = ensureLegacyOperationalArchive(storage);

    expect(result.ok).toBe(true);
    expect(result.created).toBe(true);
    expect(result.archive?.students).toEqual([legacyStudent]);
    expect(result.archive?.classRecords).toEqual([legacyRecord]);
    expect(readLegacyOperationalArchive(storage)?.sourceStoreVersion).toBe(11);
    expect(storage.getItem(LEGACY_OPERATIONAL_SOURCE_KEY)).toContain('legacy-level');
  });

  it('does not overwrite an existing archive', () => {
    const storage = new MemoryStorage();
    const existing = {
      archiveVersion: 1,
      sourceKey: LEGACY_OPERATIONAL_SOURCE_KEY,
      sourceStoreVersion: 10,
      capturedAt: '2026-06-16T00:00:00.000Z',
      students: [{ id: 'kept' }],
      classRecords: [],
    };
    storage.setItem(LEGACY_OPERATIONAL_ARCHIVE_KEY, JSON.stringify(existing));
    storage.setItem(
      LEGACY_OPERATIONAL_SOURCE_KEY,
      JSON.stringify({ state: { students: [legacyStudent], classRecords: [legacyRecord] }, version: 11 }),
    );

    const result = ensureLegacyOperationalArchive(storage);

    expect(result.ok).toBe(true);
    expect(result.created).toBe(false);
    expect(result.archive?.students).toEqual([{ id: 'kept' }]);
  });

  it('does not overwrite a broken existing archive', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_OPERATIONAL_ARCHIVE_KEY, '{broken');
    storage.setItem(
      LEGACY_OPERATIONAL_SOURCE_KEY,
      JSON.stringify({ state: { students: [legacyStudent], classRecords: [legacyRecord] }, version: 11 }),
    );

    const result = ensureLegacyOperationalArchive(storage);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('덮어쓰지 않았습니다');
    expect(storage.getItem(LEGACY_OPERATIONAL_ARCHIVE_KEY)).toBe('{broken');
  });

  it('does not create an archive when both operational arrays are empty', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_OPERATIONAL_SOURCE_KEY,
      JSON.stringify({ state: { students: [], classRecords: [] }, version: 11 }),
    );

    const result = ensureLegacyOperationalArchive(storage);

    expect(result.ok).toBe(true);
    expect(result.sourceHasOperationalData).toBe(false);
    expect(storage.getItem(LEGACY_OPERATIONAL_ARCHIVE_KEY)).toBeNull();
  });

  it('reports archive storage verification failures', () => {
    const storage = new MemoryStorage();
    const setItem = vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
      if (key === LEGACY_OPERATIONAL_ARCHIVE_KEY) {
        MemoryStorage.prototype.setItem.call(storage, key, value.replace('student-1', 'changed'));
        return;
      }
      MemoryStorage.prototype.setItem.call(storage, key, value);
    });

    const result = createLegacyOperationalArchiveFromPersistedStore(
      { students: [legacyStudent], classRecords: [legacyRecord] },
      11,
      storage,
    );

    expect(setItem).toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('동일성');
  });

  it('removes only the verified archive key', () => {
    const storage = new MemoryStorage();
    const archive = {
      archiveVersion: 1,
      sourceKey: LEGACY_OPERATIONAL_SOURCE_KEY,
      sourceStoreVersion: 12,
      capturedAt: '2026-06-17T00:00:00.000Z',
      students: [legacyStudent],
      classRecords: [legacyRecord],
    };
    storage.setItem(LEGACY_OPERATIONAL_ARCHIVE_KEY, JSON.stringify(archive));
    storage.setItem(
      LEGACY_OPERATIONAL_SOURCE_KEY,
      JSON.stringify({ state: { other: true }, version: 12 }),
    );

    const result = removeLegacyOperationalArchive(storage);

    expect(result.ok).toBe(true);
    expect(storage.getItem(LEGACY_OPERATIONAL_ARCHIVE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_OPERATIONAL_SOURCE_KEY)).toContain('"other":true');
  });

  it('does not remove anything when no valid archive exists', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_OPERATIONAL_ARCHIVE_KEY, '{broken');
    storage.setItem(LEGACY_OPERATIONAL_SOURCE_KEY, 'kept');

    const result = removeLegacyOperationalArchive(storage);

    expect(result.ok).toBe(false);
    expect(storage.getItem(LEGACY_OPERATIONAL_ARCHIVE_KEY)).toBe('{broken');
    expect(storage.getItem(LEGACY_OPERATIONAL_SOURCE_KEY)).toBe('kept');
  });
});
