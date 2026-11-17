// Trusted server/CLI code only. Credentials are supplied by the caller.
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { validateWorkWrite, type WorkEvent, type WorkWrite, type WorkStatus } from './contract';
export const WORK_LOG_COLUMNS = 'id,work_key,project,summary,status,source_type,source_url,details,verification_note,occurred_at,created_at,updated_at,created_by';
type Row = { id: string; work_key: string; project: string; summary: string; status: WorkStatus; source_type: WorkEvent['sourceType']; source_url: string | null; details: string | null; verification_note: string | null; occurred_at: string; created_at: string };
export function eventFromRow(row: Row): WorkEvent {
  return { id: row.id, workKey: row.work_key, project: row.project, summary: row.summary, status: row.status, sourceType: row.source_type, sourceUrl: row.source_url ?? '', details: row.details ?? '', verificationNote: row.verification_note ?? '', occurredAt: row.occurred_at, createdAt: row.created_at };
}
export type WriteResult = { ok: true; duplicate: boolean; event: WorkEvent } | { ok: false; status: number; error: string };
export function createWorkLogRepository(db: SupabaseClient) {
  return {
    async list(filter: { project?: string; status?: WorkStatus; workKey?: string; maxEvents?: number }) {
      const events: WorkEvent[] = [];
      // Full paginated history prevents older approvals/unfinished work from disappearing.
      for (let offset = 0; ; offset += 500) {
        const end = filter.maxEvents === undefined ? offset + 499 : Math.min(offset + 499, filter.maxEvents);
        let query = db.from('ai_work_logs').select(WORK_LOG_COLUMNS).order('occurred_at', { ascending: false }).order('id', { ascending: false }).range(offset, end);
        if (filter.project) query = query.eq('project', filter.project);
        if (filter.workKey) query = query.eq('work_key', filter.workKey);
        if (filter.status) query = query.eq('status', filter.status);
        const { data, error } = await query;
        if (error) return { ok: false as const, error: '업데이트 로그를 조회하지 못했습니다.' };
        events.push(...(data as Row[]).map(eventFromRow));
        if (filter.maxEvents !== undefined && events.length > filter.maxEvents) {
          return { ok: true as const, events: events.slice(0, filter.maxEvents), complete: false };
        }
        if (data.length < 500) break;
      }
      return { ok: true as const, events, complete: true };
    },
    async append(userId: string | null, input: WorkWrite): Promise<WriteResult> {
      const validation = validateWorkWrite(input);
      if (validation) return { ok: false, status: 400, error: validation };
      const workKey = input.workKey?.trim() || `work-${randomUUID()}`;
      const project = input.project.trim();
      const summary = input.summary.trim();
      const { data: existing, error: lookupError } = await db.from('ai_work_logs').select('project').eq('work_key', workKey).limit(1);
      if (lookupError) return { ok: false, status: 503, error: '작업 식별자를 확인하지 못했습니다.' };
      if (existing?.some(row => row.project !== project)) return { ok: false, status: 409, error: '같은 작업 식별자가 다른 프로젝트에 이미 있습니다.' };
      const { data, error } = await db.from('ai_work_logs').insert({ work_key: workKey, project, summary, status: input.status, source_type: input.sourceType || 'manual', source_url: input.sourceUrl?.trim() || null, details: input.details?.trim() || null, verification_note: input.verificationNote?.trim() || null, created_by: userId }).select(WORK_LOG_COLUMNS).single();
      if (error?.code === '23505') {
        const { data: duplicate, error: duplicateError } = await db.from('ai_work_logs').select(WORK_LOG_COLUMNS).eq('work_key', workKey).eq('status', input.status).eq('summary', summary).single();
        if (duplicateError || !duplicate) return { ok: false, status: 503, error: '중복 기록을 확인하지 못했습니다.' };
        if (duplicate.project !== project) return { ok: false, status: 409, error: '같은 작업 식별자가 다른 프로젝트에 이미 있습니다.' };
        return { ok: true, duplicate: true, event: eventFromRow(duplicate as Row) };
      }
      if (error || !data) return { ok: false, status: 503, error: '기록을 저장하지 못했습니다.' };
      return { ok: true, duplicate: false, event: eventFromRow(data as Row) };
    },
  };
}
