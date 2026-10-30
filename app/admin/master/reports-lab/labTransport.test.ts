import { describe, expect, it, vi } from 'vitest';
import { createLabTransport } from './labTransport';
import { emptyRow, summarize, type SettlementSheetData, type SettlementCenter } from '../reports/settlementSheetCore';

const uuid = '11111111-1111-4111-8111-111111111111';
export function fixture(): SettlementSheetData {
  return { months: { '2026-10': { key: '2026-10', label: '10월', rows: [{ ...emptyRow(), id: 'r1', name: '센터', fee: 100000, cost: 40000, sessions: 4 }], rev: 'm1', locked: false, lockedAt: null } }, centers: {
    p1: { id: 'p1', name: '센터', fee: 100000, instr: 60000, assist: 30000, rental: 10000, cost: 40000, sessions: 4, rates: [], type: 'regular', vat: 'auto', whRate: 0, status: 'active', ord: 1, note: '', rev: 'p1', termType: 'end', termValue: 0 },
  }, settings: { vatMethod: 'sheet', year: 2026 } };
}
const put = (kind: string, value: unknown, extra = {}) => ({ method: 'PUT', body: JSON.stringify({ kind, value, ...extra }) });
describe('isolated settlement LAB transport', () => {
  it('does not use the network, even when writing; rejects production path', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network forbidden'));
    try {
      const transport = createLabTransport(fixture(), true, [uuid]);
      expect((await transport.request('/api/admin/settlement-sheet', put('settings', {}))).status).toBe(403);
      expect((await transport.request('/api/admin/settlement-lab', put('settings', { vatMethod: 'div11', year: 2026 }))).status).toBe(200);
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
  it('starts read-only and preserves the baseline under every write verb', async () => {
    const data = fixture(); const original = structuredClone(data); const transport = createLabTransport(data, false, [uuid]);
    for (const method of ['PUT', 'DELETE', 'POST', 'PATCH']) expect((await transport.request('/api/admin/settlement-lab?kind=month&id=2026-10', { method })).status).toBe(423);
    expect(data).toEqual(original); expect(transport.snapshot()).toEqual(original);
  });
  it('starts with identical calculations and compares edited total without changing original', async () => {
    const data = fixture(); const original = structuredClone(data); const changed = vi.fn(); const lab = createLabTransport(data, true, [uuid], changed);
    expect(summarize(lab.snapshot().months['2026-10'].rows, data.settings)).toEqual(summarize(data.months['2026-10'].rows, data.settings));
    const next = structuredClone(data.months['2026-10']); next.rows[0].sessions = 5;
    expect((await lab.request('/api/admin/settlement-lab', put('month', next, { expectedRevision: 'm1' }))).status).toBe(200);
    expect(summarize(lab.snapshot().months['2026-10'].rows, data.settings).total).toBe(500000);
    expect(summarize(data.months['2026-10'].rows, data.settings).total).toBe(400000);
    expect(changed).toHaveBeenCalledOnce(); expect(data).toEqual(original);
    expect((await lab.request('/api/admin/settlement-lab', put('month', next, { expectedRevision: 'm1' }))).status).toBe(409);
  });
  it('validates UUID and existence; permits 1:N without rewriting money or month rows', async () => {
    const data = fixture(); const lab = createLabTransport(data, true, [uuid]);
    expect((await lab.request('/api/admin/settlement-lab', put('center', { ...data.centers.p1, center_id: 'invalid' }))).status).toBe(400);
    expect((await lab.request('/api/admin/settlement-lab', put('center', { ...data.centers.p1, center_id: '22222222-2222-4222-8222-222222222222' }))).status).toBe(400);
    for (const policy of [data.centers.p1, { ...data.centers.p1, id: 'p2', rev: '' }]) expect((await lab.request('/api/admin/settlement-lab', put('center', { ...policy, center_id: uuid }))).status).toBe(200);
    expect(Object.values(lab.snapshot().centers).map((p) => p.center_id)).toEqual([uuid, uuid]);
    expect(lab.snapshot().months).toEqual(data.months);
    expect(lab.snapshot().centers.p1).toMatchObject({ fee: 100000, instr: 60000, rental: 10000 });
    const saved = lab.snapshot().centers.p1;
    expect((await lab.request('/api/admin/settlement-lab', put('center', { ...saved, center_id: null }))).status).toBe(200);
    expect(lab.snapshot().centers.p1.center_id).toBeNull();
  });
  it('protects locked months, restore and delete; permits exact unlock', async () => {
    const data = fixture(); data.months['2026-10'].locked = true; const lab = createLabTransport(data, true, []);
    expect((await lab.request('/api/admin/settlement-lab', put('month', { ...data.months['2026-10'], rows: [] }, { expectedRevision: 'm1' }))).status).toBe(423);
    expect((await lab.request('/api/admin/settlement-lab?kind=month&id=2026-10', { method: 'DELETE' })).status).toBe(423);
    expect((await lab.request('/api/admin/settlement-lab', put('restore', fixture()))).status).toBe(423);
    expect((await lab.request('/api/admin/settlement-lab', put('month', { ...data.months['2026-10'], locked: false }, { expectedRevision: 'm1' }))).status).toBe(200);
  });
  it('restores only in the isolated environment and rejects invalid backup month keys', async () => {
    const lab = createLabTransport(fixture(), true, []); const next = fixture(); next.months['invalid'] = next.months['2026-10'];
    expect((await lab.request('/api/admin/settlement-lab', put('restore', next))).status).toBe(400);
    expect((await lab.request('/api/admin/settlement-lab', put('restore', { months: {}, centers: {}, settings: { year: 2026, vatMethod: 'sheet' } }))).status).toBe(200);
    expect(lab.snapshot().months).toEqual({}); expect(fixture().months).toHaveProperty('2026-10');
  });
  it('returns defensive copies so consumers cannot mutate the baseline or another workspace', async () => {
    const data = fixture(); const a = createLabTransport(data, true, []); const b = createLabTransport(data, true, []);
    const copy = a.snapshot(); (copy.centers.p1 as SettlementCenter).fee = 1;
    expect(a.snapshot().centers.p1.fee).toBe(100000); expect(b.snapshot()).toEqual(data);
  });
});
