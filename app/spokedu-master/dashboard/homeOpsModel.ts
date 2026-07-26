import { buildProgramResumeHref, type RecentProgramActivity } from '../lib/recentProgramActivity';
import { hasMeaningfulClassRecordDraft } from '../lib/saveDraftStorage';
import type { ClassRecord, Program } from '../types';

export type HomeAnchorKind =
  | 'record_draft'
  | 'report_draft'
  | 'prep_draft'
  | 'today_lesson'
  | 'spomove'
  | 'empty';

/** max = 수업/기록 운영 신호, mid = SPOMOVE 폴백·빈 상태 */
export type HomeAnchorIntensity = 'max' | 'mid';

export function getHomeAnchorIntensity(kind: HomeAnchorKind): HomeAnchorIntensity {
  if (
    kind === 'record_draft' ||
    kind === 'report_draft' ||
    kind === 'prep_draft' ||
    kind === 'today_lesson'
  ) {
    return 'max';
  }
  return 'mid';
}

export type HomeCta = {
  label: string;
  href: string;
};

export type HomeAnchor = {
  kind: HomeAnchorKind;
  /** 상태 한 줄 */
  status: string;
  title: string;
  primary: HomeCta;
  secondary: HomeCta;
  programId?: string;
  dedupeKey: string;
};

export type HomeQueueItem = {
  id: string;
  label: string;
  title: string;
  actionLabel: string;
  href: string;
  dedupeKey: string;
};

export type ClassRecordDraftSnapshot = {
  selectedProgramId?: string;
  classMemo?: string;
  classId?: string;
  attendance?: Record<string, string>;
};

export type ReportDraftSnapshot = {
  programId?: string;
  selectedRecordId?: string;
  note?: string;
  generated?: string;
};

export type QuickRecordDraftSnapshot = {
  programId?: string;
  memo?: string;
  parentNote?: string;
};

export type HomeOpsInput = {
  classRecordDraft: ClassRecordDraftSnapshot | null;
  reportDraft: ReportDraftSnapshot | null;
  quickRecordDraft: QuickRecordDraftSnapshot | null;
  todayLesson: { programId: string; programTitle?: string } | null;
  recentSpomove: RecentProgramActivity | null;
  programsById: Map<string, Program>;
};

export function hasMeaningfulReportDraft(draft: ReportDraftSnapshot | null): boolean {
  if (!draft) return false;
  return Boolean(draft.generated?.trim() || draft.note?.trim());
}

/** 상세에서 빠른 기록 초안을 실제로 쓰기 시작한 경우만 — 미리보기/상세 클릭과 구분 */
export function hasMeaningfulPrepDraft(draft: QuickRecordDraftSnapshot | null): boolean {
  if (!draft?.programId?.trim()) return false;
  return Boolean(draft.memo?.trim() || draft.parentNote?.trim());
}

function programTitle(programsById: Map<string, Program>, programId: string | undefined, fallback: string) {
  if (!programId) return fallback;
  return programsById.get(programId)?.title?.trim() || fallback;
}

function buildRecordDraftAnchor(input: HomeOpsInput): HomeAnchor | null {
  const draft = input.classRecordDraft;
  if (!hasMeaningfulClassRecordDraft(draft) || !draft) return null;
  const programId = draft.selectedProgramId?.trim() || undefined;
  const href = programId
    ? `/spokedu-master/class-record?program=${encodeURIComponent(programId)}`
    : '/spokedu-master/class-record';
  return {
    kind: 'record_draft',
    status: '이어 기록할 수업이 있어요',
    title: programTitle(input.programsById, programId, '작성 중인 수업 기록'),
    primary: { label: '이어서 기록', href },
    secondary: programId
      ? { label: '간편 준비', href: `/spokedu-master/library/${programId}` }
      : { label: '수업자료에서 찾기', href: '/spokedu-master/library' },
    programId,
    dedupeKey: `record_draft:${programId ?? 'none'}`,
  };
}

