import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { mapEquipmentRpcError } from '@/app/lib/equipment/rpcMap';
import { newEquipmentRequestKey, normalizeClientRequestKey } from '@/app/lib/equipment/requestKey';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';

const bodySchema = z.object({
  catalog_id: z.number().int().positive(),
  delta: z.number().int().refine((n) => n !== 0, 'delta must be non-zero'),
  kind: z.enum(['on_hand', 'quarantine']).default('on_hand'),
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
  const requestKey =
    normalizeClientRequestKey(parsed.data.request_key) ?? newEquipmentRequestKey('adj');
  const service = getServiceSupabase();
  const rpcName =
    parsed.data.kind === 'quarantine' ? 'admin_equipment_quarantine_adjust' : 'admin_equipment_adjust_on_hand';
  const { data, error } = await service.rpc(rpcName, {
    p_catalog_id: parsed.data.catalog_id,
    p_delta: parsed.data.delta,
    p_request_key: requestKey,
    p_note: parsed.data.note ?? null,
    p_created_by: auth.userId ?? null,
  });
  if (error) {
    const mapped = mapEquipmentRpcError(error.message);
    return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
  }
  return NextResponse.json({ result: data, request_key: requestKey });
}
