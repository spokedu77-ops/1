export type VatMode = 'auto' | 'none' | 'manual';
export type CenterType = 'regular' | 'short' | 'private' | 'etc';

export type SettlementRow = {
  id: string; kind: 'row' | 'section'; name: string; fee: string | number;
  sessions: string | number; total: string | number; inv: boolean; rcpt: boolean;
  rcptAmt: number | null; vatMode: VatMode; vatManual: number; cost: string | number;
  adj: number; note: string; invDate: string; rcptDate: string; whRate: number;
  centerId: string; dueDate: string; type: CenterType;
};

export type SettlementMonth = {
  key: string; label: string; rows: SettlementRow[]; rev: string;
  locked: boolean; lockedAt: string | null;
};

export type RateHistory = { id: string; from: string; instr: string | number; assist: string | number; rental: string | number; cost: string | number };
export type SettlementCenter = {
  id: string; name: string; type: CenterType; instr: string | number; assist: string | number;
  rental: string | number; fee: string | number; cost: string | number; sessions: string | number;
  vat: 'auto' | 'none'; whRate: number; status: 'active' | 'ended'; note: string; ord: number;
  rates: RateHistory[]; termType: 'end' | 'day' | 'days'; termValue: number; rev: string;
};
export type SettlementSettings = { vatMethod: 'sheet' | 'div11'; year: number };
export type SettlementSheetData = { months: Record<string, SettlementMonth>; centers: Record<string, SettlementCenter>; settings: SettlementSettings };

export const currentSeoulMonthKey = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : now.toISOString().slice(0, 7);
};

export const resolveDefaultSettlementMonth = (data: SettlementSheetData, selected: string, now = new Date()) => {
  if (selected && data.months[selected]) return selected;
  const todayKey = currentSeoulMonthKey(now);
  if (data.months[todayKey]) return todayKey;
  return Object.values(data.months).sort((a, b) => a.key.localeCompare(b.key)).at(-1)?.key ?? '';
};

export const uid = () => crypto.randomUUID();
export const emptyRow = (): SettlementRow => ({
  id: uid(), kind: 'row', name: '', fee: '', sessions: '', total: '', inv: false, rcpt: false,
  rcptAmt: null, vatMode: 'auto', vatManual: 0, cost: '', adj: 0, note: '', invDate: '',
  rcptDate: '', whRate: 0, centerId: '', dueDate: '', type: 'regular',
});

export function evaluateExpression(source: string | number, sessions: string | number): number | undefined {
  if (source === '' || source == null) return undefined;
  if (typeof source === 'number') return source;
  const expression = String(source).trim().replace(/^=/, '').replace(/,/g, '').replace(/원/g, '')
    .replace(/회기|C|N/g, `(${Number(sessions) || 0})`).replace(/[×xX]/g, '*');
  if (!expression) return undefined;
  if (!/^[0-9+\-*/().\s]+$/.test(expression)) return Number.NaN;
  try {
    // Only the numeric grammar above reaches the evaluator.
    const value = Function(`"use strict";return (${expression})`)() as number;
    return Number.isFinite(value) ? value : Number.NaN;
  } catch { return Number.NaN; }
}

export function calculateRow(row: SettlementRow, settings: SettlementSettings) {
  const fee = evaluateExpression(row.fee, row.sessions);
  const explicitTotal = row.total !== '' ? evaluateExpression(row.total, row.sessions) : undefined;
  const total = explicitTotal ?? ((fee || 0) * (Number(row.sessions) || 0));
  const cost = evaluateExpression(row.cost, row.sessions) || 0;
  const vat = row.vatMode === 'none' ? 0 : row.vatMode === 'manual' ? Number(row.vatManual) || 0
    : settings.vatMethod === 'div11' ? Math.round(total / 11) : total * (1 - 0.9091);
  const withholding = row.whRate > 0 ? Math.round((total - vat) * row.whRate / 100) : 0;
  const received = row.rcpt ? total : Math.min(Number(row.rcptAmt) || 0, total);
  const ratio = total > 0 ? received / total : 0;
  const net = total - vat - cost + (Number(row.adj) || 0);
  return { total, vat, cost, withholding, net, netAfterWh: net - withholding, received,
    outstanding: Math.max(0, total - received), netReceived: net * ratio, netAfterWhReceived: (net - withholding) * ratio,
    invalid: Number.isNaN(fee) || Number.isNaN(explicitTotal) };
}

export function summarize(rows: SettlementRow[], settings: SettlementSettings) {
  return rows.filter((row) => row.kind !== 'section').reduce((sum, row) => {
    const value = calculateRow(row, settings);
    if (!value.total && !value.cost) return sum;
    sum.total += value.total; sum.vat += value.vat; sum.cost += value.cost; sum.wh += value.withholding;
    sum.net += value.net; sum.netAfterWh += value.netAfterWh; sum.received += value.received;
    sum.receivedNet += value.netReceived; sum.receivedNetAfterWh += value.netAfterWhReceived; sum.count += 1;
    if (value.outstanding > 0) { sum.unpaid += 1; sum.unpaidAmount += value.outstanding; }
    if (!row.inv && row.vatMode !== 'none' && value.total > 0) sum.noInvoice += 1;
    return sum;
  }, { total: 0, vat: 0, cost: 0, wh: 0, net: 0, netAfterWh: 0, received: 0,
    receivedNet: 0, receivedNetAfterWh: 0, count: 0, unpaid: 0, unpaidAmount: 0, noInvoice: 0 });
}

export function centerFee(center: SettlementCenter) {
  const parts = [center.instr, center.assist, center.rental].map(Number).filter((value) => value > 0);
  return parts.length ? parts.join('+') : center.fee;
}
export function rateFor(center: SettlementCenter, monthKey: string): SettlementCenter {
  const rate = [...(center.rates ?? [])].sort((a, b) => b.from.localeCompare(a.from)).find((item) => item.from <= monthKey);
  return rate ? { ...center, instr: rate.instr, assist: rate.assist, rental: rate.rental, cost: rate.cost } : center;
}
export function dueDate(monthKey: string, center: SettlementCenter) {
  const [year, month] = monthKey.split('-').map(Number);
  const value = Number(center.termValue) || 0;
  const date = center.termType === 'day' ? new Date(year, month, value || 10)
    : center.termType === 'days' ? new Date(new Date(year, month, 0).getTime() + (value || 30) * 86400000)
      : new Date(year, month, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function rowFromCenter(center: SettlementCenter, monthKey: string): SettlementRow {
  const effective = rateFor(center, monthKey);
  return { ...emptyRow(), name: center.name, fee: centerFee(effective), cost: Number(effective.cost) ? `${effective.cost}*회기` : '',
    sessions: center.sessions, vatMode: center.vat, whRate: Number(center.whRate) || 0, centerId: center.id,
    dueDate: dueDate(monthKey, center), type: center.type };
}
export function carryOver(rows: SettlementRow[]) {
  return rows.map((row) => row.kind === 'section' ? { ...row, id: uid() } : { ...row, id: uid(), sessions: '', inv: false,
    rcpt: false, rcptAmt: null, total: '', adj: 0, note: '', invDate: '', rcptDate: '' })
    .filter((row) => row.kind === 'section' || row.fee !== '' || row.cost !== '');
}
