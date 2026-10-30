import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { MASTER_EMAIL } from '@/app/lib/constants/admin';
import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';

const noStore = (response: NextResponse) => {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
};
const json = (body: unknown, status = 200) => noStore(NextResponse.json(body, { status }));
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isSettlementMaster = (email: string | null) => email?.toLowerCase() === MASTER_EMAIL;
const localMappingWritesAllowed = () => {
  if (process.env.NODE_ENV === 'production') return false;
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname); }
  catch { return false; }
};
const appendLinkAudit = (previous: Record<string, unknown>, to: unknown, actor: string, previousRevision: unknown, revision: string) => [
  ...(Array.isArray(previous._centerLinkHistory) ? previous._centerLinkHistory : []),
  { actor, at: new Date().toISOString(), from: previous.center_id ?? null, to: to ?? null, previousRevision, revision },
];

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return noStore(auth.response);
  if (!isSettlementMaster(auth.email)) return json({ error: 'Forbidden' }, 403);
  try {
    const service = getServiceSupabase();
    const scope = new URL(request.url).searchParams.get('scope');
    if (scope === 'centers') {
      const policies = await service.from('admin_settlement_sheet_centers').select('id,payload,revision').order('updated_at');
      if (policies.error) throw policies.error;
      return json({ centers: Object.fromEntries((policies.data ?? []).map((row) => [row.id, {
        ...(isObject(row.payload) ? row.payload : {}), id: row.id, rev: row.revision,
      }])) });
    }
    const [months, centers, settings] = await Promise.all([
      service.from('admin_settlement_sheet_months').select('month_key,payload,revision,locked,locked_at').order('month_key'),
      scope === 'sheet' ? Promise.resolve({ data: [], error: null })
        : service.from('admin_settlement_sheet_centers').select('id,payload,revision').order('updated_at'),
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
    if (kind === 'center-link') {
      // Stage 1 cannot write mappings to the operational project, even from next dev.
      if (!localMappingWritesAllowed()) return json({ error: 'Stage 1 연결 저장은 로컬 DB에서만 허용됩니다.', code: 'LOCAL_ONLY' }, 423);
      const parsed = z.object({ id: z.string().min(1), rev: z.string().min(1), center_id: z.string().uuid().nullable() }).strict().safeParse(body.value);
      if (!parsed.success) return json({ error: '연결 요청 형식이 올바르지 않습니다.' }, 400);
      const link = parsed.data;
      const current = await service.from('admin_settlement_sheet_centers').select('payload,revision').eq('id', link.id).maybeSingle();
      if (current.error) throw current.error;
      if (!current.data) return json({ error: '정산 항목을 찾을 수 없습니다.' }, 404);
      if (current.data.revision !== link.rev) return json({ error: '기관 정보가 변경됐습니다. 다시 불러와 주세요.', code: 'REVISION_CONFLICT' }, 409);
      const previous = isObject(current.data.payload) ? current.data.payload : {};
      if ((previous.center_id ?? null) === link.center_id) return json({ error: '이미 적용된 연결입니다.', code: 'DUPLICATE_LINK' }, 409);
      if (link.center_id) {
        const center = await service.from('centers').select('id').eq('id', link.center_id).maybeSingle();
        if (center.error) throw center.error;
        if (!center.data) return json({ error: '센터를 찾을 수 없습니다.' }, 404);
      }
      const revision = crypto.randomUUID();
      const at = new Date().toISOString();
      // Audit and link share the same revision CAS; no separate non-atomic audit insert.
      const payload = { ...previous, center_id: link.center_id, _centerLinkHistory: appendLinkAudit(previous, link.center_id, auth.userId, link.rev, revision) };
      const result = await service.from('admin_settlement_sheet_centers').update({ payload, revision, updated_at: at, updated_by: auth.userId })
        .eq('id', link.id).eq('revision', link.rev).select('id').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return json({ error: '기관 정보가 변경됐습니다. 다시 불러와 주세요.', code: 'REVISION_CONFLICT' }, 409);
      return json({ revision });
    }
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
        const current = await service.from('admin_settlement_sheet_months').select('revision,locked,payload').eq('month_key', month.key).maybeSingle();
        if (current.error) throw current.error;
        if (!current.data || current.data.revision !== expectedRevision) return json({ error: '다른 곳에서 변경된 데이터입니다. 새로고침 후 다시 시도해 주세요.', code: 'REVISION_CONFLICT' }, 409);
        const requestedLock = Boolean(month.locked);
        if (current.data.locked && (requestedLock || !isDeepStrictEqual(current.data.payload, payload))) return json({ error: '확정된 달은 수정할 수 없습니다.' }, 423);
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
      const current = await service.from('admin_settlement_sheet_centers').select('payload,revision').eq('id', center.id).maybeSingle();
      if (current.error) throw current.error;
      if (current.data && center.rev !== current.data.revision) return json({ error: '기관 정보가 변경됐습니다. 다시 불러와 주세요.', code: 'REVISION_CONFLICT' }, 409);
      const previous = isObject(current.data?.payload) ? current.data.payload : {};
      const mappingChanged = Object.hasOwn(center, 'center_id') && (previous.center_id ?? null) !== (center.center_id ?? null);
      if (mappingChanged && !localMappingWritesAllowed()) return json({ error: 'Stage 1 연결 저장은 로컬 DB에서만 허용됩니다.', code: 'LOCAL_ONLY' }, 423);
      if (center.center_id != null) {
        if (!z.string().uuid().safeParse(center.center_id).success) return json({ error: '잘못된 센터 ID입니다.' }, 400);
        const linked = await service.from('centers').select('id').eq('id', center.center_id).maybeSingle();
        if (linked.error) throw linked.error;
        if (!linked.data) return json({ error: '센터를 찾을 수 없습니다.' }, 404);
      }
      const nextRevision = crypto.randomUUID();
      const payload = { ...(isObject(current.data?.payload) ? current.data.payload : {}), ...center }; delete payload.rev;
      // Existing sheet UI must not bypass local-only mapping or forge audit history.
      delete payload._centerLinkHistory;
      if (previous._centerLinkHistory) payload._centerLinkHistory = previous._centerLinkHistory;
      if (mappingChanged) payload._centerLinkHistory = appendLinkAudit(previous, center.center_id, auth.userId, current.data?.revision ?? null, nextRevision);
      const values = { payload, revision: nextRevision, updated_at: new Date().toISOString(), updated_by: auth.userId };
      const result = current.data
        ? await service.from('admin_settlement_sheet_centers').update(values).eq('id', center.id).eq('revision', current.data.revision).select('id').maybeSingle()
        : await service.from('admin_settlement_sheet_centers').insert({ id: center.id, ...values }).select('id').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return json({ error: '기관 정보가 변경됐습니다. 다시 불러와 주세요.', code: 'REVISION_CONFLICT' }, 409);
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
      // Restore replaces rows and may remove months; never let it replace a confirmed month.
      const confirmed = await service.from('admin_settlement_sheet_months').select('month_key').eq('locked', true).limit(1);
      if (confirmed.error) throw confirmed.error;
      if (confirmed.data?.length) return json({ error: '확정된 월이 있어 전체 백업 복원을 진행할 수 없습니다.' }, 423);
      for (const key of Object.keys(backup.months)) if (!monthPattern.test(key)) return json({ error: `잘못된 월 키: ${key}` }, 400);
      const monthRows = Object.entries(backup.months).map(([key, raw]) => {
        const value = isObject(raw) ? raw : {}; const payload = { ...value }; delete payload.rev; delete payload.locked; delete payload.lockedAt;
        return { month_key: key, payload, revision: crypto.randomUUID(), locked: Boolean(value.locked), locked_at: value.lockedAt || null, updated_by: auth.userId };
      });
      const centerRows = Object.entries(backup.centers).map(([id, raw]) => {
        const value = isObject(raw) ? raw : {}; const payload = { ...value }; delete payload.rev;
        return { id, payload, revision: crypto.randomUUID(), updated_by: auth.userId };
      });
      for (const row of monthRows) {
        const current = await service.from('admin_settlement_sheet_months').select('revision,locked').eq('month_key', row.month_key).maybeSingle();
        if (current.error) throw current.error;
        if (current.data?.locked) return json({ error: '확정된 월은 복원으로 변경할 수 없습니다.' }, 423);
        const result = current.data
          ? await service.from('admin_settlement_sheet_months').update(row).eq('month_key', row.month_key).eq('revision', current.data.revision).eq('locked', false).select('month_key').maybeSingle()
          : await service.from('admin_settlement_sheet_months').insert(row).select('month_key').maybeSingle();
        if (result.error) throw result.error;
        if (!result.data) return json({ error: '복원 중 월 정보가 변경됐습니다.', code: 'REVISION_CONFLICT' }, 409);
      }
      if (centerRows.length) { const result = await service.from('admin_settlement_sheet_centers').upsert(centerRows, { onConflict: 'id' }); if (result.error) throw result.error; }
      const settingsResult = await service.from('admin_settlement_sheet_settings').upsert({ singleton: true, payload: backup.settings, updated_by: auth.userId }, { onConflict: 'singleton' });
      if (settingsResult.error) throw settingsResult.error;
      const monthKeys = new Set(monthRows.map((row) => row.month_key));
      const centerIds = new Set(centerRows.map((row) => row.id));
      const existingMonths = await service.from('admin_settlement_sheet_months').select('month_key');
      const existingCenters = await service.from('admin_settlement_sheet_centers').select('id');
      if (existingMonths.error ?? existingCenters.error) throw existingMonths.error ?? existingCenters.error;
      for (const row of existingMonths.data ?? []) if (!monthKeys.has(row.month_key)) {
        const removed = await service.from('admin_settlement_sheet_months').delete().eq('month_key', row.month_key).eq('locked', false);
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
    if (current.error) return json({ error: '월 상태를 확인하지 못했습니다.' }, 500);
    const result = await service.from('admin_settlement_sheet_months').delete().eq('month_key', id).eq('locked', false);
    return result.error ? json({ error: '월을 삭제하지 못했습니다.' }, 500) : json({ ok: true });
  }
  if (kind === 'center') {
    const result = await service.from('admin_settlement_sheet_centers').delete().eq('id', id);
    return result.error ? json({ error: '기관을 삭제하지 못했습니다.' }, 500) : json({ ok: true });
  }
  return json({ error: '지원하지 않는 삭제 작업입니다.' }, 400);
}
