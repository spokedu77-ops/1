import { describe, expect, it } from 'vitest';
import { calculateRow, carryOver, emptyRow, rateFor, rowFromCenter, summarize, type SettlementCenter } from './settlementSheetCore';

const settings = { vatMethod: 'div11' as const, year: 2026 };
const center: SettlementCenter = {
  id: 'center-1', name: '스포키듀 센터', type: 'regular', instr: 100000, assist: 20000,
  rental: 10000, fee: '', cost: 5000, sessions: 4, vat: 'auto', whRate: 3.3,
  status: 'active', note: '', ord: 1, termType: 'day', termValue: 10, rev: '',
  rates: [{ id: 'rate-1', from: '2026-07', instr: 120000, assist: 20000, rental: 10000, cost: 6000 }],
};

describe('settlement sheet calculation contract', () => {
  it('keeps formula, VAT, expense, withholding, partial receipt, and adjustment semantics', () => {
    const row = { ...emptyRow(), fee: '100000+20000', sessions: 4, cost: '5000*회기', whRate: 3.3,
      rcptAmt: 240000, adj: 10000 };
    const result = calculateRow(row, settings);
    expect(result.total).toBe(480000);
    expect(result.vat).toBe(43636);
    expect(result.cost).toBe(20000);
    expect(result.net).toBe(426364);
    expect(result.received).toBe(240000);
    expect(result.outstanding).toBe(240000);
    expect(result.withholding).toBe(Math.round((480000 - 43636) * 0.033));
  });

  it('resets settlement evidence while carrying reusable row inputs to a new month', () => {
    const source = { ...emptyRow(), fee: 100000, sessions: 5, inv: true, rcpt: true, total: 500000, adj: 5000,
      note: '완료', invDate: '2026-09-01', rcptDate: '2026-09-03', rcptAmt: 100000 };
    const [next] = carryOver([source]);
    expect(next.id).not.toBe(source.id);
    expect(next.sessions).toBe('');
    expect(next.inv).toBe(false);
    expect(next.rcpt).toBe(false);
    expect(next.total).toBe('');
    expect(next.note).toBe('');
  });

  it('uses the latest applicable rate snapshot without rewriting older months', () => {
    expect(rateFor(center, '2026-06').instr).toBe(100000);
    expect(rateFor(center, '2026-07').instr).toBe(120000);
    expect(rowFromCenter(center, '2026-08').fee).toBe('120000+20000+10000');
  });

  it('excludes section rows from totals', () => {
    const section = { ...emptyRow(), kind: 'section' as const, total: 999999 };
    const value = { ...emptyRow(), total: 110000, vatMode: 'auto' as const };
    expect(summarize([section, value], settings).total).toBe(110000);
  });
});
