'use client';

import { useState, useCallback } from 'react';
import { loadStudents, saveStudents } from '../lib/storage';
import { STUDENT_COLORS } from '../constants';

export type Student = { id: string; name: string; color: string; createdAt: string };

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(() => loadStudents());

  const add = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const newStudent: Student = {
      id: Date.now().toString(),
      name: trimmed,
      color: STUDENT_COLORS[Math.floor(Math.random() * STUDENT_COLORS.length)]!,
      createdAt: new Date().toISOString(),
    };
    setStudents((prev) => {
      const next = [...prev, newStudent];
      saveStudents(next);
      return next;
    });
    return newStudent;
  }, []);

  const remove = useCallback((id: string) => {
    setStudents((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveStudents(next);
      return next;
    });
  }, []);

  const rename = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStudents((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, name: trimmed } : s));
      saveStudents(next);
      return next;
    });
  }, []);

  return { students, add, remove, rename };
}
