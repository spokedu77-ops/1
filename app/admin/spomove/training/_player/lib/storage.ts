/**
 * localStorage 기반 학생·기록 저장
 */

import { STUDENTS_KEY } from '../constants';

export function loadStudents(): Array<{ id: string; name: string; color: string; createdAt: string }> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STUDENTS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStudents(list: Array<{ id: string; name: string; color: string; createdAt: string }>) {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(STUDENTS_KEY, JSON.stringify(list));
  } catch {}
}
