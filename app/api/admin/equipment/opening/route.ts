import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { mapEquipmentRpcError } from '@/app/lib/equipment/rpcMap';
import { newEquipmentRequestKey, normalizeClientRequestKey } from '@/app/lib/equipment/requestKey';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';

const bodySchema = z.object({
  catalog_id: z.number().int().positive(),
  qty_on_hand_total: z.number().int().min(0),
  qty_quarantine: z.number().int().min(0).default(0),
  request_key: z.string().optional(),
  note: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!isLedgerWriteMode()) {
    return NextResponse.json({ error: 'ledger write mode가 비활성입니다.' }, { status: 403 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (parsed.data.qty_quarantine > parsed.data.qty_on_hand_total) {
    return NextResponse.json({ error: '격리 수량이 총보유를 초과합니다.' }, { status: 400 });
  }
  const requestKey =
    normalizeClientRequestKey(parsed.data.request_key) ?? newEquipmentRequestKey('opening');
  const service = getServiceSupabase();
  const { data, error } = await service.rpc('admin_equipment_opening_balance', {
    p_catalog_id: parsed.data.catalog_id,
    p_qty_on_hand_total: parsed.data.qty_on_hand_total,
    p_qty_quarantine: parsed.data.qty_quarantine,
    p_request_key: requestKey,
    p_note: parsed.data.note ?? null,
    p_created_by: auth.userId ?? null,
    p_metadata: {},
  });
  if (error) {
    const mapped = mapEquipmentRpcError(error.message);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }
  return NextResponse.json({ result: data, request_key: requestKey });
}
