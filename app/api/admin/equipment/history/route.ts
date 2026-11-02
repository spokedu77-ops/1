import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import type { EquipmentLedgerRow } from '@/app/lib/equipment/types';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';
import { isEquipmentLedgerSchemaReady } from '@/app/lib/equipment/schemaReady';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const catalogId = params.get('catalog_id');
  const teacherId = params.get('teacher_id');
  const limit = Math.min(200, Math.max(1, Number(params.get('limit') ?? 50) || 50));
  const offset = Math.max(0, Number(params.get('offset') ?? 0) || 0);

  const service = getServiceSupabase();
  if (!isLedgerWriteMode()) {
    if (catalogId) {
      return NextResponse.json({ error: '기존 이력에는 교구 ID 연결이 없습니다.' }, { status: 400 });
    }
    let legacyQuery = service.from('inventory_logs')
      .select('id, user_id, content, type, created_at')
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (teacherId) legacyQuery = legacyQuery.eq('user_id', teacherId);
    const { data, error } = await legacyQuery;
    if (error) return NextResponse.json({ error: '이력을 불러오지 못했습니다.' }, { status: 500 });
    return NextResponse.json({ items: [], history_items: data ?? [], data_source: 'legacy' },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  }
  if (!(await isEquipmentLedgerSchemaReady(service))) {
    if (catalogId) {
      return NextResponse.json({ error: '원장 전환 전에는 교구별 이력을 조회할 수 없습니다.' }, { status: 400 });
    }
    let legacyQuery = service
      .from('inventory_logs')
      .select('id, user_id, content, type, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (teacherId) legacyQuery = legacyQuery.eq('user_id', teacherId);
    const { data, error } = await legacyQuery;
    if (error) return NextResponse.json({ error: '이력을 불러오지 못했습니다.' }, { status: 500 });
    return NextResponse.json(
      { items: [], history_items: data ?? [], data_source: 'legacy', warning: 'EQUIPMENT_LEDGER_SCHEMA_NOT_READY' },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  }
  let query = service
    .from('equipment_ledger')
    .select(
      'ledger_id, event_type, catalog_id, teacher_id, rental_id, qty, note, occurred_at, metadata, created_by, catalog:catalog_id(name), teacher:teacher_id(name)',
    )
    .in('event_type', ['RENT', 'RETURN'])
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (catalogId) query = query.eq('catalog_id', Number(catalogId));
  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: '이력을 불러오지 못했습니다.' }, { status: 500 });
  }

  const creatorIds = [
    ...new Set(
      (data ?? [])
        .map((row) => row.created_by as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const creatorNames = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: creators } = await service.from('users').select('id, name').in('id', creatorIds);
    for (const user of creators ?? []) {
      if (user.id && user.name) creatorNames.set(user.id, user.name);
    }
  }

  const items: EquipmentLedgerRow[] = (data ?? [])
    .filter((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      if (meta.source === 'LEGACY_INVENTORY_SNAPSHOT') return false;
      if (row.event_type === 'RENT' && String(row.note ?? '').includes('스냅샷 이관')) return false;
      return true;
    })
    .map((row) => {
    const catalogJoin = row.catalog as { name?: string } | { name?: string }[] | null;
    const teacherJoin = row.teacher as { name?: string } | { name?: string }[] | null;
    const catalogName = Array.isArray(catalogJoin) ? catalogJoin[0]?.name : catalogJoin?.name;
    const teacherName = Array.isArray(teacherJoin) ? teacherJoin[0]?.name : teacherJoin?.name;
    const createdBy = (row.created_by as string | null) ?? null;
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
      created_by: createdBy,
      created_by_name: createdBy ? creatorNames.get(createdBy) ?? null : null,
    };
  });

  return NextResponse.json(
    { items, data_source: 'ledger' as const },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
