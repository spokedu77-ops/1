'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type PhysicalLevel = 1 | 2 | 3; // 1=낮음, 2=중간, 3=높음
export type PhysicalFunctions = {
  coordination: PhysicalLevel;
  agility: PhysicalLevel;
  endurance: PhysicalLevel;
  balance: PhysicalLevel;
  strength: PhysicalLevel;
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type Student = {
  id: string;
  name: string;
  classGroup: string;
  status: AttendanceStatus;
  physical: PhysicalFunctions;
  note?: string;
};

export const PHYSICAL_LABELS: Record<keyof PhysicalFunctions, string> = {
  coordination: '협응력',
  agility: '순발력',
  endurance: '지구력',
  balance: '균형감',
  strength: '근력',
};

export const LEVEL_LABELS: Record<PhysicalLevel, string> = {
  1: '낮음',
  2: '중간',
  3: '높음',
};

/** @deprecated 반 목록은 useClassStore의 동적 데이터로 관리합니다. */
export const CLASS_GROUPS: string[] = [];

const LEGACY_STUDENT_KEYS = ['spokedu-pro:students:v2', 'spokedu-pro:students:v1', 'spokedu-pro:students'];
const ATTENDANCE_MIGRATED_KEY = 'spokedu-pro:attendance:migrated';
const UNASSIGNED_CLASS = '미분류';

const DEFAULT_PHYSICAL: PhysicalFunctions = {
  coordination: 2,
  agility: 2,
  endurance: 2,
  balance: 2,
  strength: 2,
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeClassGroup(value?: string | null): string {
  if (!value) return UNASSIGNED_CLASS;
  if (value === '誘몃텇瑜?' || value.includes('誘몃텇')) return UNASSIGNED_CLASS;
  return value;
}

async function migrateStudentsFromLS(): Promise<void> {
  let toMigrate: Omit<Student, 'status'>[] = [];
  for (const key of LEGACY_STUDENT_KEYS) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        toMigrate = parsed;
        break;
      }
    } catch {
      /* ignore malformed legacy data */
    }
  }
  if (toMigrate.length === 0) return;

  let allOk = true;
  for (const student of toMigrate) {
    try {
      const res = await fetch('/api/spokedu-pro/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: student.name?.trim() || '이름 없음',
          classGroup: normalizeClassGroup(student.classGroup),
          physical: student.physical,
          note: student.note,
        }),
      });
      if (!res.ok) allOk = false;
    } catch {
      allOk = false;
    }
  }
  if (!allOk) return;

  for (const key of LEGACY_STUDENT_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

async function migrateAttendanceFromLS(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(ATTENDANCE_MIGRATED_KEY) === '1') return;
  } catch {
    return;
  }

  const prefix = 'spokedu-pro:attendance:';
  const keysToMigrate: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix) && key !== ATTENDANCE_MIGRATED_KEY) keysToMigrate.push(key);
  }

  let allOk = true;
  for (const key of keysToMigrate) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const records = JSON.parse(raw) as Record<string, AttendanceStatus>;
      const date = key.slice(prefix.length);
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const res = await fetch('/api/spokedu-pro/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records }),
      });
      if (res.ok) {
        localStorage.removeItem(key);
      } else {
        allOk = false;
      }
    } catch {
      allOk = false;
    }
  }
  if (!allOk) return;

  try {
    localStorage.setItem(ATTENDANCE_MIGRATED_KEY, '1');
  } catch {
    /* ignore */
  }
}

async function apiFetchStudents(): Promise<Omit<Student, 'status'>[]> {
  const res = await fetch('/api/spokedu-pro/students');
  if (!res.ok) throw new Error('students fetch failed');
  const data = await res.json();
  return (data.students ?? []) as Omit<Student, 'status'>[];
}

async function apiFetchAttendance(date: string): Promise<Record<string, AttendanceStatus>> {
  const res = await fetch(`/api/spokedu-pro/attendance?date=${date}`);
  if (!res.ok) throw new Error('attendance fetch failed');
  const data = await res.json();
  return data.records ?? {};
}

async function apiAddStudent(name: string, classGroup: string): Promise<Omit<Student, 'status'>> {
  const res = await fetch('/api/spokedu-pro/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, classGroup: normalizeClassGroup(classGroup) }),
  });
  if (!res.ok) throw new Error('add student failed');
  const data = await res.json();
  return data.student;
}

async function apiRemoveStudent(id: string): Promise<void> {
  const res = await fetch(`/api/spokedu-pro/students/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('remove student failed');
}

async function apiUpdatePhysical(id: string, physical: Partial<PhysicalFunctions>): Promise<void> {
  const res = await fetch(`/api/spokedu-pro/students/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ physical }),
  });
  if (!res.ok) throw new Error('update physical failed');
}

async function apiSaveAttendance(date: string, records: Record<string, AttendanceStatus>): Promise<void> {
  const res = await fetch('/api/spokedu-pro/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, records }),
  });
  if (!res.ok) throw new Error('save attendance failed');
}

function physicalScore(physical: PhysicalFunctions): number {
  return physical.coordination + physical.agility + physical.endurance + physical.balance + physical.strength;
}

