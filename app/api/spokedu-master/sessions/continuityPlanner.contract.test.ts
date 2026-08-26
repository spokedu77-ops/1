import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const migration = readFileSync('supabase/migrations/20260828120000_spokedu_master_selective_session_carryover.sql', 'utf8');
const nextRoute = readFileSync('app/api/spokedu-master/sessions/[sessionId]/next/route.ts', 'utf8');
const carryRoute = readFileSync('app/api/spokedu-master/sessions/[sessionId]/programs/carryover/route.ts', 'utf8');
describe('Continuity Planner backend contract', () => {
  it('keeps the old RPC and adds atomic selective V2 creation', () => { expect(migration).toContain('spokedu_master_create_next_session_v2'); expect(migration).not.toContain('drop function'); expect(migration).toContain('p_source_session_program_ids uuid[]'); expect(nextRoute).toContain("spokedu_master_create_next_session_v2"); expect(nextRoute).toContain("spokedu_master_create_next_session'"); });
  it('validates exact source ids, owner, completed source and duplicate request ids', () => { expect(migration).toContain("status='completed'"); expect(migration).toContain('owner_id=p_owner_id'); expect(migration).toContain('duplicate source program ids'); expect(migration).toContain('invalid source program id'); });
  it('copies only selected ordered activities with completion reset', () => { expect(migration).toContain('p.id=any(v_ids)'); expect(migration).toContain('order by p.sort_order,p.id'); expect(migration).toMatch(/sort_order,is_completed\)[\s\S]*false/); });
  it('guards exact collisions, target state, same Class, duplicates and entitlement', () => { expect(migration).toContain('exact session time already exists'); expect(migration).toContain("status='scheduled'"); expect(migration).toContain('v_source.class_id <> v_target.class_id'); expect(migration).toContain('not exists'); expect(carryRoute).toContain("access.plan === 'lite'"); expect(carryRoute).toContain('is_published'); });
});
