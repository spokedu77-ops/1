import type { PrivateAttendance, PrivateWeekPattern, PrivateClassStatus } from './core';
export type { PrivateAttendance, PrivateWeekPattern, PrivateClassStatus } from './core';
export interface Unit {
  id: string; revision: number; name: string; ageGrade: string; classType: string; coach: string;
  status: PrivateClassStatus; neighborhood: string; placeType: string; address: string;
  subject: string; scheduleDays: number[]; scheduleTime: string; weekPattern: PrivateWeekPattern;
  memo: string; lastClassDate?: string; deletedAt?: string | null;
}
export interface Guardian { id: string; revision: number; relation: string; phone: string }
export interface UnitGuardian { unitId: string; guardianId: string; position: number }
export interface Enrollment {
  id: string; revision: number; studentId: string; enrolledAt: string; sessions: number;
  amount: number; paidAt: string | null; nextDueDate: string; expiresAt: string;
  memo: string; canceledAt?: string | null;
}
export interface LessonLog {
  id: string; revision: number; studentId: string; date: string; attended: PrivateAttendance;
  equipment: string; content: string; homework: string; sentAt?: string | null; deletedAt?: string | null;
}
export interface PrivateSnapshot {
  units: Unit[]; guardians: Guardian[]; links: UnitGuardian[]; enrollments: Enrollment[]; logs: LessonLog[];
}
export const emptySnapshot = (): PrivateSnapshot => ({units:[],guardians:[],links:[],enrollments:[],logs:[]});
export type EntityKind = 'unit'|'enrollment'|'log';
export type SaveGuardianChoice =
  | { mode:'keep'|'clear' }
  | { mode:'new'; relation:string; phone:string }
  | { mode:'existing'; guardianId:string }
  | { mode:'edit'; guardianId:string; relation:string; phone:string; revision:number };
