import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { fetchEquipmentStock } from '@/app/lib/equipment/fetchStock';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';
import { fetchLegacyCatalog } from '@/app/lib/equipment/legacyReads';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    if (!isLedgerWriteMode()) {
      const catalogItems = await fetchLegacyCatalog(getServiceSupabase());
      return NextResponse.json(
        { items: [], catalog_items: catalogItems, data_source: 'legacy', capabilities: { ledger_writes: false } },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      );
    }
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