function buildReportDraftAnchor(input: HomeOpsInput): HomeAnchor | null {
  const draft = input.reportDraft;
  if (!hasMeaningfulReportDraft(draft) || !draft) return null;
  const programId = draft.programId?.trim() || undefined;
  const params = new URLSearchParams();
  if (programId) params.set('program', programId);
  if (draft.selectedRecordId?.trim()) params.set('record', draft.selectedRecordId.trim());
  const qs = params.toString();
  return {
    kind: 'report_draft',
    status: '작성 중인 안내문이 있어요',
    title: programTitle(input.programsById, programId, '작성 중인 안내문'),
    primary: { label: '안내문 이어서 작성', href: qs ? `/spokedu-master/report?${qs}` : '/spokedu-master/report' },
    secondary: programId
      ? { label: '관련 수업 보기', href: `/spokedu-master/library/${programId}` }
      : { label: '수업자료에서 찾기', href: '/spokedu-master/library' },
    programId,
    dedupeKey: `report_draft:${programId ?? 'none'}`,
  };
}

function buildPrepDraftAnchor(input: HomeOpsInput): HomeAnchor | null {
  const draft = input.quickRecordDraft;
  if (!hasMeaningfulPrepDraft(draft) || !draft?.programId) return null;
  const programId = draft.programId.trim();
  return {
    kind: 'prep_draft',
    status: '준비 중인 수업이 있어요',
    title: programTitle(input.programsById, programId, '준비 중인 수업'),
    primary: { label: '수업 기록 시작', href: `/spokedu-master/class-record?program=${encodeURIComponent(programId)}` },
    secondary: { label: '상세 준비 열기', href: `/spokedu-master/library/${programId}` },
    programId,
    dedupeKey: `prep_draft:${programId}`,
  };
}

function buildTodayLessonAnchor(input: HomeOpsInput): HomeAnchor | null {
  const lesson = input.todayLesson;
  const programId = lesson?.programId?.trim();
  if (!programId) return null;
  const title =
    programTitle(input.programsById, programId, '') ||
    lesson?.programTitle?.trim() ||
    '오늘 수업';
  return {
    kind: 'today_lesson',
    status: '오늘',
    title,
    primary: { label: '준비', href: `/spokedu-master/library/${encodeURIComponent(programId)}` },
    secondary: {
      label: '기록',
      href: `/spokedu-master/class-record?program=${encodeURIComponent(programId)}`,
    },
    programId,
    dedupeKey: `today_lesson:${programId}`,
  };
}

function buildSpomoveAnchor(input: HomeOpsInput): HomeAnchor | null {
  const activity = input.recentSpomove;
  if (!activity) return null;
  return {
    kind: 'spomove',
    status: '최근 화면 활동을 이어서 실행할 수 있어요',
    title: activity.programTitle || '최근 SPOMOVE',
    primary: {
      label: '다시 실행',
      href: buildProgramResumeHref(activity.programId, 'spomove_started'),
    },
    secondary: { label: '다른 화면 활동', href: '/spokedu-master/spomove' },
    programId: activity.programId,
    dedupeKey: `spomove:${activity.programId}`,
  };
}

export function buildEmptyHomeAnchor(): HomeAnchor {
  return {
    kind: 'empty',
    status: '오늘 이어갈 수업을 고르세요',
    title: '아직 이어갈 수업이 없습니다',
    primary: { label: '수업자료에서 찾기', href: '/spokedu-master/library' },
    secondary: { label: '화면 활동 열기', href: '/spokedu-master/spomove' },
    dedupeKey: 'empty',
  };
}

/**
 * 앵커 승격 우선순위 (강한 신호만).
 * 작성 중 draft > 오늘 지정 > SPOMOVE 폴백 > empty.
 * lesson_opened / video_started / 미리보기 금지.
 */
export function resolveHomeAnchor(input: HomeOpsInput): HomeAnchor {
  return (
    buildRecordDraftAnchor(input) ??
    buildReportDraftAnchor(input) ??
    buildPrepDraftAnchor(input) ??
    buildTodayLessonAnchor(input) ??
    buildSpomoveAnchor(input) ??
    buildEmptyHomeAnchor()
  );
}

