import { NextResponse } from 'next/server';
import { GET as readSettlement } from '../settlement-sheet/route';
import { resolveDefaultSettlementMonth, summarize, type SettlementSheetData } from '@/app/admin/master/reports/settlementSheetCore';

/** Reuses the sheet's MASTER-only boundary and arithmetic; no second financial source. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.search = '?scope=sheet';
  const response = await readSettlement(new Request(url, { headers: request.headers }));
  if (!response.ok) return response;
  const data = await response.json() as SettlementSheetData;
  const key = resolveDefaultSettlementMonth(data, '');
  const month = data.months[key];
  const summary = month ? summarize(month.rows, data.settings) : null;
  if (summary && !Object.values(summary).every(Number.isFinite)) return NextResponse.json({ error: '정산 금액의 계산식을 확인해 주세요.' }, { status: 422, headers: { 'Cache-Control': 'private, no-store' } });
  return NextResponse.json({ month: month ? { key, label: month.label, locked: month.locked } : null,
    summary }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
