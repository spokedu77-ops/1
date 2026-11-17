export const WORK_STATUSES = ['proposed', 'approved', 'in_progress', 'reported', 'verified', 'blocked'] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];
export const WORK_STATUS_LABELS: Record<WorkStatus, string> = { proposed: '제안', approved: '승인', in_progress: '진행 중', reported: '완료 보고', verified: '검증 완료', blocked: '보류·문제' };
export const SOURCE_TYPES = ['manual', 'chatgpt', 'codex', 'github', 'other'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export type WorkWrite = { workKey?: string; project: string; status: string; summary: string; details?: string; sourceType?: string; sourceUrl?: string; verificationNote?: string };

export type WorkEvent = {
  id: string;
  workKey: string;
  project: string;
  status: WorkStatus;
  summary: string;
  details: string;
  sourceType: SourceType;
  sourceUrl: string;
  verificationNote: string;
  occurredAt: string;
  createdAt: string;
};


export function isWorkStatus(value: string): value is WorkStatus {
  return (WORK_STATUSES as readonly string[]).includes(value);
}

export function formatWorkLine(createdAt: string, project: string, summary: string, status: string) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(createdAt)).replaceAll('-', '.');
  return `${date} | ${project} | ${summary} | ${isWorkStatus(status) ? WORK_STATUS_LABELS[status] : status}`;
}

export function normalizeWorkKey(value: string) {
  return value.trim();
}

export function assertWorkKey(value: string) {
  const key = normalizeWorkKey(value);
  if (!key || [...key].length > 160) {
    throw new Error('작업 식별자는 1~160자로 입력해 주세요.');
  }
  return key;
}

export function validateWorkWrite(input: WorkWrite) {
  const summary = input.summary.trim();
  const project = input.project.trim();
  const evidence = (input.verificationNote ?? '').trim();
  if (!project || [...project].length > 80) return '프로젝트명을 1~80자로 입력해 주세요.';
  if (!summary || [...summary].length > 300) return '작업 요약을 1~300자로 입력해 주세요.';
  if (!isWorkStatus(input.status)) return '작업 상태를 선택해 주세요.';
  if (input.status === 'verified' && !evidence) return '검증 완료에는 검증 근거가 필요합니다.';
  if (input.workKey) { try { assertWorkKey(input.workKey); } catch { return '작업 식별자는 1~160자로 입력해 주세요.'; } }
  if (input.sourceType && !(SOURCE_TYPES as readonly string[]).includes(input.sourceType)) return '출처 유형이 올바르지 않습니다.';
  if ((input.details ?? '').length > 8000) return '상세 내용은 8000자 이하로 입력해 주세요.';
  if ((input.sourceUrl ?? '').length > 2048) return '출처 주소는 2048자 이하로 입력해 주세요.';
  if (input.sourceUrl?.trim()) {
    try { if (!['http:', 'https:'].includes(new URL(input.sourceUrl).protocol)) return '출처 주소는 http 또는 https 주소여야 합니다.'; }
    catch { return '출처 주소가 올바르지 않습니다.'; }
  }
  if (evidence.length > 4000) return '검증 근거는 4000자 이하로 입력해 주세요.';
  return null;
}

function tokens(value: string) {
  return new Set(value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 2));
}

function overlap(tokens: Set<string>, text: string) {
  const haystack = text.toLowerCase();
  let count = 0;
  for (const token of tokens) if (haystack.includes(token)) count += 1;
  return count;
}

export function buildProjectContext(events: WorkEvent[], instruction = '') {
  const byWork = new Map<string, WorkEvent[]>();
  for (const event of [...events].sort(compareWorkEvents)) {
    const list = byWork.get(event.workKey) ?? [];
    list.push(event);
    byWork.set(event.workKey, list);
  }
  const works = [...byWork.values()].map(history => ({
    workKey: history[0].workKey,
    project: history[history.length - 1].project,
    latest: history[history.length - 1],
    history,
  }));
  const approved = works.flatMap(work => work.history.filter(event => event.status === 'approved'));
  const reported = works.filter(work => work.latest.status === 'reported').map(work => work.latest);
  const verified = works.filter(work => work.latest.status === 'verified').map(work => work.latest);
  const unresolved = works
    .filter(work => ['proposed', 'approved', 'in_progress', 'blocked'].includes(work.latest.status))
    .map(work => work.latest);
  const possibleConflicts = works.flatMap(work => {
    const notes: string[] = [];
    const approvals = work.history.filter(event => event.status === 'approved');
    if (new Set(approvals.map(event => event.summary.trim())).size > 1) {
      notes.push('같은 작업에 서로 다른 승인 문구가 있습니다.');
    }
    if (instruction.trim()) {
      const related = overlap(tokens(`${work.latest.summary} ${approvals.map(event => event.summary).join(' ')}`), instruction);
      if (related >= 2 && (work.latest.status === 'blocked' || work.latest.status === 'in_progress')) {
        notes.push('새 지시가 아직 끝나지 않은 작업과 겹칩니다.');
      }
    }
    return notes.length ? [{ workKey: work.workKey, summary: work.latest.summary, status: work.latest.status, notes }] : [];
  });
  return {
    works: works.sort((a, b) => compareWorkEvents(b.latest, a.latest)),
    approved,
    reported,
    verified,
    unresolved,
    possibleConflicts,
  };
}

export function compareWorkEvents(a: WorkEvent, b: WorkEvent) {
  return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || a.id.localeCompare(b.id);
}
