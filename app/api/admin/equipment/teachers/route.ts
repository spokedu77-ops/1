import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';
import {
  fetchEquipmentLegacyImportStatus,
  fetchLegacyCatalog,
  fetchLegacyInventory,
} from '@/app/lib/equipment/legacyReads';
import {
  loadLegacyImportPlanForRead,
  teacherMappedLegacyPreview,
  teacherPendingLegacyItems,
} from '@/app/lib/equipment/legacyImportSync';
import { isEquipmentLedgerSchemaReady } from '@/app/lib/equipment/schemaReady';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const service = getServiceSupabase();

  const { data: teachers, error: tErr } = await service
    .from('users')
    .select('id, name, role, is_active, is_admin')
    .eq('is_active', true)
    .eq('role', 'teacher')
    .eq('is_admin', false)
    .order('name');
  if (tErr) {
    return NextResponse.json({ error: '강사 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  if (!isLedgerWriteMode()) {
    try {
      const inventory = await fetchLegacyInventory(service);
      const totals = new Map<string, { item_count: number; total_held: number }>();
      for (const row of inventory) {
        const total = totals.get(row.user_id) ?? { item_count: 0, total_held: 0 };
        total.item_count += 1;
        total.total_held += Number(row.quantity) || 0;
        totals.set(row.user_id, total);
      }
      return NextResponse.json({
        data_source: 'legacy',
        items: (teachers ?? []).map((teacher) => ({
          id: teacher.id, name: teacher.name, role: teacher.role,
          inventory_item_count: totals.get(teacher.id)?.item_count ?? 0,
          inventory_total_held: totals.get(teacher.id)?.total_held ?? 0,
        })),
      }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
    } catch {
      return NextResponse.json({ error: '보유 내역을 불러오지 못했습니다.' }, { status: 500 });
    }
  }

  const schemaReady = await isEquipmentLedgerSchemaReady(service);
  if (!schemaReady) {
    try {
      const inventory = await fetchLegacyInventory(service);
      const totals = new Map<string, { item_count: number; total_held: number }>();
      for (const row of inventory) {
        const total = totals.get(row.user_id) ?? { item_count: 0, total_held: 0 };
        total.item_count += 1;
        total.total_held += Number(row.quantity) || 0;
        totals.set(row.user_id, total);
      }
      return NextResponse.json(
        {
          data_source: 'legacy',
          items: (teachers ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            role: t.role,
            inventory_item_count: totals.get(t.id)?.item_count ?? 0,
            inventory_total_held: totals.get(t.id)?.total_held ?? 0,
          })),
          warning: 'EQUIPMENT_LEDGER_SCHEMA_NOT_READY',
        },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      );
    } catch {
      return NextResponse.json({ error: '보유 내역을 불러오지 못했습니다.' }, { status: 500 });
    }
  }

  const { data: holdings, error: hErr } = await service
    .from('teacher_equipment_holdings_v')
    .select('teacher_id, catalog_id, name, qty_held, active_rental_lines');
  if (hErr) {
    return NextResponse.json({ error: '보유 집계를 불러오지 못했습니다.' }, { status: 500 });
  }

  const byTeacher = new Map<string, { sku_count: number; total_held: number; lines: number }>();
  for (const row of holdings ?? []) {
    const id = String(row.teacher_id);
    const cur = byTeacher.get(id) ?? { sku_count: 0, total_held: 0, lines: 0 };
    cur.sku_count += 1;
    cur.total_held += Number(row.qty_held) || 0;
    cur.lines += Number(row.active_rental_lines) || 0;
    byTeacher.set(id, cur);
  }

  const activeCatalogByTeacher = new Map<string, Set<number>>();
  const { data: activeRentals, error: arErr } = await service
    .from('equipment_rentals')
    .select('teacher_id, catalog_id')
    .eq('status', 'active')
    .gt('qty_outstanding', 0);
  if (arErr) {
    return NextResponse.json({ error: '대여 집계를 불러오지 못했습니다.' }, { status: 500 });
  }
  for (const row of activeRentals ?? []) {
    const id = String(row.teacher_id);
    const set = activeCatalogByTeacher.get(id) ?? new Set<number>();
    set.add(row.catalog_id);
    activeCatalogByTeacher.set(id, set);
  }

  try {
    const sync = await loadLegacyImportPlanForRead(service);
    const catalog = await fetchLegacyCatalog(service);
    const catalogNames = new Map(catalog.map((c) => [c.catalog_id, c.name]));
    const legacy = await fetchEquipmentLegacyImportStatus(service);
    const unmigratedIds = new Set(legacy.unmigrated_items.map((row) => Number(row.id)));
    const unimportedPlan = {
      ...sync.plan,
      rows: sync.plan.rows.filter((row) => unmigratedIds.has(row.inventory_id)),
    };
    for (const teacher of teachers ?? []) {
      const cur = byTeacher.get(teacher.id) ?? { sku_count: 0, total_held: 0, lines: 0 };

      for (const item of teacherPendingLegacyItems(unimportedPlan, teacher.id)) {
        cur.sku_count += 1;
        cur.total_held += Number(item.quantity) || 0;
      }

      for (const p of teacherMappedLegacyPreview(unimportedPlan, teacher.id, catalogNames).filter(
        (row) => !activeCatalogByTeacher.get(teacher.id)?.has(row.catalog_id),
      )) {
        cur.sku_count += 1;
        cur.total_held += Number(p.quantity) || 0;
      }

      byTeacher.set(teacher.id, cur);
    }
  } catch {
    try {
      const legacy = await fetchEquipmentLegacyImportStatus(service);
      for (const row of legacy.unmigrated_items) {
        const cur = byTeacher.get(row.user_id) ?? { sku_count: 0, total_held: 0, lines: 0 };
        cur.sku_count += 1;
        cur.total_held += Number(row.quantity) || 0;
        byTeacher.set(row.user_id, cur);
      }
    } catch {
      return NextResponse.json({ error: '기존 보유 집계를 불러오지 못했습니다.' }, { status: 500 });
    }
  }

  const items = (teachers ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    role: t.role,
    ledger_sku_count: byTeacher.get(t.id)?.sku_count ?? 0,
    ledger_total_held: byTeacher.get(t.id)?.total_held ?? 0,
    ledger_active_lines: byTeacher.get(t.id)?.lines ?? 0,
  }));

  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
