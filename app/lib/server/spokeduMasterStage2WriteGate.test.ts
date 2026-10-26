import { describe, expect, it } from 'vitest';
import { isStage2WriteGateError, stage2WriteGateResponse } from './spokeduMasterStage2WriteGate';

describe('Stage 2 cutover write gate', () => {
  it('recognizes only the dedicated lock error', () => {
    expect(isStage2WriteGateError({ code: '55P03', message: 'stage2_cutover_write_gate_active' })).toBe(true);
    expect(isStage2WriteGateError({ code: '55P03', message: 'other lock error' })).toBe(false);
    expect(isStage2WriteGateError({ code: '40001', message: 'stage2_cutover_write_gate_active' })).toBe(false);
  });

  it('returns an explicit retryable 503 response', async () => {
    const response = stage2WriteGateResponse();
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
    await expect(response.json()).resolves.toMatchObject({
      code: 'STAGE2_CUTOVER_WRITE_GATE',
      retryable: true,
    });
  });
});