function mergeStudentsWithAttendance(
  students: Omit<Student, 'status'>[],
  attendance: Record<string, AttendanceStatus>
): Student[] {
  return students.map((student) => ({
    ...student,
    classGroup: normalizeClassGroup(student.classGroup),
    status: attendance[student.id] ?? 'present',
  }));
}

export function balanceTeams(students: Student[]): { teamA: Student[]; teamB: Student[] } {
  const sorted = [...students].sort((a, b) => physicalScore(b.physical) - physicalScore(a.physical));
  const teamA: Student[] = [];
  const teamB: Student[] = [];
  sorted.forEach((student, index) => {
    if (index % 2 === 0) teamA.push(student);
    else teamB.push(student);
  });
  return { teamA, teamB };
}

export function useStudentStore() {
  const today = todayISO();

  const [rawStudents, setRawStudents] = useState<Omit<Student, 'status'>[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const attendanceRef = useRef(attendance);
  attendanceRef.current = attendance;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        await migrateStudentsFromLS();
        await migrateAttendanceFromLS();
        if (cancelled) return;
        const [students, attendanceRecords] = await Promise.all([
          apiFetchStudents(),
          apiFetchAttendance(today),
        ]);
        if (cancelled) return;
        setRawStudents(students);
        setAttendance(attendanceRecords);
        setSyncError(null);
      } catch (err) {
        if (!cancelled) setSyncError(err instanceof Error ? err.message : 'sync failed');
      } finally {
        if (!cancelled) {
          setSyncing(false);
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  const students: Student[] = mergeStudentsWithAttendance(rawStudents, attendance);

  const addStudent = useCallback(async (name: string, classGroup: string): Promise<void> => {
    const tempId = crypto.randomUUID();
    const tempStudent: Omit<Student, 'status'> = {
      id: tempId,
      name: name.trim(),
      classGroup: normalizeClassGroup(classGroup),
      physical: { ...DEFAULT_PHYSICAL },
    };
    setRawStudents((prev) => [...prev, tempStudent]);

    try {
      const created = await apiAddStudent(name, classGroup);
      setRawStudents((prev) => prev.map((student) => (student.id === tempId ? created : student)));
    } catch {
      setRawStudents((prev) => prev.filter((student) => student.id !== tempId));
    }
  }, []);

  const removeStudent = useCallback(async (id: string): Promise<void> => {
    setRawStudents((prev) => prev.filter((student) => student.id !== id));
    try {
      await apiRemoveStudent(id);
    } catch {
      // Best-effort; the student is removed from the local view.
    }
  }, []);

  const cycleStatus = useCallback((id: string): void => {
    const order: AttendanceStatus[] = ['present', 'absent', 'late'];
    setAttendance((prev) => {
      const current = prev[id] ?? 'present';
      const next = { ...prev, [id]: order[(order.indexOf(current) + 1) % order.length] };
      apiSaveAttendance(today, next)
        .then(() => {
          try {
            window.dispatchEvent(new Event('spokedu-pro-attendance-updated'));
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          /* ignore */
        });
      return next;
    });
  }, [today]);

  const setAttendanceStatus = useCallback((id: string, status: AttendanceStatus): void => {
    setAttendance((prev) => {
      const next = { ...prev, [id]: status };
      apiSaveAttendance(today, next)
        .then(() => {
          try {
            window.dispatchEvent(new Event('spokedu-pro-attendance-updated'));
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          /* ignore */
        });
      return next;
    });
  }, [today]);

  const markAllPresent = useCallback((ids: string[]): void => {
    setAttendance((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = 'present';
      });
      apiSaveAttendance(today, next)
        .then(() => {
          try {
            window.dispatchEvent(new Event('spokedu-pro-attendance-updated'));
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          /* ignore */
        });
      return next;
    });
  }, [today]);

  const updatePhysical = useCallback(async (id: string, key: keyof PhysicalFunctions, value: PhysicalLevel): Promise<void> => {
    setRawStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, physical: { ...student.physical, [key]: value } } : student
      )
    );
    await apiUpdatePhysical(id, { [key]: value }).catch(() => {
      /* best-effort */
    });
  }, []);

  const presentStudents = students.filter((student) => student.status === 'present');

  const refetch = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const [list, attendanceRecords] = await Promise.all([
        apiFetchStudents(),
        apiFetchAttendance(today),
      ]);
      setRawStudents(list);
      setAttendance(attendanceRecords);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'sync failed');
    } finally {
      setSyncing(false);
    }
  }, [today]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const onRemoteAttendance = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        refetch();
      }, 250);
    };
    window.addEventListener('spokedu-pro-attendance-updated', onRemoteAttendance);
    return () => {
      window.removeEventListener('spokedu-pro-attendance-updated', onRemoteAttendance);
      if (timeout) clearTimeout(timeout);
    };
  }, [refetch]);

  return {
    students,
    loaded,
    syncing,
    syncError,
    refetch,
    addStudent,
    removeStudent,
    cycleStatus,
    setAttendanceStatus,
    markAllPresent,
    updatePhysical,
    presentStudents,
  };
}
