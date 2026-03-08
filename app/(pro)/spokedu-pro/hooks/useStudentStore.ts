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

export const CLASS_GROUPS = ['유치부 인지반', '초등 기초반', '초등 심화반', '중등반'];

// ── localStorage (offline cache) ───────────────────────────────────────────
const LS_STUDENTS = 'spokedu-pro:students:v2';
const LS_ATTENDANCE = (date: string) => `spokedu-pro:attendance:${date}`;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function lsGetStudents(): Omit<Student, 'status'>[] {
  try {
    const raw = localStorage.getItem(LS_STUDENTS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function lsSaveStudents(students: Omit<Student, 'status'>[]): void {
  try { localStorage.setItem(LS_STUDENTS, JSON.stringify(students)); } catch { /* ignore */ }
}

function lsGetAttendance(date: string): Record<string, AttendanceStatus> {
  try {
    const raw = localStorage.getItem(LS_ATTENDANCE(date));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function lsSaveAttendance(date: string, records: Record<string, AttendanceStatus>): void {
  try { localStorage.setItem(LS_ATTENDANCE(date), JSON.stringify(records)); } catch { /* ignore */ }
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

  // 기본값: localStorage 즉시 로드 (API 응답 대기 중 빈 화면 방지)
  const [rawStudents, setRawStudents] = useState<Omit<Student, 'status'>[]>(() => lsGetStudents());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => lsGetAttendance(today));
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 최신 attendance를 ref로 유지 (비동기 콜백 내 클로저 문제 방지)
  const attendanceRef = useRef(attendance);
  attendanceRef.current = attendance;

  // ── 초기 로드: API에서 최신 데이터 가져오기 ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        const [students, att] = await Promise.all([
          apiFetchStudents(),
          apiFetchAttendance(today),
        ]);
        if (cancelled) return;
        setRawStudents(students);
        setAttendance(att);
        lsSaveStudents(students);
        lsSaveAttendance(today, att);
        setSyncError(null);
      } catch (err) {
        if (cancelled) return;
        // API 실패 → localStorage 유지 (이미 초기값으로 설정됨)
        setSyncError(err instanceof Error ? err.message : 'sync failed');
      } finally {
        if (!cancelled) { setSyncing(false); setLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const students: Student[] = mergeStudentsWithAttendance(rawStudents, attendance);

  // ── Mutations ─────────────────────────────────────────────────────────
  const addStudent = useCallback(async (name: string, classGroup: string): Promise<void> => {
    // Optimistic
    const tempId = crypto.randomUUID();
    const tempStudent: Omit<Student, 'status'> = {
      id: tempId, name: name.trim(), classGroup, physical: { ...DEFAULT_PHYSICAL },
    };
    setRawStudents((prev) => {
      const next = [...prev, tempStudent];
      lsSaveStudents(next);
      return next;
    });

    try {
      const created = await apiAddStudent(name, classGroup);
      setRawStudents((prev) => {
        const next = prev.map((s) => s.id === tempId ? created : s);
        lsSaveStudents(next);
        return next;
      });
    } catch {
      // Rollback
      setRawStudents((prev) => {
        const next = prev.filter((s) => s.id !== tempId);
        lsSaveStudents(next);
        return next;
      });
    }
  }, []);

  const removeStudent = useCallback(async (id: string): Promise<void> => {
    setRawStudents((prev) => {
      const next = prev.filter((s) => s.id !== id);
      lsSaveStudents(next);
      return next;
    });
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
      lsSaveAttendance(today, next);
      // Persist to API (fire & forget)
      apiSaveAttendance(today, next).catch(() => { /* ignore */ });
      return next;
    });
  }, [today]);

  const markAllPresent = useCallback((ids: string[]): void => {
    setAttendance((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = 'present'; });
      lsSaveAttendance(today, next);
      apiSaveAttendance(today, next).catch(() => { /* ignore */ });
      return next;
    });
  }, [today]);

  const updatePhysical = useCallback(async (id: string, key: keyof PhysicalFunctions, value: PhysicalLevel): Promise<void> => {
    setRawStudents((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, physical: { ...s.physical, [key]: value } } : s
      );
      lsSaveStudents(next);
      return next;
    });
    // Persist to API
    await apiUpdatePhysical(id, { [key]: value }).catch(() => { /* best-effort */ });
  }, []);

  const presentStudents = students.filter((s) => s.status === 'present');

  return {
    students,
    loaded,
    syncing,
    syncError,
    addStudent,
    removeStudent,
    cycleStatus,
    markAllPresent,
    updatePhysical,
    presentStudents,
  };
}
