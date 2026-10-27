import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { MASTER_EMAIL } from '@/app/lib/constants/admin';

const noStore = (response: NextResponse) => {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
};
const json = (body: unknown, status = 200) => noStore(NextResponse.json(body, { status }));
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isSettlementMaster = (email: string | null) => email?.toLowerCase() === MASTER_EMAIL;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return noStore(auth.response);
  if (!isSettlementMaster(auth.email)) return json({ error: 'Forbidden' }, 403);
  try {
    const service = getServiceSupabase();
    const [months, centers, settings] = await Promise.all([
      service.from('admin_settlement_sheet_months').select('month_key,payload,revision,locked,locked_at').order('month_key'),
      service.from('admin_settlement_sheet_centers').select('id,payload,revision').order('updated_at'),
      service.from('admin_settlement_sheet_settings').select('payload').eq('singleton', true).maybeSingle(),
    ]);
    const error = months.error ?? centers.error ?? settings.error;
    if (error) throw error;
    return json({
      months: Object.fromEntries((months.data ?? []).map((row) => [row.month_key, {
        ...(isObject(row.payload) ? row.payload : {}), key: row.month_key, rev: row.revision,
        locked: row.locked, lockedAt: row.locked_at,
      }])),
      centers: Object.fromEntries((centers.data ?? []).map((row) => [row.id, {
        ...(isObject(row.payload) ? row.payload : {}), id: row.id, rev: row.revision,
      }])),
      settings: settings.data?.payload ?? { vatMethod: 'sheet', year: new Date().getFullYear() },
    });
  } catch {
    return json({ error: '정산 시트 데이터를 불러오지 못했습니다.' }, 500);
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return noStore(auth.response);
  if (!isSettlementMaster(auth.email)) return json({ error: 'Forbidden' }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return json({ error: '잘못된 요청입니다.' }, 400); }
  const service = getServiceSupabase();
  const kind = body.kind;
  try {
    if (kind === 'month') {
      const month = body.value;
      if (!isObject(month) || typeof month.key !== 'string' || !monthPattern.test(month.key) || !Array.isArray(month.rows)) {
        return json({ error: '월 데이터 형식이 올바르지 않습니다.' }, 400);
      }
      const expectedRevision = typeof body.expectedRevision === 'string' ? body.expectedRevision : null;
      const nextRevision = crypto.randomUUID();
      const payload = { ...month };
      delete payload.rev; delete payload.locked; delete payload.lockedAt;
      if (expectedRevision) {
        const current = await service.from('admin_settlement_sheet_months').select('revision,locked').eq('month_key', month.key).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data || current.data.revision !== expectedRevision) return json({ error: '다른 곳에서 변경된 데이터입니다. 새로고침 후 다시 시도해 주세요.', code: 'REVISION_CONFLICT' }, 409);
        const requestedLock = Boolean(month.locked);
        if (current.data.locked && requestedLock) return json({ error: '확정된 달은 수정할 수 없습니다.' }, 423);
      }
      const locked = Boolean(month.locked);
      const lockedAt = locked ? (typeof month.lockedAt === 'string' ? month.lockedAt : new Date().toISOString()) : null;
      const values = { payload, revision: nextRevision, locked, locked_at: lockedAt, updated_at: new Date().toISOString(), updated_by: auth.userId };
      const result = expectedRevision
        ? await service.from('admin_settlement_sheet_months').update(values).eq('month_key', month.key).eq('revision', expectedRevision).select('month_key').maybeSingle()
        : await service.from('admin_settlement_sheet_months').insert({ month_key: month.key, ...values }).select('month_key').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return json({ error: '다른 곳에서 변경된 데이터입니다. 새로고침 후 다시 시도해 주세요.', code: 'REVISION_CONFLICT' }, 409);
      return json({ revision: nextRevision, lockedAt });
    }
    if (kind === 'center') {
      const center = body.value;
      if (!isObject(center) || typeof center.id !== 'string' || !center.id) return json({ error: '기관 데이터 형식이 올바르지 않습니다.' }, 400);
      const nextRevision = crypto.randomUUID();
      const payload = { ...center }; delete payload.rev;
      const result = await service.from('admin_settlement_sheet_centers').upsert({ id: center.id, payload,
        revision: nextRevision, updated_at: new Date().toISOString(), updated_by: auth.userId }, { onConflict: 'id' });
      if (result.error) throw result.error;
      return json({ revision: nextRevision });
    }
    if (kind === 'settings' && isObject(body.value)) {
      const result = await service.from('admin_settlement_sheet_settings').upsert({ singleton: true, payload: body.value,
        updated_at: new Date().toISOString(), updated_by: auth.userId }, { onConflict: 'singleton' });
      if (result.error) throw result.error;
      return json({ ok: true });
    }
    if (kind === 'restore' && isObject(body.value)) {
      const backup = body.value;
      if (!isObject(backup.months) || !isObject(backup.centers) || !isObject(backup.settings)) return json({ error: '백업 파일 형식이 올바르지 않습니다.' }, 400);
      for (const key of Object.keys(backup.months)) if (!monthPattern.test(key)) return json({ error: `잘못된 월 키: ${key}` }, 400);
      const monthRows = Object.entries(backup.months).map(([key, raw]) => {
        const value = isObject(raw) ? raw : {}; const payload = { ...value }; delete payload.rev; delete payload.locked; delete payload.lockedAt;
        return { month_key: key, payload, revision: crypto.randomUUID(), locked: Boolean(value.locked), locked_at: value.lockedAt || null, updated_by: auth.userId };
      });
      const centerRows = Object.entries(backup.centers).map(([id, raw]) => {
        const value = isObject(raw) ? raw : {}; const payload = { ...value }; delete payload.rev;
        return { id, payload, revision: crypto.randomUUID(), updated_by: auth.userId };
      });
      if (monthRows.length) { const result = await service.from('admin_settlement_sheet_months').upsert(monthRows, { onConflict: 'month_key' }); if (result.error) throw result.error; }
      if (centerRows.length) { const result = await service.from('admin_settlement_sheet_centers').upsert(centerRows, { onConflict: 'id' }); if (result.error) throw result.error; }
      const settingsResult = await service.from('admin_settlement_sheet_settings').upsert({ singleton: true, payload: backup.settings, updated_by: auth.userId }, { onConflict: 'singleton' });
      if (settingsResult.error) throw settingsResult.error;
      const monthKeys = new Set(monthRows.map((row) => row.month_key));
      const centerIds = new Set(centerRows.map((row) => row.id));
      const existingMonths = await service.from('admin_settlement_sheet_months').select('month_key');
      const existingCenters = await service.from('admin_settlement_sheet_centers').select('id');
      if (existingMonths.error ?? existingCenters.error) throw existingMonths.error ?? existingCenters.error;
      for (const row of existingMonths.data ?? []) if (!monthKeys.has(row.month_key)) {
        const removed = await service.from('admin_settlement_sheet_months').delete().eq('month_key', row.month_key);
        if (removed.error) throw removed.error;
      }
      for (const row of existingCenters.data ?? []) if (!centerIds.has(row.id)) {
        const removed = await service.from('admin_settlement_sheet_centers').delete().eq('id', row.id);
        if (removed.error) throw removed.error;
      }
      return json({ ok: true });
    }
    return json({ error: '지원하지 않는 작업입니다.' }, 400);
  } catch {
    return json({ error: '정산 시트 저장 작업을 완료하지 못했습니다.' }, 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return noStore(auth.response);
  if (!isSettlementMaster(auth.email)) return json({ error: 'Forbidden' }, 403);
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind');
  const id = url.searchParams.get('id');
  if (!id) return json({ error: '삭제 대상을 지정해 주세요.' }, 400);
  const service = getServiceSupabase();
  if (kind === 'month') {
    if (!monthPattern.test(id)) return json({ error: '잘못된 월입니다.' }, 400);
    const current = await service.from('admin_settlement_sheet_months').select('locked').eq('month_key', id).maybeSingle();
    if (current.data?.locked) return json({ error: '확정된 달은 삭제할 수 없습니다.' }, 423);
    const result = await service.from('admin_settlement_sheet_months').delete().eq('month_key', id);
    return result.error ? json({ error: '월을 삭제하지 못했습니다.' }, 500) : json({ ok: true });
  }
  if (kind === 'center') {
    const result = await service.from('admin_settlement_sheet_centers').delete().eq('id', id);
    return result.error ? json({ error: '기관을 삭제하지 못했습니다.' }, 500) : json({ ok: true });
  }
  return json({ error: '지원하지 않는 삭제 작업입니다.' }, 400);
}
