import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('MASTER core operating UX contracts', () => {
  it('uses a month calendar as the single schedule navigator', () => {
    const page = read('app/spokedu-master/activity/page.tsx');
    expect(page).toContain('<MonthSessionCalendar');
    expect(page).not.toContain('visibleDays.map');
    expect(page).not.toContain('type="date" value={selectedDay}');
    expect(page.match(/>수업 추가<\/button>/g)).toHaveLength(1);
  });

  it('keeps premature attendance controls out of new Session mode', () => {
    const page = read('app/spokedu-master/activity/page.tsx');
    expect(page).toContain('{activeSession ? <section>');
    expect(page).toContain("title={activeSession ? '수업 상세' : '수업 추가'}");
    expect(page).toContain('수업 만들기');
  });

  it('creates a Session and its selected activities through one transaction command', () => {
    const route = read('app/api/spokedu-master/sessions/route.ts');
    const migration = read('supabase/migrations/20260825120000_spokedu_master_create_session_with_activities.sql');
    expect(route).toContain("supabase.rpc('spokedu_master_create_session_with_activities'");
    expect(migration).toContain('insert into public.spokedu_master_sessions');
    expect(migration).toContain('insert into public.spokedu_master_session_programs');
    expect(migration).toContain('is_published=true');
    expect(migration).toContain("grant execute on function public.spokedu_master_create_session_with_activities");
  });

  it('aligns onboarding with the Class-first operating flow', () => {
    const onboarding = read('app/spokedu-master/onboarding/page.tsx');
    expect(onboarding).toContain('수업반 등록');
    expect(onboarding).toContain('첫 수업 만들기');
    expect(onboarding).toContain('수업 활동 찾기');
    expect(onboarding).toContain("router.replace('/spokedu-master/classes?create=1')");
    expect(onboarding).not.toContain('빠른 기록');
  });
});
