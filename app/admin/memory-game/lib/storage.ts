/**
 * localStorage 기반 학생·기록 저장
 */

import { STUDENTS_KEY, HISTORY_KEY, MAX_HISTORY } from '../constants';

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

export function loadHistory(): Array<Record<string, unknown>> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(HISTORY_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: Array<Record<string, unknown>>) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(-MAX_HISTORY)));
    }
  } catch {}
}

export function addRecord(record: Record<string, unknown>) {
  const prev = loadHistory();
  const next = [...prev, record];
  saveHistory(next);
  return next;
}
