import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const hardening = read('supabase/migrations/20260822210000_spokedu_master_session_foundation_hardening.sql');

describe('SPOKEDU MASTER Session foundation', () => {
  it('keeps class membership ID-based and independent from class names', () => {
    const sessions = read('app/api/spokedu-master/sessions/route.ts');
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(sessions).toContain('spokedu_master_class_students(student_id)');
    expect(activity).toContain('selectedClass?.studentIds.includes(student.id)');
    expect(activity).not.toContain('student.group');
  });

  it('supports one student in multiple classes with explicit narrow mutations', () => {
    const add = read('app/api/spokedu-master/classes/[classId]/students/route.ts');
    expect(add).toContain('class_id: classId');
    expect(add).toContain('student_id: body.studentId');
    expect(add).toContain("onConflict: 'class_id,student_id'");
  });

  it('does not couple membership deletion to historical attendance', () => {
    const migration = read('supabase/migrations/20260822120000_spokedu_master_class_students_and_session_mutations.sql');
    expect(migration).not.toMatch(/session_attendance[\s\S]{0,120}class_students/i);
    expect(hardening).not.toContain('delete from public.spokedu_master_session_attendance where student_id');
  });

  it('keeps a newly created class open for child mutations', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(activity).toContain('setActiveSession(saved)');
    expect(activity).toContain("activeSession ? '변경사항 저장' : '수업 만들기'");
  });

  it('applies program UI state only after mutation success', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    expect(activity.indexOf('await data.updateSessionProgram')).toBeLessThan(activity.indexOf('setPrograms((current) => current.map'));
    expect(activity.indexOf('await data.removeSessionProgram')).toBeLessThan(activity.lastIndexOf('setPrograms((current) => current.filter'));
  });

  it('rejects completed program additions and cancelled attendance changes', () => {
    const prior = read('supabase/migrations/20260822120000_spokedu_master_class_students_and_session_mutations.sql');
    expect(prior).toContain("status='scheduled'");
    expect(hardening).toContain("status in ('scheduled','completed')");
  });

  it('rejects attendance for a student outside the current class', () => {
    expect(hardening).toContain('attendance student is not a current class member');
  });

  it('rejects duplicate, missing, or foreign program reorder ids', () => {
    expect(hardening).toContain('count(distinct id)');
    expect(hardening).toContain('cardinality(p_program_ids)');
    expect(hardening).toContain('item.session_id=p_session_id');
  });

  it('normalizes program order after deletion', () => {
    expect(hardening).toContain('set sort_order=sort_order-1');
  });
});
