import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import type { EquipmentRentalRow } from '@/app/lib/equipment/types';
import { isEquipmentLedgerSchemaReady } from '@/app/lib/equipment/schemaReady';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';
import { fetchLegacyCatalog, fetchLegacyInventory, fetchEquipmentLegacyImportStatus } from '@/app/lib/equipment/legacyReads';
import {
  applyPlanToLegacyImportStatus,
  ensureLegacyImportSnapshot,
  teacherMappedLegacyPreview,
  teacherPendingLegacyItems,
} from '@/app/lib/equipment/legacyImportSync';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const teacherId = params.get('teacher_id');
  const catalogId = params.get('catalog_id');
  const activeOnly = params.get('active') !== 'false';

  const service = getServiceSupabase();
  if (!isLedgerWriteMode()) {
    if (catalogId) {
      return NextResponse.json({ error: '기존 보유 내역에는 교구 ID 연결이 없습니다.' }, { status: 400 });
    }
    try {
      const inventoryItems = await fetchLegacyInventory(service, teacherId ?? undefined);
      return NextResponse.json({ items: [], inventory_items: inventoryItems, data_source: 'legacy' },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
    } catch {
      return NextResponse.json({ error: '보유 내역을 불러오지 못했습니다.' }, { status: 500 });
    }
  }
  if (!(await isEquipmentLedgerSchemaReady(service))) {
    if (catalogId) {
      return NextResponse.json({ error: '원장 전환 전에는 교구별 대여 집계를 조회할 수 없습니다.' }, { status: 400 });
    }
    try {
      const inventoryItems = await fetchLegacyInventory(service, teacherId ?? undefined);
      return NextResponse.json(
        { items: [], inventory_items: inventoryItems, data_source: 'legacy', warning: 'EQUIPMENT_LEDGER_SCHEMA_NOT_READY' },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      );
    } catch {
      return NextResponse.json({ error: '보유 내역을 불러오지 못했습니다.' }, { status: 500 });
    }
  }
  let query = service
    .from('equipment_rentals')
    .select(
      'rental_id, catalog_id, teacher_id, qty_lent, qty_returned, qty_outstanding, status, opened_at, closed_at, catalog:catalog_id(name), teacher:teacher_id(name)',
    )
    .order('opened_at', { ascending: false })
    .limit(500);

  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (catalogId) query = query.eq('catalog_id', Number(catalogId));
  if (activeOnly) query = query.eq('status', 'active').gt('qty_outstanding', 0);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: '대여 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  const items: EquipmentRentalRow[] = (data ?? []).map((row) => {
    const catalogJoin = row.catalog as { name?: string } | { name?: string }[] | null;
    const teacherJoin = row.teacher as { name?: string } | { name?: string }[] | null;
    return {
      rental_id: row.rental_id,
      catalog_id: row.catalog_id,
      teacher_id: row.teacher_id,
      catalog_name: (Array.isArray(catalogJoin) ? catalogJoin[0]?.name : catalogJoin?.name) ?? null,
      teacher_name: (Array.isArray(teacherJoin) ? teacherJoin[0]?.name : teacherJoin?.name) ?? null,
      qty_lent: row.qty_lent,
      qty_returned: row.qty_returned,
      qty_outstanding: row.qty_outstanding,
      status: row.status as 'active' | 'closed',
      opened_at: row.opened_at,
      closed_at: row.closed_at,
    };
  });

  const sync = await ensureLegacyImportSnapshot(service);
  let legacy = await fetchEquipmentLegacyImportStatus(service, teacherId ?? undefined);
  legacy = applyPlanToLegacyImportStatus(legacy, sync.plan);

  let inventory_items = catalogId ? [] : legacy.unmigrated_items;
  let legacy_confirmed_preview: { catalog_id: number; name: string; quantity: number }[] = [];
  if (teacherId && !catalogId) {
    const catalog = await fetchLegacyCatalog(service);
    const names = new Map(catalog.map((c) => [c.catalog_id, c.name]));
    const activeCatalogIds = new Set(items.map((i) => i.catalog_id));
    legacy_confirmed_preview = teacherMappedLegacyPreview(sync.plan, teacherId, names).filter(
      (p) => !activeCatalogIds.has(p.catalog_id),
    );
    inventory_items = teacherPendingLegacyItems(sync.plan, teacherId);
  }

  return NextResponse.json(
    {
      items,
      inventory_items,
      legacy_confirmed_preview,
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
