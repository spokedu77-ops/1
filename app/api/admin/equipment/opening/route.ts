import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { mapEquipmentRpcError } from '@/app/lib/equipment/rpcMap';
import { newEquipmentRequestKey, normalizeClientRequestKey } from '@/app/lib/equipment/requestKey';
import { ensureLegacyImportSnapshot } from '@/app/lib/equipment/legacyImportSync';
import { isEquipmentOpeningPersistEnabled } from '@/app/lib/equipment/openingPersist';
import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';
import { isEquipmentLedgerSchemaReady } from '@/app/lib/equipment/schemaReady';

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
    return NextResponse.json({ error: '수불 원장 쓰기가 비활성입니다.' }, { status: 403 });
  }
  if (!isEquipmentOpeningPersistEnabled()) {
    return NextResponse.json(
      { error: '재고 확정 저장은 운영 승인 후에만 가능합니다.', code: 'OPENING_PERSIST_DISABLED' },
      { status: 403 },
    );
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
  const qtyQuarantine = 0;
  if (qtyQuarantine > parsed.data.qty_on_hand_total) {
    return NextResponse.json({ error: '격리 수량이 총보유를 초과합니다.' }, { status: 400 });
  }
  const requestKey =
    normalizeClientRequestKey(parsed.data.request_key) ?? newEquipmentRequestKey('opening');
  const service = getServiceSupabase();
  if (!(await isEquipmentLedgerSchemaReady(service))) {
    return NextResponse.json({ error: '수불 원장 스키마가 준비되지 않았습니다.' }, { status: 503 });
  }
  const { data: existingOpening } = await service
    .from('equipment_ledger')
    .select('ledger_id')
    .eq('catalog_id', parsed.data.catalog_id)
    .eq('event_type', 'OPENING_BALANCE_MIGRATION')
    .limit(1);
  if ((existingOpening ?? []).length > 0) {
    return NextResponse.json(
      { error: '이미 재고가 확정된 교구입니다. 재고 조정을 사용하세요.', code: 'OPENING_ALREADY_CONFIRMED' },
      { status: 409 },
    );
  }
  await ensureLegacyImportSnapshot(service);
  const { data, error } = await service.rpc('admin_equipment_opening_balance', {
    p_catalog_id: parsed.data.catalog_id,
    p_qty_on_hand_total: parsed.data.qty_on_hand_total,
    p_qty_quarantine: qtyQuarantine,
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
