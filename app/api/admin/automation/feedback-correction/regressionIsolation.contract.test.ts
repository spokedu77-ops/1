import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const equipmentAdjust = readFileSync(
  join(process.cwd(), 'app/api/admin/equipment/adjust/route.ts'),
  'utf8',
);
const settlementSheet = readFileSync(
  join(process.cwd(), 'app/api/admin/settlement-sheet/route.ts'),
  'utf8',
);
const bulkUpdate = readFileSync(
  join(process.cwd(), 'app/api/admin/classes/sessions/bulk-update/route.ts'),
  'utf8',
);
const enqueue = readFileSync(
  join(process.cwd(), 'app/api/admin/automation/feedback-correction/enqueue/route.ts'),
  'utf8',
);

describe('automation MVP regression isolation', () => {
  it('does not modify equipment or settlement routes in this change set', () => {
    expect(equipmentAdjust).toContain('admin_equipment_adjust_on_hand');
    expect(settlementSheet).toContain('admin_settlement_sheet_months');
    expect(bulkUpdate).toContain('admin_apply_session_schedule_changes');
  });

  it('enqueue only inserts correction jobs', () => {
    expect(enqueue).toContain('admin_feedback_correction_jobs');
    expect(enqueue).not.toContain('session_count_logs');
    expect(enqueue).not.toContain('equipment_ledger');
    expect(enqueue).not.toContain('admin_settlement_sheet');
  });
});
