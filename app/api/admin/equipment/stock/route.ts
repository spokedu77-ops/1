import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { fetchEquipmentStock } from '@/app/lib/equipment/fetchStock';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const items = await fetchEquipmentStock(getServiceSupabase());
    return NextResponse.json(
      {
        items,
        capabilities: {
          ledger_writes: isLedgerWriteMode(),
        },
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json({ error: '교구 재고를 불러오지 못했습니다.' }, { status: 500 });
  }
}
