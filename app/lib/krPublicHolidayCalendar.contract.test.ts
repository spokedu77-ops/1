import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const holidayData = JSON.parse(
  readFileSync(join(process.cwd(), 'data/kr-public-holidays.json'), 'utf8'),
) as { years: Record<string, { date: string }[]> };

const migrationSource = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261023150000_mileage_holiday_and_admin_cancel.sql'),
  'utf8',
);

function seoulDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso),
  );
}

describe('KR public holiday calendar contract', () => {
  it('includes 2026-10-03, 2026-10-05, 2026-10-09 as holidays', () => {
    const y2026 = holidayData.years['2026'].map((row) => row.date);
    expect(y2026).toContain('2026-10-03');
    expect(y2026).toContain('2026-10-05');
    expect(y2026).toContain('2026-10-09');
  });

  it('blocks postpone credit in SQL when posture is holiday or unknown', () => {
    expect(migrationSource).toContain('private.kr_public_holiday_blocks_postpone_credit');
    expect(migrationSource).toContain("when '수업 연기' then");
    expect(migrationSource).toContain("when '당일 연기' then");
    expect(migrationSource).toContain("at time zone 'Asia/Seoul'");
    expect(migrationSource).not.toContain('when p_session_start_at is null then v_total := v_total + 2500');
  });

  it('uses session start_at for settled totals and exposes admin cancel RPC', () => {
    expect(migrationSource).toContain('private.phase2_mileage_total(coalesce(p_next_action, \'\'), v_session.start_at)');
    expect(migrationSource).toContain('public.admin_cancel_mileage_log');
    expect(migrationSource).toContain('public.admin_cancel_session_linked_settlement');
    expect(migrationSource).toContain('cancel_scope');
    expect(migrationSource).toContain('private.mileage_log_cancel_audits');
  });

  it('maps Seoul midnight boundaries for session timestamps', () => {
    expect(seoulDate('2026-10-02T15:00:00.000Z')).toBe('2026-10-03');
    expect(seoulDate('2026-10-08T15:00:00.000Z')).toBe('2026-10-09');
  });
});
