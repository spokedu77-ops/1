import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import type { EquipmentLedgerRow } from '@/app/lib/equipment/types';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const catalogId = params.get('catalog_id');
  const teacherId = params.get('teacher_id');
  const limit = Math.min(200, Math.max(1, Number(params.get('limit') ?? 50) || 50));
  const offset = Math.max(0, Number(params.get('offset') ?? 0) || 0);

  const service = getServiceSupabase();
  let query = service
    .from('equipment_ledger')
    .select(
      'ledger_id, event_type, catalog_id, teacher_id, rental_id, qty, note, occurred_at, metadata, catalog:catalog_id(name), teacher:teacher_id(name)',
    )
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (catalogId) query = query.eq('catalog_id', Number(catalogId));
  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: '이력을 불러오지 못했습니다.' }, { status: 500 });
  }

  const items: EquipmentLedgerRow[] = (data ?? []).map((row) => {
    const catalogJoin = row.catalog as { name?: string } | { name?: string }[] | null;
    const teacherJoin = row.teacher as { name?: string } | { name?: string }[] | null;
    const catalogName = Array.isArray(catalogJoin) ? catalogJoin[0]?.name : catalogJoin?.name;
    const teacherName = Array.isArray(teacherJoin) ? teacherJoin[0]?.name : teacherJoin?.name;
    return {
      ledger_id: row.ledger_id,
      event_type: row.event_type,
      catalog_id: row.catalog_id,
      catalog_name: catalogName ?? null,
      teacher_id: row.teacher_id,
      teacher_name: teacherName ?? null,
      rental_id: row.rental_id,
      qty: row.qty,
      note: row.note,
      occurred_at: row.occurred_at,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
    };
  });

  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
