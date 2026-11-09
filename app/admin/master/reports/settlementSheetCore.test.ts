import { describe, expect, it } from 'vitest';
import { calculateRow, carryOver, emptyRow, rateFor, rowFromCenter, rowsFromRecurringCenters, summarize, type SettlementCenter } from './settlementSheetCore';
import { DEFAULT_CENTER_SETTLEMENT } from '@/app/lib/centers/settlementDefaults';

const settings = { vatMethod: 'div11' as const, year: 2026 };
const center: SettlementCenter = {
  id: 'center-1', name: '스포키듀 센터', type: 'regular', instr: 100000, assist: 20000,
  rental: 10000, fee: '', cost: 5000, sessions: 4, vat: 'auto', whRate: 3.3,
  status: 'active', note: '', ord: 1, termType: 'day', termValue: 10, rev: '',
  rates: [{ id: 'rate-1', from: '2026-07', instr: 120000, assist: 20000, rental: 10000, cost: 6000 }],
};

describe('settlement sheet calculation contract', () => {
  it.each(['sheet', 'div11'] as const)('calculates exact included VAT for persisted %s settings', (vatMethod) => {
    const row = { ...emptyRow(), fee: 99000, sessions: 3 };
    const selectedSettings = { vatMethod, year: 2026 };
    expect(calculateRow(row, selectedSettings)).toMatchObject({ total: 297000, vat: 27000, net: 270000 });
    expect(calculateRow({ ...row, vatMode: 'none' }, selectedSettings).vat).toBe(0);
    expect(calculateRow({ ...row, vatMode: 'manual', vatManual: 12345 }, selectedSettings).vat).toBe(12345);
  });

  it('creates new monthly rows from current DB classifications and terms with no settlement evidence', () => {
    const source = { id: 'operational-1', name: '새 정기 센터', defaults: { ...DEFAULT_CENTER_SETTLEMENT },
      sessionFee: 120000, mainFee: 40000, assistFee: 20000 };
    const rows = rowsFromRecurringCenters([source,
      { ...source, id: 'short', defaults: { ...source.defaults, type: 'short' } },
      { ...source, id: 'etc', defaults: { ...source.defaults, type: 'etc' } },
    ], '2026-12');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ operationalCenterId: source.id, name: source.name, type: 'regular',
      fee: 120000, cost: '60000*회기', dueDate: '2026-12-31', sessions: '', total: '',
      inv: false, rcpt: false, rcptAmt: null, invDate: '', rcptDate: '' });
  });

  it('keeps missing DB prices blank rather than inventing zero amounts', () => {
    const [row] = rowsFromRecurringCenters([{ id: 'missing', name: '단가 미설정', defaults: DEFAULT_CENTER_SETTLEMENT,
      sessionFee: null, mainFee: null, assistFee: 0 }], '2026-12');
    expect(row.fee).toBe('');
    expect(row.cost).toBe('');
  });

  it('calculates VAT, expense, withholding and partial receipt while ignoring legacy adjustments', () => {
    const row = { ...emptyRow(), fee: '100000+20000', sessions: 4, cost: '5000*회기', whRate: 3.3,
      rcptAmt: 240000, adj: 10000 };
    const result = calculateRow(row, settings);
    expect(result.total).toBe(480000);
    expect(result.vat).toBe(43636);
    expect(result.cost).toBe(20000);
    expect(result.net).toBe(416364);
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

  it('deducts manual VAT from net and reports the outstanding share as expected net profit', () => {
    const row = { ...emptyRow(), total: 1463000, vatMode: 'manual' as const, vatManual: 146300,
      rcptAmt: 0, cost: 0, adj: 0 };
    const result = summarize([row], settings);
    expect(result.netAfterWh).toBe(1316700);
    expect(result.outstandingNetAfterWh).toBe(1316700);
  });

  it('sums the same rounded VAT and net amounts shown in each row', () => {
    const sheetSettings = { vatMethod: 'sheet' as const, year: 2026 };
    const rows = [
      { ...emptyRow(), total: 680000, vatMode: 'auto' as const },
      { ...emptyRow(), total: 780000, vatMode: 'auto' as const },
    ];
    const result = summarize(rows, sheetSettings);
    expect(result.vat).toBe(rows.reduce((sum, row) => sum + calculateRow(row, sheetSettings).vat, 0));
    expect(result.net).toBe(result.total - result.vat - result.cost);
  });
});
