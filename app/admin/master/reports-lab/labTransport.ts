import { z } from 'zod';
import type { SettlementSheetData, SettlementCenter, SettlementMonth } from '../reports/settlementSheetCore';

export type LabRequest = (input: string, init?: RequestInit) => Promise<Response>;
const copy = <T,>(value: T): T => structuredClone(value);
const object = (value: unknown): value is Record<string, unknown> => value != null && typeof value === 'object' && !Array.isArray(value);
const monthKey = /^\d{4}-(0[1-9]|1[0-2])$/;

/** No network, storage, service client or production write fallback exists in this adapter. */
export function createLabTransport(baseline: SettlementSheetData, writable: boolean, centerIds: string[], onChange: (data: SettlementSheetData) => void = () => {}) {
  let data = copy(baseline);
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fail = (error: string, status = 400) => response({ error }, status);
  const validLink = (center: Record<string, unknown>) => center.center_id == null || (z.string().uuid().safeParse(center.center_id).success && centerIds.includes(center.center_id as string));
  const request: LabRequest = async (input, init) => {
    const url = new URL(input, 'http://lab.invalid');
    if (url.pathname !== '/api/admin/settlement-lab') return fail('LAB 경로 외 요청은 허용되지 않습니다.', 403);
    const method = init?.method ?? 'GET';
    if (method === 'GET') return response(url.searchParams.get('scope') === 'centers' ? { centers: copy(data.centers) } : { ...copy(data), centers: {} });
    if (!writable) return fail('운영 스냅샷은 읽기 전용입니다. 격리 복사본을 먼저 만드세요.', 423);
    const changed = () => { onChange(copy(data)); };
    if (method === 'DELETE') {
      const id = url.searchParams.get('id') ?? '';
      if (url.searchParams.get('kind') === 'month') {
        if (data.months[id]?.locked) return fail('확정된 달은 삭제할 수 없습니다.', 423);
        delete data.months[id];
      } else if (url.searchParams.get('kind') === 'center') delete data.centers[id];
      else return fail('지원하지 않는 삭제입니다.');
      changed(); return response({ ok: true });
    }
    if (method !== 'PUT') return fail('지원하지 않는 작업입니다.', 405);
    let body: Record<string, unknown>;
    try { body = JSON.parse(String(init?.body)); } catch { return fail('잘못된 JSON입니다.'); }
    const value = body.value;
    if (!object(value)) return fail('데이터 형식이 잘못됐습니다.');
    if (body.kind === 'center') {
      if (typeof value.id !== 'string' || !value.id || !validLink(value)) return fail('정산 ID 또는 센터 UUID가 잘못됐습니다.');
      const previous = data.centers[value.id];
      if (previous && previous.rev !== value.rev) return fail('REVISION_CONFLICT', 409);
      const revision = crypto.randomUUID();
      data.centers[value.id] = { ...previous, ...copy(value), rev: revision } as SettlementCenter;
      changed(); return response({ revision });
    }
    if (body.kind === 'month') {
      if (typeof value.key !== 'string' || !monthKey.test(value.key) || !Array.isArray(value.rows)) return fail('월 데이터 형식이 잘못됐습니다.');
      const previous = data.months[value.key];
      if (previous && previous.rev !== body.expectedRevision) return fail('REVISION_CONFLICT', 409);
      if (!previous && body.expectedRevision) return fail('REVISION_CONFLICT', 409);
      if (previous?.locked) {
        const payload = (month: Record<string, unknown>) => { const next = { ...month }; delete next.rev; delete next.locked; delete next.lockedAt; return next; };
        if (value.locked || JSON.stringify(payload(previous)) !== JSON.stringify(payload(value))) return fail('확정된 달은 수정할 수 없습니다.', 423);
      }
      const revision = crypto.randomUUID();
      const lockedAt = value.locked ? (typeof value.lockedAt === 'string' ? value.lockedAt : new Date().toISOString()) : null;
      data.months[value.key] = { ...copy(value), rev: revision, lockedAt } as SettlementMonth;
      changed(); return response({ revision, lockedAt });
    }
    if (body.kind === 'settings') {
      const parsed = z.object({ vatMethod: z.enum(['sheet', 'div11']), year: z.number().int().min(2000).max(2200) }).safeParse(value);
      if (!parsed.success) return fail('설정 형식이 잘못됐습니다.');
      data.settings = parsed.data; changed(); return response({ ok: true });
    }
    if (body.kind === 'restore') {
      if (Object.values(data.months).some((month) => month.locked)) return fail('확정된 월이 있어 복원할 수 없습니다.', 423);
      if (!object(value.months) || !object(value.centers) || !object(value.settings)) return fail('백업 형식이 잘못됐습니다.');
      if (!Object.entries(value.months).every(([key, month]) => monthKey.test(key) && object(month) && Array.isArray(month.rows))) return fail('백업 월 형식이 잘못됐습니다.');
      if (!Object.values(value.centers).every((center) => object(center) && validLink(center))) return fail('백업 UUID가 잘못됐습니다.');
      data = copy(value) as SettlementSheetData;
      changed(); return response({ ok: true });
    }
    return fail('지원하지 않는 작업입니다.');
  };
  return { request, snapshot: () => copy(data) };
}
