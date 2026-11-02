import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { fetchEquipmentCapabilities } from '@/app/lib/equipment/capabilities';
import { fetchEquipmentStock } from '@/app/lib/equipment/fetchStock';
import { fetchLegacyCatalog, legacyCatalogToStockPreviewRows } from '@/app/lib/equipment/legacyReads';
import type { EquipmentInventoryConnectionState } from '@/app/lib/equipment/inventoryConnectionState';
import { isEquipmentLedgerSchemaReady } from '@/app/lib/equipment/schemaReady';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';

function connectionState(
  ledgerWrites: boolean,
  schemaReady: boolean,
  dataSource: 'legacy' | 'ledger',
): EquipmentInventoryConnectionState {
  if (!ledgerWrites) return 'MODE_MISMATCH';
  if (!schemaReady) return 'SCHEMA_MISSING';
  if (dataSource === 'ledger') return 'LEDGER_READY';
  return 'MODE_MISMATCH';
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const service = getServiceSupabase();
  try {
    const capabilities = await fetchEquipmentCapabilities(service);
    if (!isLedgerWriteMode()) {
      const caps = { ...capabilities, ledger_schema_ready: false as const };
      return NextResponse.json(
        {
          items: [],
          data_source: 'legacy',
          capabilities: caps,
          connection_state: connectionState(false, false, 'legacy'),
        },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      );
    }
    const schemaReady = await isEquipmentLedgerSchemaReady(service);
    if (!schemaReady) {
      const caps = { ...capabilities, ledger_schema_ready: false as const };
      const catalog = await fetchLegacyCatalog(service);
      const items = legacyCatalogToStockPreviewRows(catalog);
      return NextResponse.json(
        {
          items,
          data_source: 'legacy_catalog',
          capabilities: caps,
          connection_state: connectionState(true, false, 'legacy'),
          warning: 'EQUIPMENT_LEDGER_SCHEMA_NOT_READY',
        },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      );
    }
    const items = await fetchEquipmentStock(service);
    return NextResponse.json(
      {
        items,
        data_source: 'ledger',
        capabilities: { ...capabilities, ledger_schema_ready: true as const },
        connection_state: connectionState(true, true, 'ledger'),
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json({ error: '교구 재고를 불러오지 못했습니다.' }, { status: 500 });
  }
}
