import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getSafeMasterPostPaymentPath } from './masterPaymentReturn';
import { resolveMasterContextQueryKeys } from './masterNavigationContext';
import { isEngineDoneLessonRecord } from './masterProductTruth';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER OS consistency journeys', () => {
  it('PAYMENT-RETURN-01 preserves SPOMOVE Hub discovery through payment', () => {
    expect(resolveMasterContextQueryKeys('/spokedu-master/spomove')).toEqual([
      'view',
      'group',
      'difficulty',
      'movement',
      'q',
    ]);
    expect(
      getSafeMasterPostPaymentPath(
        '/spokedu-master/spomove?view=favorites&group=dive&difficulty=hard&movement=jump&q=reaction',
      ),
    ).toBe('/spokedu-master/spomove?view=favorites&group=dive&difficulty=hard&movement=jump&q=reaction');
  });

  it('SPOMOVE-SESSION-01 keeps Session origin and separates engine vs lesson record', () => {
    expect(isEngineDoneLessonRecord(false)).toBe(true);
    const activity = read('app/spokedu-master/activity/page.tsx');
    const result = read('app/spokedu-master/spomove/session/MasterSessionResult.tsx');
    expect(activity).toContain('session: activeSession.id');
    expect(activity).toContain('sessionProgram: program.id');
    expect(result).toContain('수업으로 돌아가기');
    expect(result).toContain('완료로 표시하고 수업으로');
    expect(resolveMasterContextQueryKeys('/spokedu-master/spomove/session')).toEqual(
      expect.arrayContaining(['session', 'sessionProgram', 'returnTo', 'hubReturn']),
    );
  });

  it('NEXT-SESSION-01 carries Class/activities without attendance/memo/completion', () => {
    const activity = read('app/spokedu-master/activity/page.tsx');
    const migration = read('supabase/migrations/20260823120000_spokedu_master_create_next_session.sql');
    expect(activity).toContain('다음 수업 만들기');
    expect(activity).toContain('sourceSessionProgramIds: selectedCarryoverIds');
    expect(activity).toContain('setSelectedCarryoverIds');
    expect(migration).toContain('program_title_snapshot, sort_order, false');
    expect(migration).not.toContain('spokedu_master_session_attendance');
  });

  it('assign copy uses 수업에 추가 grammar', () => {
    const assign = read('app/spokedu-master/components/session/AssignProgramToSessionButton.tsx');
    expect(assign).toContain('수업에 추가');
    expect(assign).not.toContain('수업에 배정');
  });
});
