'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type PhysicalLevel = 1 | 2 | 3; // 1=하, 2=중, 3=상

export type PhysicalFunctions = {
  coordination: PhysicalLevel; // 협응력
  agility: PhysicalLevel;      // 순발력
  endurance: PhysicalLevel;    // 지구력
  balance: PhysicalLevel;      // 균형감
  strength: PhysicalLevel;     // 근력
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type Student = {
  id: string;
  name: string;
  classGroup: string;
  status: AttendanceStatus; // 오늘 출결 (런타임)
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
  1: '하',
  2: '중',
  3: '상',
};

/** @deprecated CLASS_GROUPS는 고정 상수에서 동적 반 목록(useClassStore)으로 교체됨. */
export const CLASS_GROUPS: string[] = [];

// ── Legacy keys for one-time migration (LS → API) ─────────────────────────
const LEGACY_STUDENT_KEYS = ['spokedu-pro:students:v2', 'spokedu-pro:students:v1', 'spokedu-pro:students'];
const ATTENDANCE_MIGRATED_KEY = 'spokedu-pro:attendance:migrated';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 첫 로그인 시 localStorage에 있던 학생 데이터를 API로 올리고, 전부 성공 시에만 LS 삭제 (유실 방지) */
async function migrateStudentsFromLS(): Promise<void> {
  let toMigrate: Omit<Student, 'status'>[] = [];
  for (const key of LEGACY_STUDENT_KEYS) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          toMigrate = parsed;
          break;
        }
      }
    } catch { /* ignore */ }
  }
  if (toMigrate.length === 0) return;

  let allOk = true;
  for (const s of toMigrate) {
    try {
      const res = await fetch('/api/spokedu-pro/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: s.name?.trim() || '이름없음',
          classGroup: s.classGroup ?? '미분류',
          physical: s.physical,
          note: s.note,
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
    } catch { /* ignore */ }
  }
}

/** localStorage에 있는 출결 키들을 API로 올리고, 성공한 항목만 LS 삭제·전부 성공 시에만 migrated 플래그 (유실 방지) */
async function migrateAttendanceFromLS(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(ATTENDANCE_MIGRATED_KEY) === '1') return;
  } catch {
    return;
  }

  const prefix = 'spokedu-pro:attendance:';
  const keysToMigrate: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
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
  } catch { /* ignore */ }
}

// ── API helpers ────────────────────────────────────────────────────────────
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
    body: JSON.stringify({ name, classGroup }),
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

// ── Helpers ───────────────────────────────────────────────────────────────
const DEFAULT_PHYSICAL: PhysicalFunctions = {
  coordination: 2, agility: 2, endurance: 2, balance: 2, strength: 2,
};

function physicalScore(p: PhysicalFunctions): number {
  return p.coordination + p.agility + p.endurance + p.balance + p.strength;
}

function mergeStudentsWithAttendance(
  students: Omit<Student, 'status'>[],
  attendance: Record<string, AttendanceStatus>
): Student[] {
  return students.map((s) => ({ ...s, status: attendance[s.id] ?? 'present' }));
}

/** 신체 기능 기반 균형 팀 배분 (그리디 교차 배분) */
export function balanceTeams(students: Student[]): { teamA: Student[]; teamB: Student[] } {
  const sorted = [...students].sort((a, b) => physicalScore(b.physical) - physicalScore(a.physical));
  const teamA: Student[] = [];
  const teamB: Student[] = [];
  sorted.forEach((s, i) => { if (i % 2 === 0) teamA.push(s); else teamB.push(s); });
  return { teamA, teamB };
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useStudentStore() {
  const today = todayISO();

  const [rawStudents, setRawStudents] = useState<Omit<Student, 'status'>[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const attendanceRef = useRef(attendance);
  attendanceRef.current = attendance;

  // ── 초기 로드: 마이그레이션(1회) 후 API에서만 로드 ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        await migrateStudentsFromLS();
        await migrateAttendanceFromLS();
        if (cancelled) return;
        const [students, att] = await Promise.all([
          apiFetchStudents(),
          apiFetchAttendance(today),
        ]);
        if (cancelled) return;
        setRawStudents(students);
        setAttendance(att);
        setSyncError(null);
      } catch (err) {
        if (cancelled) return;
        setSyncError(err instanceof Error ? err.message : 'sync failed');
      } finally {
        if (!cancelled) { setSyncing(false); setLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [today]);

  const students: Student[] = mergeStudentsWithAttendance(rawStudents, attendance);

  // ── Mutations ─────────────────────────────────────────────────────────
  const addStudent = useCallback(async (name: string, classGroup: string): Promise<void> => {
    const tempId = crypto.randomUUID();
    const tempStudent: Omit<Student, 'status'> = {
      id: tempId, name: name.trim(), classGroup, physical: { ...DEFAULT_PHYSICAL },
    };
    setRawStudents((prev) => [...prev, tempStudent]);

    try {
      const created = await apiAddStudent(name, classGroup);
      setRawStudents((prev) => prev.map((s) => s.id === tempId ? created : s));
    } catch {
      setRawStudents((prev) => prev.filter((s) => s.id !== tempId));
    }
  }, []);

  const removeStudent = useCallback(async (id: string): Promise<void> => {
    setRawStudents((prev) => prev.filter((s) => s.id !== id));
    try {
      await apiRemoveStudent(id);
    } catch {
      // Best-effort; student removed from local view
    }
  }, []);

  const cycleStatus = useCallback((id: string): void => {
    const order: AttendanceStatus[] = ['present', 'absent', 'late'];
    setAttendance((prev) => {
      const current = prev[id] ?? 'present';
      const next = { ...prev, [id]: order[(order.indexOf(current) + 1) % order.length] };
      apiSaveAttendance(today, next).catch(() => { /* ignore */ });
      return next;
    });
  }, [today]);

  const markAllPresent = useCallback((ids: string[]): void => {
    setAttendance((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = 'present'; });
      apiSaveAttendance(today, next).catch(() => { /* ignore */ });
      return next;
    });
  }, [today]);

  const updatePhysical = useCallback(async (id: string, key: keyof PhysicalFunctions, value: PhysicalLevel): Promise<void> => {
    setRawStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, physical: { ...s.physical, [key]: value } } : s
      )
    );
    await apiUpdatePhysical(id, { [key]: value }).catch(() => { /* best-effort */ });
  }, []);

  const presentStudents = students.filter((s) => s.status === 'present');

  const refetch = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const [list, att] = await Promise.all([
        apiFetchStudents(),
        apiFetchAttendance(today),
      ]);
      setRawStudents(list);
      setAttendance(att);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'sync failed');
    } finally {
      setSyncing(false);
    }
  }, [today]);

  return {
    students,
    loaded,
    syncing,
    syncError,
    refetch,
    addStudent,
    removeStudent,
    cycleStatus,
    markAllPresent,
    updatePhysical,
    presentStudents,
  };
}
