import { describe, expect, it } from 'vitest';
import {
  getHeadlineStats, getLastClassDate, getPaymentInfo, getSessionInfo, getWeekDays,
  isScheduledOn, type PrivateEnrollment, type PrivateLessonLog, type PrivateStudent,
} from './core';
const student: PrivateStudent = { id: 's1', name: '학생', status: 'active', scheduleDays: [1,3], weekPattern: 'every' };
const enrollments: PrivateEnrollment[] = [{id:'e1',studentId:'s1',sessions:4,amount:32,paidAt:'2026-11-01',nextDueDate:'2026-11-10'}];
const log = (id:string,attended:PrivateLessonLog['attended'],date='2026-11-02'):PrivateLessonLog => ({id,studentId:'s1',attended,date});

describe('original 개인DB.html v11 behavior; no business-rule fixes', () => {
  it.each(['출석','보강','당일결석'] as const)('%s consumes one session', status => {
    expect(getSessionInfo('s1', enrollments, [log(status,status)]).remain).toBe(3);
  });
  it.each(['사전결석','우천취소/연기'] as const)('%s does not consume sessions', status => {
    expect(getSessionInfo('s1', enrollments, [log(status,status)]).remain).toBe(4);
  });
  it('soft-deleted logs do not consume sessions', () => expect(getSessionInfo('s1',enrollments,[{...log('a','출석'),deletedAt:'2026-11-03'}]).used).toBe(0));
  it('canceled enrollment does not count', () => expect(getSessionInfo('s1',[{...enrollments[0],canceledAt:'2026-11-03'}],[]).total).toBe(0));
  it('permits negative sessions after overuse, as in the original', () => {
    expect(getSessionInfo('s1',[{...enrollments[0],sessions:1}], [log('1','출석'),log('2','보강')])).toMatchObject({total:1,used:2,remain:-1,pct:0,level:'bad'});
  });
  it('treats missing enrollments as renewal needed (original behavior)', () => {
    expect(getSessionInfo('s1',[],[]).level).toBe('bad');
  });
  it('computes paid and unpaid amounts in original ten-thousand KRW units', () => {
    const rows = [...enrollments,{...enrollments[0],id:'e2',amount:24,paidAt:null,nextDueDate:'2026-11-07'}];
    expect(getPaymentInfo('s1',rows,'2026-11-06')).toEqual({totalAmount:56,paidAmount:32,unpaidAmount:24,lastPaidAt:'2026-11-01',upcoming:'2026-11-07'});
  });
  it('last class ignores non-consuming attendance records', () => {
    expect(getLastClassDate('s1',[log('a','출석','2026-11-01'),log('b','사전결석','2026-11-05')])).toBe('2026-11-01');
  });
  it('same weekly weekday across month boundary uses day-of-month odd/even', () => {
    const odd: PrivateStudent = {...student,scheduleDays:[1],weekPattern:'odd'};
    expect(isScheduledOn(odd,new Date(2026,10,2))).toBe(true);
    expect(isScheduledOn(odd,new Date(2026,10,9))).toBe(false);
    expect(isScheduledOn({...odd,weekPattern:'even'},new Date(2026,10,9))).toBe(true);
  });
  it('biweekly anchoring is January 1 of same calendar year (not enrollment date)', () => {
    const s = {...student,scheduleDays:[4],weekPattern:'biweekly' as const};
    expect(isScheduledOn(s,new Date(2026,0,1))).toBe(true);
    expect(isScheduledOn(s,new Date(2026,0,8))).toBe(false);
  });
  it('makes weeks Sunday through Saturday', () => {
    expect(getWeekDays(0,new Date(2026,10,6)).map(d=>d.getDay())).toEqual([0,1,2,3,4,5,6]);
  });
  it('summary does not include paused / soft deleted teams', () => {
    expect(getHeadlineStats([student,{...student,id:'p',status:'paused'},{...student,id:'d',deletedAt:'now'}],enrollments,[],new Date(2026,10,2))).toMatchObject({active:1,today:1,renewal:0,unpaid:0});
  });
});
