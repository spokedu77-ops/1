import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildSeoulTwoWeekdayStartsAfter,
  resolveLatestSeoulWeekdayTemplates,
} from '@/app/admin/classes-shared/lib/roundExtendUtils';

const routeSource = readFileSync(join(process.cwd(), 'app/api/admin/classes/postpone/route.ts'), 'utf8');
const panelSource = readFileSync(
  join(process.cwd(), 'app/admin/classes/components/ClassBundlePanel.tsx'),
  'utf8',
);
const migrationSource = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261022190000_atomic_class_postpone.sql'),
  'utf8',
);

describe('atomic class postpone contract', () => {
  it('keeps the mutation behind admin auth and one service-role RPC', () => {
    expect(routeSource).toContain('requireAdmin()');
    expect(routeSource).toContain('getServiceSupabase().rpc');
    expect(routeSource).toContain("'admin_apply_class_postpone'");
    expect(routeSource).not.toContain(".from('sessions')");
  });

  it('sends the concurrency and idempotency guards from the UI', () => {
    expect(panelSource).toContain('expectedStartAt: row.start_at');
    expect(panelSource).toContain('requestKey: crypto.randomUUID()');
    expect(panelSource).toContain('for (let attempt = 0; attempt < 2; attempt += 1)');
    expect(panelSource).not.toContain('postponeCascade(supabase');
    expect(panelSource).not.toContain('undoPostponeCascade(supabase');
  });

  it('uses existing storage, preserves server-only execution, and delegates settlement', () => {
    expect(migrationSource).not.toMatch(/create\s+table/i);
    expect(migrationSource).toContain('private.phase2_mileage_request_results');
    expect(migrationSource).toContain('public.admin_apply_session_linked_mileage');
    expect(migrationSource).toContain("operation <> 'class-postpone'");
    expect(migrationSource).toContain('for update');
    expect(migrationSource).toContain('POSTPONE_LEGACY_MILEAGE_REVIEW_REQUIRED');
    expect(migrationSource).toContain(
      'revoke all on function public.admin_apply_class_postpone(uuid, text, timestamptz, uuid) from public, anon, authenticated',
    );
    expect(migrationSource).toContain(
      'grant execute on function public.admin_apply_class_postpone(uuid, text, timestamptz, uuid) to service_role',
    );
  });

  it('uses the same Seoul weekday destination contract as round extension', () => {
    const sessions = [
      {
        id: 'tue',
        start_at: '2026-10-20T07:00:00.000Z',
        end_at: '2026-10-20T08:00:00.000Z',
        status: 'opened',
        created_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        price: 30_000,
      },
      {
        id: 'thu',
        start_at: '2026-10-22T08:00:00.000Z',
        end_at: '2026-10-22T09:30:00.000Z',
        status: 'opened',
        created_by: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        price: 40_000,
      },
    ];
    const pattern = resolveLatestSeoulWeekdayTemplates(sessions);
    expect(pattern.kind).toBe('two');
    const destinations = buildSeoulTwoWeekdayStartsAfter(
      sessions[1]!.start_at,
      pattern.templates,
      2,
    );
    expect(destinations.map(({ startAt, endAt, template }) => ({
      startAt,
      endAt,
      teacher: template.createdBy,
      price: template.price,
    }))).toEqual([
      {
        startAt: '2026-10-27T07:00:00.000Z',
        endAt: '2026-10-27T08:00:00.000Z',
        teacher: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        price: 30_000,
      },
      {
        startAt: '2026-10-29T08:00:00.000Z',
        endAt: '2026-10-29T09:30:00.000Z',
        teacher: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        price: 40_000,
      },
    ]);

    expect(migrationSource).toContain("at time zone 'Asia/Seoul'");
    expect(migrationSource).toContain('created_by = v_destination.created_by');
    expect(migrationSource).toContain('price = v_destination.price');
    expect(migrationSource).toContain('v_template.end_at - v_template.start_at');
  });

  it('stores an exact reversible snapshot and fails closed after later edits', () => {
    expect(migrationSource).toContain("'POSTPONE_SNAPSHOT:' || v_snapshot::text");
    expect(migrationSource).toContain("message = 'POSTPONE_RESTORE_STATE_CHANGED'");
    expect(migrationSource).toContain("start_at = (v_snapshot_item->>'oldStartAt')::timestamptz");
    expect(migrationSource).toContain("created_by = nullif(v_snapshot_item->>'oldCreatedBy', '')::uuid");
    expect(migrationSource).toContain("price = (v_snapshot_item->>'oldPrice')::integer");
    expect(migrationSource).toContain("status = v_snapshot_item->>'oldStatus'");
  });

  it('protects settled sessions and manual count logs from unsafe reopening', () => {
    expect(migrationSource).toContain("message = 'POSTPONE_SESSION_COUNT_MANUAL_CONFLICT'");
    expect(migrationSource).toContain("message = 'POSTPONE_SETTLED_SESSION_CONFLICT'");
    expect(migrationSource).toContain("message = 'POSTPONE_MAIN_ASSIST_TEACHER_CONFLICT'");
    expect(migrationSource).toContain("reason is distinct from '트리거: sessions.status sync'");
  });
});
