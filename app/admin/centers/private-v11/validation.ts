import type { Enrollment, LessonLog, Unit } from './types';
const isRecord=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validDate=(s:unknown):s is string=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const optionalDay=(s:unknown):boolean=>s===''||s===null||s===undefined||validDate(s);
const optionalString=(s:unknown):boolean=>typeof s==='string'||s===null||s===undefined;
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export {isRecord,uuid};
export const validDay=validDate;
export function validUnit(x:unknown):x is Unit {
  if(!isRecord(x))return false;
  if(x.gender!==undefined&&(typeof x.gender!=='string'||!['unknown','male','female','mixed'].includes(x.gender)))return false;
  if([x.attendsGym,x.rainAvailable].some(value=>value!==undefined&&value!==null&&typeof value!=='boolean'))return false;
  if(x.scheduleGroupIds!==undefined&&(!Array.isArray(x.scheduleGroupIds)||x.scheduleGroupIds.length>100||!x.scheduleGroupIds.every(uuid)||new Set(x.scheduleGroupIds).size!==x.scheduleGroupIds.length))return false;
  const time = (value: unknown) => typeof value === 'string' && (value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
  if (x.coachId != null && !uuid(x.coachId)) return false;
  if (x.schedules !== undefined && (!Array.isArray(x.schedules) || x.schedules.length > 14 || x.schedules.some(slot => !isRecord(slot) || !Number.isInteger(slot.day) || Number(slot.day) < 0 || Number(slot.day) > 6 || !time(slot.start) || !time(slot.end) || typeof slot.coach !== 'string' || (slot.coachId != null && !uuid(slot.coachId)) || (slot.start && slot.end && slot.end === slot.start)))) return false;
  return typeof x.name==='string'&&x.name.trim().length>0&&['active','paused','ended'].includes(String(x.status))&&
    ['every','odd','even','biweekly'].includes(String(x.weekPattern))&&Array.isArray(x.scheduleDays)&&x.scheduleDays.every(v=>Number.isInteger(v)&&v>=0&&v<=6)&&new Set(x.scheduleDays).size===x.scheduleDays.length&&
    ['ageGrade','classType','coach','neighborhood','placeType','address','subject','scheduleTime','memo'].every(k=>typeof x[k]==='string')&&
    (x.scheduleTime===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(String(x.scheduleTime)));
}
export function validEnrollment(x:unknown):x is Enrollment {
  if(!isRecord(x))return false;
  return uuid(x.studentId)&&validDate(x.enrolledAt)&&Number.isInteger(x.sessions)&&Number(x.sessions)>0&&
    Number.isInteger(x.amount)&&Number(x.amount)>=0&&optionalDay(x.paidAt)&&optionalDay(x.nextDueDate)&&optionalDay(x.expiresAt)&&optionalString(x.memo);
}
export function validLog(x:unknown):x is LessonLog {
  if(!isRecord(x))return false;
  return uuid(x.studentId)&&validDate(x.date)&&['출석','보강','당일결석','사전결석','우천취소/연기'].includes(String(x.attended))&&
    ['equipment','content','homework'].every(k=>typeof x[k]==='string')&&optionalString(x.sentAt)&&optionalString(x.deletedAt);
}
