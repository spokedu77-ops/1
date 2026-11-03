import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getSimpleRentals, getSimpleStockTotals, type SimpleMove } from '@/app/lib/equipment/simpleMath';

export const dynamic = 'force-dynamic';

const saveSchema = z.object({
  action: z.literal('save'),
  catalog_id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1).max(150),
  qty_total: z.number().int().min(0).max(1_000_000),
  image: z.string().max(2000).nullable(),
  category: z.string().max(150).nullable(),
});

const rentSchema = z.object({
  action: z.literal('rent'),
  catalog_id: z.number().int().positive(),
  teacher_id: z.string().uuid(),
  qty: z.number().int().positive(),
  move_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  request_key: z.string().uuid(),
});

const returnSchema = z.object({
  action: z.literal('return'),
  rent_id: z.string().uuid(),
  qty: z.number().int().positive(),
  move_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  request_key: z.string().uuid(),
});
const requestSchema = z.discriminatedUnion('action', [saveSchema, rentSchema, returnSchema]);

function failure(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function allMoves(service: ReturnType<typeof getServiceSupabase>): Promise<SimpleMove[]> {
  const result: SimpleMove[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await service.from('equipment_simple_moves')
      .select('id,catalog_id,teacher_id,kind,qty,rent_id,move_date,created_at')
      .order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    result.push(...(data ?? []) as SimpleMove[]);
    if (!data || data.length < 1000) return result;
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const service = getServiceSupabase();
  try {
    const [{ data: catalog, error: cErr }, { data: stocks, error: sErr },
      { data: teachers, error: tErr }, moves] = await Promise.all([
      service.from('catalog').select('id,name,category,image,mgmt_code').order('name'),
      service.from('equipment_simple_stock').select('catalog_id,qty_total'),
      service.from('users').select('id,name').eq('role', 'teacher').eq('is_admin', false).eq('is_active', true).order('name'),
      allMoves(service),
    ]);
    if (cErr || sErr || tErr) throw cErr ?? sErr ?? tErr;
    const stockById = new Map((stocks ?? []).map((s) => [Number(s.catalog_id), Number(s.qty_total)]));
    const rentals = getSimpleRentals(moves);
    const items = (catalog ?? []).map((c) => {
      const total = stockById.has(c.id) ? stockById.get(c.id)! : null;
      return { id: c.id, name: c.name, category: c.category, image: c.image,
        mgmt_code: c.mgmt_code, qty_total: total,
        ...getSimpleStockTotals(c.id, total, rentals) };
    });
    return NextResponse.json({ items, teachers: teachers ?? [], rentals, moves },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return failure('신규 수불 데이터를 조회할 수 없습니다. SIMPLE V1 스키마 적용 상태를 확인하세요.', 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let input: z.infer<typeof requestSchema>;
  try {
    const raw: unknown = await request.json();
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) return failure('입력값이 올바르지 않습니다.');
    input = parsed.data;
  } catch { return failure('JSON 요청이 올바르지 않습니다.'); }

  const service = getServiceSupabase();
  let rpc: string;
  let args: Record<string, unknown>;
  if (input.action === 'save') {
    rpc = 'admin_equipment_simple_save';
    args = { p_catalog_id: input.catalog_id, p_name: input.name, p_qty_total: input.qty_total,
      p_image: input.image, p_category: input.category };
  } else if (input.action === 'rent') {
    rpc = 'admin_equipment_simple_rent';
    args = { p_catalog_id: input.catalog_id, p_teacher_id: input.teacher_id, p_qty: input.qty,
      p_move_date: input.move_date, p_request_key: input.request_key, p_created_by: auth.userId };
  } else {
    rpc = 'admin_equipment_simple_return';
    args = { p_rent_id: input.rent_id, p_qty: input.qty, p_move_date: input.move_date,
      p_request_key: input.request_key, p_created_by: auth.userId };
  }
  const { data, error } = await service.rpc(rpc, args);
  if (error) {
    const code = [
      'SIMPLE_INVALID_ITEM', 'SIMPLE_ITEM_NOT_FOUND', 'SIMPLE_TOTAL_BELOW_LENT',
      'SIMPLE_INVALID_RENT', 'SIMPLE_RENT_NOT_FOUND', 'SIMPLE_STOCK_NOT_ENTERED',
      'SIMPLE_TEACHER_NOT_ACTIVE', 'SIMPLE_INSUFFICIENT_STOCK',
      'SIMPLE_INVALID_RETURN', 'SIMPLE_RETURN_OVER_LIMIT', 'SIMPLE_IDEMPOTENCY_CONFLICT',
    ].find((c) => error.message.includes(c));
    if (!code) return failure('저장 실패. 스키마와 권한을 확인하세요.', 500);
    const friendly: Record<string, string> = {
      SIMPLE_INVALID_ITEM: '교구명과 수량을 확인하세요.',
      SIMPLE_ITEM_NOT_FOUND: '교구가 존재하지 않습니다.',
      SIMPLE_TOTAL_BELOW_LENT: '현재 대여 중인 수량보다 총보유를 낮출 수 없습니다.',
      SIMPLE_INVALID_RENT: '대여 정보를 확인하세요.',
      SIMPLE_RENT_NOT_FOUND: '대여 기록을 찾을 수 없습니다.',
      SIMPLE_STOCK_NOT_ENTERED: '먼저 교구의 총보유 수량을 등록하세요.',
      SIMPLE_TEACHER_NOT_ACTIVE: '선택한 강사가 현재 활성 강사가 아닙니다.',
      SIMPLE_INSUFFICIENT_STOCK: '대여 가능한 수량이 부족합니다.',
      SIMPLE_INVALID_RETURN: '반납 정보를 확인하세요.',
      SIMPLE_RETURN_OVER_LIMIT: '남은 대여 수량보다 많이 반납할 수 없습니다.',
      SIMPLE_IDEMPOTENCY_CONFLICT: '중복 요청이 충돌했습니다. 화면을 새로고침하세요.',
    };
    return failure(friendly[code], 409);
  }
  return NextResponse.json({ ok: true, result: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