export function buildHomeQueue(input: HomeOpsInput, anchor: HomeAnchor): HomeQueueItem[] {
  const candidates: HomeQueueItem[] = [];

  const recordAnchor = buildRecordDraftAnchor(input);
  if (recordAnchor) {
    candidates.push({
      id: 'queue-record-draft',
      label: '미완료 기록',
      title: recordAnchor.title,
      actionLabel: '이어서 기록',
      href: recordAnchor.primary.href,
      dedupeKey: recordAnchor.dedupeKey,
    });
  }

  const reportAnchor = buildReportDraftAnchor(input);
  if (reportAnchor) {
    candidates.push({
      id: 'queue-report-draft',
      label: '안내문 초안',
      title: reportAnchor.title,
      actionLabel: '이어서 작성',
      href: reportAnchor.primary.href,
      dedupeKey: reportAnchor.dedupeKey,
    });
  }

  const prepAnchor = buildPrepDraftAnchor(input);
  if (prepAnchor) {
    candidates.push({
      id: 'queue-prep-draft',
      label: '최근 준비',
      title: prepAnchor.title,
      actionLabel: '기록 시작',
      href: prepAnchor.primary.href,
      dedupeKey: prepAnchor.dedupeKey,
    });
  }

  const spomoveAnchor = buildSpomoveAnchor(input);
  if (spomoveAnchor) {
    candidates.push({
      id: 'queue-spomove',
      label: '최근 SPOMOVE',
      title: spomoveAnchor.title,
      actionLabel: '다시 실행',
      href: spomoveAnchor.primary.href,
      dedupeKey: spomoveAnchor.dedupeKey,
    });
  }

  return candidates.filter((item) => item.dedupeKey !== anchor.dedupeKey).slice(0, 4);
}

export type HomeSpomoveBlock =
  | { mode: 'linked'; title: string; href: string; subtitle: string }
  | { mode: 'recent'; title: string; href: string; subtitle: string }
  | { mode: 'cta'; title: string; href: string; subtitle: string };

export function resolveHomeSpomoveBlock(args: {
  anchor: HomeAnchor;
  recentSpomove: RecentProgramActivity | null;
  programsById: Map<string, Program>;
  getLinkedSpomove: (program: Program) => { id: string; title: string; href: string } | null;
}): HomeSpomoveBlock {
  const { anchor, recentSpomove, programsById, getLinkedSpomove } = args;

  if (
    anchor.programId &&
    (anchor.kind === 'record_draft' ||
      anchor.kind === 'prep_draft' ||
      anchor.kind === 'report_draft' ||
      anchor.kind === 'today_lesson')
  ) {
    const program = programsById.get(anchor.programId);
    const linked = program ? getLinkedSpomove(program) : null;
    if (linked) {
      return {
        mode: 'linked',
        title: linked.title,
        href: linked.href,
        subtitle: '오늘 수업과 연결된 화면 활동',
      };
    }
  }

  if (recentSpomove && anchor.kind !== 'spomove') {
    return {
      mode: 'recent',
      title: recentSpomove.programTitle || '최근 SPOMOVE',
      href: buildProgramResumeHref(recentSpomove.programId, 'spomove_started'),
      subtitle: '최근에 실행한 화면 활동',
    };
  }

  if (anchor.kind === 'spomove' && recentSpomove) {
    return {
      mode: 'recent',
      title: recentSpomove.programTitle || '최근 SPOMOVE',
      href: buildProgramResumeHref(recentSpomove.programId, 'spomove_started'),
      subtitle: '이어서 실행',
    };
  }

  return {
    mode: 'cta',
    title: '화면 활동 열기',
    href: '/spokedu-master/spomove',
    subtitle: '프로젝터로 바로 여는 반응 활동',
  };
}

/** 앵커가 비어 있을 때만 후보 비중을 올린다 */
export function shouldEmphasizePrepCandidates(anchor: HomeAnchor): boolean {
  return anchor.kind === 'empty';
}

export function selectPrepCandidatePrograms(programs: Program[], limit = 3): Program[] {
  return programs.slice(0, limit);
}

/** 테스트/호출용 — 최근 quick 기록은 큐 보조로만 쓸 때 */
export function findLatestQuickRecord(records: ClassRecord[]): ClassRecord | null {
  return (
    [...records]
      .filter((record) => record.recordType === 'quick' && record.programId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null
  );
}
