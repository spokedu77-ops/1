import { jsonMetadataSpan, validateSessionAssistants } from '@/app/admin/classes-shared/lib/sessionMetadata';
import { isZeroFeeStaff, type FeeIdentity } from '@/app/lib/staffTeacherFees';

export type TeacherRow = FeeIdentity & { id: string; name: string; role?: string; is_active?: boolean | null };
export type SessionRow = { id: string; created_by: string; price?: number | null; students_text?: string | null; memo?: string | null; start_at?: string; end_at?: string; title?: string; status?: string | null };
export type SettlementRow = { id: string; teacher_id: string; amount?: number; reason?: string };
export type SettlementIssue = { id: string; title: string; start_at?: string; reason: string; amount: number | null; excludedFromPay: boolean };

export function getExtraTeachersFromSession(s: SessionRow): { id: string; price: number }[] {
  for (const raw of [s.memo, s.students_text]) {
    if (!raw?.includes('EXTRA_TEACHERS:')) continue;
    const span = jsonMetadataSpan(raw, 'EXTRA_TEACHERS:');
    if (!span) continue;
    const rows: unknown = JSON.parse(raw.slice(span.start, span.end));
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string' || typeof row.price !== 'number')) {
      throw new Error('보조강사 배정 또는 수업료 형식이 잘못되었습니다.');
    }
    const error = validateSessionAssistants(rows, s.created_by);
    if (error) throw new Error(error);
    return rows;
  }
  return [];
}

export function buildSettlementExcludedIdSet(users: TeacherRow[]): Set<string> {
  return new Set(users.filter(isZeroFeeStaff).map(u => u.id));
}

export function isSettlementExcluded(id: string, excludedIds: Set<string>): boolean {
  return excludedIds.has(id);
}

export function sessionPayableFees(s: SessionRow, excludedIds: Set<string>): number {
  return (excludedIds.has(s.created_by) ? 0 : Number(s.price) || 0)
    + getExtraTeachersFromSession(s).reduce((sum, ex) => sum + (excludedIds.has(ex.id) ? 0 : ex.price), 0);
}

export function teacherSessionFee(s: SessionRow, id: string, excludedIds: Set<string>): number {
  if (excludedIds.has(id)) return 0;
  return s.created_by === id ? Number(s.price) || 0 : getExtraTeachersFromSession(s).find(ex => ex.id === id)?.price || 0;
}

/** Keep active zero-activity teachers and every historical recipient, including changed roles. */
export function settlementRecipients(users: TeacherRow[], sessions: SessionRow[], adjs: SettlementRow[], excluded: Set<string>): TeacherRow[] {
  const ids = new Set(adjs.map(a => a.teacher_id));
  for (const s of sessions) {
    ids.add(s.created_by);
    for (const ex of getExtraTeachersFromSession(s)) ids.add(ex.id);
  }
  const recipients = new Map(users.filter(u => (u.role === 'teacher' && u.is_active !== false) || ids.has(u.id)).map(u => [u.id, u]));
  for (const id of ids) if (!recipients.has(id)) recipients.set(id, { id, name: `미등록 강사 (${id})`, is_active: false });
  return [...recipients.values()].filter(u => !excluded.has(u.id));
}

export function settlementIssues(users: TeacherRow[], sessions: SessionRow[], now: number): SettlementIssue[] {
  const excluded = buildSettlementExcludedIdSet(users);
  const byId = new Map(users.map(u => [u.id, u]));
  const issues: SettlementIssue[] = [];
  for (const s of sessions) {
    if (s.status === 'postponed' || s.status === 'cancelled' || s.status === 'deleted') continue;
    const reasons: string[] = [];
    let amount: number | null = null;
    const excludedFromPay = !['finished', 'verified'].includes(s.status || '');
    try {
      const extras = getExtraTeachersFromSession(s);
      amount = sessionPayableFees(s, excluded);
      if (!Number.isSafeInteger(s.price) || Number(s.price) < 0) reasons.push('메인 수업료 확인 필요');
      for (const id of [s.created_by, ...extras.map(ex => ex.id)]) {
        if (excluded.has(id)) continue;
        const teacher = byId.get(id);
        if (!teacher) reasons.push(`미등록 강사 ${id}`);
        else if (teacher.is_active === false) reasons.push(`${teacher.name}: 비활성 계정의 과거 정산 포함`);
      }
      if (excludedFromPay && Date.parse(s.end_at || '') <= now && amount > 0) reasons.push('종료 시각 경과 · 미완료로 정산 제외 · 진행 여부 확인 필요');
    } catch {
      reasons.push('보조강사 배정 오류 · 강사/금액 확인 필요');
    }
    if (reasons.length) issues.push({ id: s.id, title: s.title || '제목 없음', start_at: s.start_at, reason: reasons.join(' / '), amount, excludedFromPay });
  }
  return issues;
}

export function settlementPeriodBounds(year: number, month: number, startDay: number, endDay: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T00:00:00+09:00`;
  const end = new Date(Date.UTC(year, month - 1, endDay + 1) - 9 * 60 * 60 * 1000).toISOString();
  return { start, end };
}

/** Stable range ordering is supplied by the caller; never accept a silently truncated payroll. */
export async function readAllSettlementRows<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await read(from, from + 499);
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error('정산 조회 결과가 없습니다. 다시 조회해 주세요.');
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}
