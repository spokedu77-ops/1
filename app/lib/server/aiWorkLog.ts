import 'server-only';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { createWorkLogRepository } from '@/app/lib/admin/updateLog/repository';
import type { WorkStatus, WorkWrite } from '@/app/lib/admin/updateLog/contract';
export async function listWorkEvents(filter: { project?: string; status?: WorkStatus; workKey?: string; maxEvents?: number }) {
  try { return await createWorkLogRepository(getServiceSupabase()).list(filter); }
  catch { return { ok: false as const, error: '업데이트 로그를 조회하지 못했습니다.' }; }
}
export async function appendWorkLog(userId: string, input: WorkWrite) {
  try { return await createWorkLogRepository(getServiceSupabase()).append(userId, input); }
  catch { return { ok: false as const, status: 503, error: '업데이트 로그를 저장하지 못했습니다.' }; }
}
