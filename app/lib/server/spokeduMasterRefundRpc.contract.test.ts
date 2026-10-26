import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../supabase/migrations/20261026163452_spokedu_master_refund_request_workflow.sql'),
  'utf8',
);
const workflow = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'spokeduMasterRefundWorkflow.ts'), 'utf8');

describe('refund RPC signature parity (API ↔ migration)', () => {
  it('matches create_refund_request_v1 parameters', () => {
    expect(migration).toContain('spokedu_master_create_refund_request_v1(');
    for (const key of [
      'p_order_id',
      'p_user_id',
      'p_requested_amount',
      'p_refund_type',
      'p_reason',
      'p_idempotency_key',
      'p_requested_by',
      'p_pg_evidence_status',
      'p_refunded_amount_snapshot',
    ]) {
      expect(workflow).toContain(key);
    }
    expect(migration).toContain(
      'grant execute on function public.spokedu_master_create_refund_request_v1(text, uuid, integer, text, text, text, uuid, text, integer)',
    );
  });

  it('matches transition_refund_request_v1 parameters', () => {
    expect(migration).toContain('spokedu_master_transition_refund_request_v1(');
    for (const key of [
      'p_request_id',
      'p_actor_id',
      'p_action',
      'p_expected_status',
      'p_review_note',
      'p_provider_status',
      'p_provider_error_code',
      'p_provider_refunded_amount',
    ]) {
      expect(workflow).toContain(key);
    }
    expect(migration).toContain(
      'grant execute on function public.spokedu_master_transition_refund_request_v1(uuid, uuid, text, text, text, text, text, integer)',
    );
  });
});
