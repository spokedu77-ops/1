import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { completeSessionWithCapture, SessionCompletionAfterCaptureError } from './sessionCompletionConsistency';

function fixture() {
  const captures = new Map<string, { note: string }>();
  let status: 'active' | 'completed' = 'active';
  let failCompletion = false;
  const saveCapture = vi.fn(async () => {
    captures.set('session-1', { note: '다음 시간에 이어가기' });
    return true;
  });
  const completeSession = vi.fn(async () => {
    if (failCompletion) throw new Error('forced completion failure');
    status = 'completed';
    return { id: 'session-1', status };
  });
  return {
    captures,
    completeSession,
    saveCapture,
    failNextCompletion() { failCompletion = true; },
    allowCompletion() { failCompletion = false; },
    reload() { return { capture: captures.get('session-1') ?? null, status }; },
  };
}

describe('session completion consistency fault injection', () => {
  it('uses the production capture uniqueness and upsert contract', () => {
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260827120000_spokedu_master_session_capture.sql'), 'utf8');
    expect(migration).toContain('spokedu_master_class_records_owner_session_unique');
    expect(migration).toContain('on conflict (owner_id, session_id)');
    expect(migration).toContain('do update set application_idea = excluded.application_idea');
  });

  it('completes only after capture save succeeds', async () => {
    const qa = fixture();
    await expect(completeSessionWithCapture({ saveCapture: qa.saveCapture, completeSession: qa.completeSession }))
      .resolves.toMatchObject({ status: 'completed' });
    expect(qa.saveCapture.mock.invocationCallOrder[0]).toBeLessThan(qa.completeSession.mock.invocationCallOrder[0]);
    expect(qa.reload()).toEqual({ capture: { note: '다음 시간에 이어가기' }, status: 'completed' });
  });

  it('reports recoverable partial persistence without false completion success', async () => {
    const qa = fixture();
    qa.failNextCompletion();
    await expect(completeSessionWithCapture({ saveCapture: qa.saveCapture, completeSession: qa.completeSession }))
      .rejects.toBeInstanceOf(SessionCompletionAfterCaptureError);
    expect(qa.reload()).toEqual({ capture: { note: '다음 시간에 이어가기' }, status: 'active' });
  });

  it('retries idempotently without creating a duplicate capture', async () => {
    const qa = fixture();
    qa.failNextCompletion();
    await expect(completeSessionWithCapture({ saveCapture: qa.saveCapture, completeSession: qa.completeSession })).rejects.toThrow();
    qa.allowCompletion();
    await expect(completeSessionWithCapture({ saveCapture: qa.saveCapture, completeSession: qa.completeSession }))
      .resolves.toMatchObject({ status: 'completed' });
    expect(qa.saveCapture).toHaveBeenCalledTimes(2);
    expect(qa.captures.size).toBe(1);
    expect(qa.reload()).toEqual({ capture: { note: '다음 시간에 이어가기' }, status: 'completed' });
  });
});
