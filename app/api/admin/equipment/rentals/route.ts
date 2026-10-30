import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import type { EquipmentRentalRow } from '@/app/lib/equipment/types';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';
import { fetchLegacyInventory } from '@/app/lib/equipment/legacyReads';

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

  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
