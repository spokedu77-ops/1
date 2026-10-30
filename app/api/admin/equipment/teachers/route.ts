import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const service = getServiceSupabase();

  const { data: teachers, error: tErr } = await service
    .from('users')
    .select('id, name, role, is_active')
    .eq('is_active', true)
    .in('role', ['teacher', 'admin'])
    .order('name');
  if (tErr) {
    return NextResponse.json({ error: '강사 목록을 불러오지 못했습니다.' }, { status: 500 });
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
