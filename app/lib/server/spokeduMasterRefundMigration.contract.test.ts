import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  fileURLToPath(new URL('../../../supabase/migrations/20261026163452_spokedu_master_refund_request_workflow.sql', import.meta.url)),
  'utf8',
);

describe('refund request workflow migration draft', () => {
  it('keeps requests and immutable events in separate tables', () => {
    expect(migration).toContain('create table if not exists public.spokedu_master_refund_requests');
    expect(migration).toContain('create table if not exists public.spokedu_master_refund_request_events');
    expect(migration).toContain('references public.spokedu_master_payment_orders(order_id)');
    expect(migration).toContain('on delete restrict');
  });

  it('enforces amount, idempotency, duplicate-open-request, and two-person controls', () => {
    expect(migration).toContain('requested_amount <= original_amount');
    expect(migration).toContain('approved_by <> requested_by');
    expect(migration).toContain('unique (idempotency_key)');
    expect(migration).toContain('spm_refund_requests_open_duplicate_unique');
  });

  it('denies browser roles and only defines explicit non-secret provider evidence columns', () => {
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('for all to anon, authenticated');
    expect(migration).toContain('using (false) with check (false)');
    expect(migration).toContain('provider_status text');
    expect(migration).toContain('provider_error_code text');
    expect(migration).not.toMatch(/payment_key|billing_key|access_token|refresh_token/i);
  });

  it('makes workflow events append-only, including for privileged application clients', () => {
    expect(migration).toContain('security invoker');
    expect(migration).toContain('before update or delete');
    expect(migration).toContain("raise exception 'refund request events are append-only'");
  });

  it('defines service-role RPCs for create and transition without mutating orders', () => {
    expect(migration).toContain('spokedu_master_create_refund_request_v1');
    expect(migration).toContain('spokedu_master_transition_refund_request_v1');
    expect(migration).toContain("grant execute on function public.spokedu_master_create_refund_request_v1");
  });

  it('does not install payment, cancellation, or entitlement mutation logic', () => {
    expect(migration).not.toMatch(/update\s+public\.spokedu_master_payment_orders/i);
    expect(migration).not.toMatch(/update\s+public\.spokedu_master_subscriptions/i);
    expect(migration).not.toMatch(/update\s+public\.spokedu_master_entitlement_grants/i);
    expect(migration).not.toMatch(/http_post|net\.http|vault\.decrypted_secrets/i);
  });
});
