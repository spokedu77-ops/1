import type { Enrollment, Guardian, LessonLog, PrivateSnapshot, Unit, UnitGuardian } from './types';
// DB payload mapping, fixed column allowlists. Never merge settlement policy payloads into these entities.
type Row = Record<string, unknown>;
const s = (v:unknown):string => v == null ? '' : String(v);
const n = (v:unknown):number => Number(v)||0;
const date = (v:unknown):string => typeof v==='string'?v:'';
export const asUnit = (r:Row):Unit => ({id:s(r.id),revision:n(r.revision),name:s(r.name),ageGrade:s(r.age_grade),classType:s(r.class_type),coach:s(r.coach),status:r.status==='paused'?'paused':'active',neighborhood:s(r.neighborhood),placeType:s(r.place_type),address:s(r.address),subject:s(r.subject),scheduleDays:Array.isArray(r.schedule_days)?r.schedule_days.map(Number):[],scheduleTime:s(r.schedule_time),weekPattern:r.week_pattern==='odd'||r.week_pattern==='even'||r.week_pattern==='biweekly'?r.week_pattern:'every',memo:s(r.memo),lastClassDate:date(r.last_class_date),deletedAt:r.deleted_at?String(r.deleted_at):null});
export const asGuardian = (r:Row):Guardian => ({id:s(r.id),revision:n(r.revision),relation:s(r.relation),phone:s(r.phone)});
export const asUnitGuardian = (r:Row):UnitGuardian => ({unitId:s(r.unit_id),guardianId:s(r.guardian_id),position:n(r.position)});
export const asEnrollment = (r:Row):Enrollment => ({id:s(r.id),revision:n(r.revision),studentId:s(r.unit_id),enrolledAt:date(r.enrolled_at),sessions:n(r.sessions),amount:n(r.amount_10k_krw),paidAt:r.paid_at?String(r.paid_at):null,nextDueDate:date(r.next_due_date),expiresAt:date(r.expires_at),memo:s(r.memo),canceledAt:r.canceled_at?String(r.canceled_at):null});
export const asLog = (r:Row):LessonLog => ({id:s(r.id),revision:n(r.revision),studentId:s(r.unit_id),date:date(r.date),attended:r.attended as LessonLog['attended'],equipment:s(r.equipment),content:s(r.content),homework:s(r.homework),sentAt:r.sent_at?String(r.sent_at):null,deletedAt:r.deleted_at?String(r.deleted_at):null});
export const toEnrollmentRow = (x:Enrollment) => ({unit_id:x.studentId,enrolled_at:x.enrolledAt,sessions:x.sessions,amount_10k_krw:x.amount,paid_at:x.paidAt||null,next_due_date:x.nextDueDate||null,expires_at:x.expiresAt||null,memo:x.memo,canceled_at:x.canceledAt||null});
export const toLogRow = (x:LessonLog) => ({unit_id:x.studentId,date:x.date,attended:x.attended,equipment:x.equipment,content:x.content,homework:x.homework,sent_at:x.sentAt||null,deleted_at:x.deletedAt||null});
export function asSnapshot(rows:{units:Row[],guardians:Row[],links:Row[],enrollments:Row[],logs:Row[]}):PrivateSnapshot {
  return {units:rows.units.map(asUnit),guardians:rows.guardians.map(asGuardian),links:rows.links.map(asUnitGuardian),enrollments:rows.enrollments.map(asEnrollment),logs:rows.logs.map(asLog)};
}
