/**
 * SPOKEDU 프라이빗 레슨 매니저 v11: pure domain logic from 개인DB.html.
 * THIS IS A LOCAL PREPARATION ARTIFACT, NOT INSTALLED INTO THE PRODUCTION REPOSITORY.
 * No storage/API/UI side effects. Behavioral equivalence is intentional, including
 * original odd/even/biweekly month/year anchoring, pending business approval to revise.
 */
export type PrivateClassStatus = 'active' | 'paused' | 'ended';
export interface PrivateSchedule { day: number; start: string; end: string; coach: string; coachId?: string | null }
export type PrivateAttendance = '출석' | '보강' | '당일결석' | '사전결석' | '우천취소/연기';
export type PrivateWeekPattern = 'every' | 'odd' | 'even' | 'biweekly';

export interface PrivateStudent {
  id: string;
  name: string;
  status?: PrivateClassStatus;
  scheduleDays?: number[];
  scheduleTime?: string;
  coach?: string;
  coachId?: string | null;
  schedules?: PrivateSchedule[];
  weekPattern?: PrivateWeekPattern;
  lastClassDate?: string;
  deletedAt?: string | null;
}
export interface PrivateEnrollment {
  id: string;
  studentId: string;
  sessions: number;
  amount: number; // original v11 units: 만원 (not KRW)
  enrolledAt?: string;
  paidAt?: string | null;
  nextDueDate?: string;
  expiresAt?: string;
  canceledAt?: string | null;
}
export interface PrivateLessonLog {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD (local business date)
  attended: PrivateAttendance;
  deletedAt?: string | null;
  sentAt?: string | null;
}

export const CONSUMING: readonly PrivateAttendance[] = ['출석', '보강', '당일결석'];
export const daysSince = (isoDay: string, now = new Date()): number | null => {
  if (!isoDay) return null;
  const date = new Date(`${isoDay}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  return Math.floor((t.getTime() - date.getTime()) / 86400000);
};

export function getWeekDays(offset = 0, now = new Date()): Date[] {
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function isScheduledOn(student: PrivateStudent, day: Date): boolean {
  const days = getPrivateSchedules(student).map(slot => slot.day);
  if (!days.includes(day.getDay())) return false;
  const pattern = student.weekPattern || 'every';
  if (pattern === 'every') return true;
  const weekOfMonth = Math.ceil(day.getDate() / 7);
  if (pattern === 'odd') return weekOfMonth % 2 === 1;
  if (pattern === 'even') return weekOfMonth % 2 === 0;
  if (pattern === 'biweekly') {
    const start = new Date(day.getFullYear(), 0, 1);
    const diff = Math.floor((day.getTime() - start.getTime()) / 86400000);
    return Math.floor(diff / 7) % 2 === 0;
  }
  return true;
}

export function getPrivateSchedules(student: PrivateStudent): PrivateSchedule[] {
  return student.schedules ?? (student.scheduleDays ?? []).map(day => ({ day, start: student.scheduleTime ?? '', end: '', coach: student.coach ?? '', coachId: student.coachId ?? null }));
}

export function defaultPrivateEndTime(start: string): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) return '';
  const [hours, minutes] = start.split(':').map(Number);
  return `${String((hours + 1) % 24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getPrivateSchedulesOn(student: PrivateStudent, day: Date): PrivateSchedule[] {
  return isScheduledOn(student, day) ? getPrivateSchedules(student).filter(slot => slot.day === day.getDay()) : [];
}

export function formatPrivatePhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  return /^010\d{8}$/.test(digits) ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` : value;
}

export function getEnrollments(studentId: string, enrollments: readonly PrivateEnrollment[]): PrivateEnrollment[] {
  return enrollments.filter(en => en.studentId === studentId && !en.canceledAt);
}
export function getTotalSessions(studentId: string, enrollments: readonly PrivateEnrollment[]): number {
  return getEnrollments(studentId, enrollments).reduce((acc, en) => acc + (Number(en.sessions) || 0), 0);
}
export function getUsedSessions(studentId: string, logs: readonly PrivateLessonLog[]): number {
  return logs.filter(log => log.studentId === studentId && !log.deletedAt && CONSUMING.includes(log.attended)).length;
}
export function getSessionInfo(studentId: string, enrollments: readonly PrivateEnrollment[], logs: readonly PrivateLessonLog[]) {
  const total = getTotalSessions(studentId, enrollments);
  const used = getUsedSessions(studentId, logs);
  const remain = total - used;
  const pct = total > 0 ? Math.max(0, Math.min(100, (remain / total) * 100)) : 0;
  const level: 'ok' | 'warn' | 'bad' = remain <= 0 ? 'bad' : remain <= 1 ? 'warn' : 'ok';
  return { total, used, remain, pct, level };
}
export function getPaymentInfo(studentId: string, enrollments: readonly PrivateEnrollment[], todayStr: string) {
  const current = getEnrollments(studentId, enrollments);
  const totalAmount = current.reduce((sum, en) => sum + (Number(en.amount) || 0), 0);
  const paidAmount = current.filter(en => en.paidAt).reduce((sum, en) => sum + (Number(en.amount) || 0), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const lastPaidAt = current.filter(en => en.paidAt).map(en => en.paidAt!).sort().pop() || '';
  const upcoming = current.filter(en => en.nextDueDate).map(en => en.nextDueDate!).sort().find(day => day >= todayStr) || '';
  return { totalAmount, paidAmount, unpaidAmount, lastPaidAt, upcoming };
}
export function getLastClassDate(studentId: string, logs: readonly PrivateLessonLog[]): string {
  return logs.filter(log => log.studentId === studentId && !log.deletedAt && CONSUMING.includes(log.attended))
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || '';
}
export function getHeadlineStats(students: readonly PrivateStudent[], enrollments: readonly PrivateEnrollment[], logs: readonly PrivateLessonLog[], now = new Date()) {
  const active = students.filter(student => (!student.status || student.status === 'active') && !student.deletedAt);
  const today = active.reduce((count, student) => count + getPrivateSchedulesOn(student, now).length, 0);
  const weekDays = getWeekDays(0, now);
  const thisWeek = active.reduce((count, student) => count + weekDays.reduce((sum, day) => sum + getPrivateSchedulesOn(student, day).length, 0), 0);
  const renewal = active.filter(student => getSessionInfo(student.id, enrollments, logs).remain <= 1).length;
  const todayIso = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const unpaid = active.filter(student => getPaymentInfo(student.id, enrollments, todayIso).unpaidAmount > 0).length;
  return { active: active.length, today, thisWeek, renewal, unpaid };
}
