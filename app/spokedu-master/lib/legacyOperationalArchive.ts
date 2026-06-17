export const LEGACY_OPERATIONAL_ARCHIVE_KEY = 'spokedu-master-operational-legacy-v1';
export const LEGACY_OPERATIONAL_SOURCE_KEY = 'spokedu-master-store';

export type LegacyOperationalArchive = {
  archiveVersion: 1;
  sourceKey: typeof LEGACY_OPERATIONAL_SOURCE_KEY;
  sourceStoreVersion: number | null;
  capturedAt: string;
  students: unknown[];
  classRecords: unknown[];
};

export type LegacyOperationalArchiveResult =
  | {
      archive: LegacyOperationalArchive | null;
      created: boolean;
      ok: true;
      reason?: undefined;
      sourceHasOperationalData: boolean;
    }
  | {
      archive: null;
      created: false;
      ok: false;
      reason: string;
      sourceHasOperationalData: boolean;
    };

export type LegacyOperationalArchiveRemovalResult =
  | {
      ok: true;
      removed: true;
      reason?: undefined;
    }
  | {
      ok: false;
      removed: false;
      reason: string;
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function isLegacyOperationalArchive(value: unknown): value is LegacyOperationalArchive {
  return (
    isPlainObject(value)
    && value.archiveVersion === 1
    && value.sourceKey === LEGACY_OPERATIONAL_SOURCE_KEY
    && (typeof value.sourceStoreVersion === 'number' || value.sourceStoreVersion === null)
    && typeof value.capturedAt === 'string'
    && Array.isArray(value.students)
    && Array.isArray(value.classRecords)
  );
}

export function readLegacyOperationalArchive(storage: Storage | null = getBrowserStorage()): LegacyOperationalArchive | null {
  if (!storage) return null;
  const raw = storage.getItem(LEGACY_OPERATIONAL_ARCHIVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isLegacyOperationalArchive(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function hasInvalidArchive(storage: Storage): boolean {
  const raw = storage.getItem(LEGACY_OPERATIONAL_ARCHIVE_KEY);
  if (!raw) return false;
  try {
    return !isLegacyOperationalArchive(JSON.parse(raw) as unknown);
  } catch {
    return true;
  }
}

function createArchiveFromState(
  persistedState: unknown,
  sourceStoreVersion: number | null,
  capturedAt = new Date().toISOString(),
): LegacyOperationalArchiveResult {
  if (!isPlainObject(persistedState)) {
    return {
      archive: null,
      created: false,
      ok: false,
      reason: 'Zustand persist state 구조가 아닙니다.',
      sourceHasOperationalData: false,
    };
  }

  const students = persistedState.students;
  const classRecords = persistedState.classRecords;
  const hasStudents = Array.isArray(students) && students.length > 0;
  const hasClassRecords = Array.isArray(classRecords) && classRecords.length > 0;
  if (!hasStudents && !hasClassRecords) {
    return {
      archive: null,
      created: false,
      ok: true,
      sourceHasOperationalData: false,
    };
  }

  if (!Array.isArray(students) || !Array.isArray(classRecords)) {
    return {
      archive: null,
      created: false,
      ok: false,
      reason: 'students/classRecords 원본 배열을 확인할 수 없습니다.',
      sourceHasOperationalData: true,
    };
  }

  return {
    archive: {
      archiveVersion: 1,
      sourceKey: LEGACY_OPERATIONAL_SOURCE_KEY,
      sourceStoreVersion,
      capturedAt,
      students,
      classRecords,
    },
    created: false,
    ok: true,
    sourceHasOperationalData: true,
  };
}

export function createLegacyOperationalArchiveFromPersistedStore(
  persistedState: unknown,
  sourceStoreVersion: number | null,
  storage: Storage | null = getBrowserStorage(),
): LegacyOperationalArchiveResult {
  if (!storage) {
    return {
      archive: null,
      created: false,
      ok: true,
      sourceHasOperationalData: false,
    };
  }

  const existing = readLegacyOperationalArchive(storage);
  if (existing) {
    return {
      archive: existing,
      created: false,
      ok: true,
      sourceHasOperationalData: true,
    };
  }
  if (hasInvalidArchive(storage)) {
    return {
      archive: null,
      created: false,
      ok: false,
      reason: '기존 archive 구조가 유효하지 않아 덮어쓰지 않았습니다.',
      sourceHasOperationalData: true,
    };
  }

  const result = createArchiveFromState(persistedState, sourceStoreVersion);
  if (!result.ok || !result.archive) return result;

  try {
    const serialized = JSON.stringify(result.archive);
    storage.setItem(LEGACY_OPERATIONAL_ARCHIVE_KEY, serialized);
    const reread = readLegacyOperationalArchive(storage);
    if (
      !reread
      || reread.sourceStoreVersion !== result.archive.sourceStoreVersion
      || reread.students.length !== result.archive.students.length
      || reread.classRecords.length !== result.archive.classRecords.length
      || JSON.stringify(reread.students) !== JSON.stringify(result.archive.students)
      || JSON.stringify(reread.classRecords) !== JSON.stringify(result.archive.classRecords)
    ) {
      return {
        archive: null,
        created: false,
        ok: false,
        reason: 'archive 저장 후 동일성 검증에 실패했습니다.',
        sourceHasOperationalData: true,
      };
    }

    return {
      archive: reread,
      created: true,
      ok: true,
      sourceHasOperationalData: true,
    };
  } catch (caught) {
    return {
      archive: null,
      created: false,
      ok: false,
      reason: caught instanceof Error ? caught.message : 'archive 저장에 실패했습니다.',
      sourceHasOperationalData: true,
    };
  }
}

export function ensureLegacyOperationalArchive(storage: Storage | null = getBrowserStorage()): LegacyOperationalArchiveResult {
  if (!storage) {
    return {
      archive: null,
      created: false,
      ok: true,
      sourceHasOperationalData: false,
    };
  }

  const existing = readLegacyOperationalArchive(storage);
  if (existing) {
    return {
      archive: existing,
      created: false,
      ok: true,
      sourceHasOperationalData: true,
    };
  }
  if (hasInvalidArchive(storage)) {
    return {
      archive: null,
      created: false,
      ok: false,
      reason: '기존 archive 구조가 유효하지 않아 덮어쓰지 않았습니다.',
      sourceHasOperationalData: true,
    };
  }

  const raw = storage.getItem(LEGACY_OPERATIONAL_SOURCE_KEY);
  if (!raw) {
    return {
      archive: null,
      created: false,
      ok: true,
      sourceHasOperationalData: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed) || !isPlainObject(parsed.state)) {
      return {
        archive: null,
        created: false,
        ok: false,
        reason: 'Zustand persist state 구조가 아닙니다.',
        sourceHasOperationalData: true,
      };
    }
    const sourceStoreVersion = typeof parsed.version === 'number' ? parsed.version : null;
    return createLegacyOperationalArchiveFromPersistedStore(parsed.state, sourceStoreVersion, storage);
  } catch (caught) {
    return {
      archive: null,
      created: false,
      ok: false,
      reason: caught instanceof Error ? caught.message : 'active persist JSON을 읽을 수 없습니다.',
      sourceHasOperationalData: true,
    };
  }
}

export function removeLegacyOperationalArchive(
  storage: Storage | null = getBrowserStorage(),
): LegacyOperationalArchiveRemovalResult {
  if (!storage) {
    return {
      ok: false,
      removed: false,
      reason: '브라우저 저장소를 사용할 수 없습니다.',
    };
  }

  const existing = readLegacyOperationalArchive(storage);
  if (!existing) {
    return {
      ok: false,
      removed: false,
      reason: '삭제할 유효한 이전 데이터 archive가 없습니다.',
    };
  }

  storage.removeItem(LEGACY_OPERATIONAL_ARCHIVE_KEY);
  if (storage.getItem(LEGACY_OPERATIONAL_ARCHIVE_KEY) !== null) {
    return {
      ok: false,
      removed: false,
      reason: 'archive 삭제 후 검증에 실패했습니다.',
    };
  }

  return {
    ok: true,
    removed: true,
  };
}
