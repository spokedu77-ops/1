import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { requireTeacherMaterialsAccess } from '@/app/lib/server/teacherAuth';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';

export async function GET() {
  const auth = await requireTeacherMaterialsAccess();
  if (!auth.ok) return auth.response;

  if (!isLedgerWriteMode()) {
    return NextResponse.json(
      { mode: 'legacy' as const },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  }

  const service = getServiceSupabase();
  const { data: rows, error: hErr } = await service
    .from('teacher_equipment_holdings_v')
    .select('catalog_id, name, category, image, qty_held, earliest_opened_at, mgmt_code')
    .eq('teacher_id', auth.userId);
  if (hErr) {
    return NextResponse.json({ error: '보유 교구를 불러오지 못했습니다.' }, { status: 500 });
  }

  const catalogIds = [...new Set((rows ?? []).map((r) => Number(r.catalog_id)).filter(Boolean))];
  const metaById = new Map<
    number,
    { simple_desc: string | null; key_points: string | null; usage_examples: string | null }
  >();
  if (catalogIds.length > 0) {
    const { data: cats, error: cErr } = await service
      .from('catalog')
      .select('id, simple_desc, key_points, usage_examples')
      .in('id', catalogIds);
    if (cErr) {
      return NextResponse.json({ error: '교구 정보를 불러오지 못했습니다.' }, { status: 500 });
    }
    for (const c of cats ?? []) {
      metaById.set(Number(c.id), {
        simple_desc: c.simple_desc ?? null,
        key_points: c.key_points ?? null,
        usage_examples: c.usage_examples ?? null,
      });
    }
  }

  const items = (rows ?? []).map((row) => {
    const catalogId = Number(row.catalog_id);
    const meta = metaById.get(catalogId);
    const opened = row.earliest_opened_at as string | null;
    return {
      id: `ledger-${catalogId}`,
      catalog_id: catalogId,
      name: row.name as string,
      category: (row.category as string | null) ?? '',
      image: (row.image as string | null) ?? null,
      quantity: Number(row.qty_held) || 0,
      updated_at: opened ?? new Date().toISOString(),
      simple_desc: meta?.simple_desc ?? null,
      key_points: meta?.key_points ?? null,
      usage_examples: meta?.usage_examples ?? null,
      source: 'ledger' as const,
    };
  });

  return NextResponse.json(
    { mode: 'ledger' as const, items },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
