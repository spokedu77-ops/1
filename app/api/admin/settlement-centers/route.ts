import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { MASTER_EMAIL } from '@/app/lib/constants/admin';

const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store, max-age=0' },
});

/** Search only operational centers. Policy IDs and historical amounts are never inferred from names. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) { auth.response.headers.set('Cache-Control', 'private, no-store'); return auth.response; }
  if (auth.email?.toLowerCase() !== MASTER_EMAIL) return json({ error: 'Forbidden' }, 403);
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const search = (params.get('q') ?? '').trim();
  if (id && !z.string().uuid().safeParse(id).success) return json({ error: '잘못된 센터 ID입니다.' }, 400);
  if (search.length > 100) return json({ error: '검색어가 너무 깁니다.' }, 400);
  try {
    const service = getServiceSupabase();
    if (id) {
      const result = await service.from('centers')
        .select('id,name,status,contract_start,contract_end,session_fee,updated_at').eq('id', id).maybeSingle();
      if (result.error) throw result.error;
      return result.data ? json({ center: result.data }) : json({ error: '센터를 찾을 수 없습니다.' }, 404);
    }
    const term = search.replace(/[,%()]/g, ' ').trim();
    if (!term) return json({ centers: [] });
    const result = await service.from('centers').select('id,name,status').ilike('name', `%${term}%`)
      .order('name').order('id').limit(20);
    if (result.error) throw result.error;
    const ids = (result.data ?? []).map((row) => row.id);
    // Only links for this result set, never all policy payloads or a per-center query loop.
    const links = ids.length ? await service.from('admin_settlement_sheet_centers')
      .select('id,center_id:payload->>center_id').in('payload->>center_id', ids) : { data: [], error: null };
    if (links.error) throw links.error;
    const linked = new Set((links.data ?? []).map((row) => row.center_id));
    return json({ centers: (result.data ?? []).map((row) => ({ ...row, linked: linked.has(row.id) })) });
  } catch {
    return json({ error: '센터정보를 불러오지 못했습니다.' }, 500);
  }
}
