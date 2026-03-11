/**
 * Shared types for SPOKEDU Pro feature.
 * Used by both API routes and client hooks.
 */

export type PhysicalLevel = 1 | 2 | 3;

export type PhysicalFunctions = {
  coordination: PhysicalLevel;
  agility: PhysicalLevel;
  endurance: PhysicalLevel;
  balance: PhysicalLevel;
  strength: PhysicalLevel;
};

export type StoredStudent = {
  id: string;
  name: string;
  classGroup: string;
  physical: PhysicalFunctions;
  enrolledAt: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export const DEFAULT_PHYSICAL: PhysicalFunctions = {
  coordination: 2,
  agility: 2,
  endurance: 2,
  balance: 2,
  strength: 2,
};

/** DB row shape for spokedu_pro_students table. */
export type DbStudentRow = {
  id: string;
  name: string;
  class_group: string;
  physical: PhysicalFunctions;
  enrolled_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export function dbToStudent(row: DbStudentRow): StoredStudent {
  return {
    id: row.id,
    name: row.name,
    classGroup: row.class_group ?? '',
    physical: (row.physical as PhysicalFunctions) ?? DEFAULT_PHYSICAL,
    enrolledAt: row.enrolled_at,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
