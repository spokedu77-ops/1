'use client';

import { useState, useCallback, useEffect } from 'react';

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
  status: AttendanceStatus;
  physical: PhysicalFunctions;
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

const STORAGE_KEY = 'spokedu-pro:students';
const DEFAULT_PHYSICAL: PhysicalFunctions = {
  coordination: 2,
  agility: 2,
  endurance: 2,
  balance: 2,
  strength: 2,
};

function physicalScore(p: PhysicalFunctions): number {
  return p.coordination + p.agility + p.endurance + p.balance + p.strength;
}

/** 신체 기능 기반 균형 팀 배분 (그리디 교차 배분) */
export function balanceTeams(students: Student[]): { teamA: Student[]; teamB: Student[] } {
  const sorted = [...students].sort((a, b) => physicalScore(b.physical) - physicalScore(a.physical));
  const teamA: Student[] = [];
  const teamB: Student[] = [];
  sorted.forEach((s, i) => {
    if (i % 2 === 0) teamA.push(s);
    else teamB.push(s);
  });
  return { teamA, teamB };
}

export function useStudentStore() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loaded, setLoaded] = useState(false);

  // localStorage에서 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Student[];
        setStudents(parsed);
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // 변경 시 저장
  const save = useCallback((next: Student[]) => {
    setStudents(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const addStudent = useCallback(
    (name: string, classGroup: string) => {
      const next: Student = {
        id: crypto.randomUUID(),
        name: name.trim(),
        classGroup,
        status: 'present',
        physical: { ...DEFAULT_PHYSICAL },
      };
      save([...students, next]);
    },
    [students, save]
  );

  const removeStudent = useCallback(
    (id: string) => {
      save(students.filter((s) => s.id !== id));
    },
    [students, save]
  );

  const cycleStatus = useCallback(
    (id: string) => {
      const order: AttendanceStatus[] = ['present', 'absent', 'late'];
      save(
        students.map((s) =>
          s.id === id
            ? { ...s, status: order[(order.indexOf(s.status) + 1) % order.length] }
            : s
        )
      );
    },
    [students, save]
  );

  const markAllPresent = useCallback(
    (ids: string[]) => {
      save(students.map((s) => (ids.includes(s.id) ? { ...s, status: 'present' } : s)));
    },
    [students, save]
  );

  const updatePhysical = useCallback(
    (id: string, key: keyof PhysicalFunctions, value: PhysicalLevel) => {
      save(
        students.map((s) =>
          s.id === id ? { ...s, physical: { ...s.physical, [key]: value } } : s
        )
      );
    },
    [students, save]
  );

  const presentStudents = students.filter((s) => s.status === 'present');

  return {
    students,
    loaded,
    addStudent,
    removeStudent,
    cycleStatus,
    markAllPresent,
    updatePhysical,
    presentStudents,
  };
}
