import type { MasterSessionWorkState } from '../lib/masterSessionWorkState';
import type { MasterSessionDto } from '../types/operational';
import type { SessionActionPolicy } from './sessionActionPolicy';

export type SessionWorkspacePresentationKind = 'PREP' | 'RUN' | 'WRAP' | 'ATTENTION' | 'REVIEW' | 'RECOVERY';
export type SessionWorkspaceEmphasis = 'secondary' | 'summary' | 'attention' | 'review' | 'recovery';
export type SessionWorkspacePrimaryIntent =
  | 'add-activity'
  | 'start-session'
  | 'run-next-activity'
  | 'wrap-session'
  | 'review-status'
  | 'post-session'
  | 'recover-session';

/** Progressive disclosure for Session sections — phase decides, not component declaration order. */
export type SessionCaptureSurfaceMode = 'hidden' | 'memory' | 'collapsed' | 'emphasized' | 'review';
export type SessionAttendanceSurfaceMode = 'collapsed' | 'summary' | 'attention' | 'review';
export type SessionMemoSurfaceMode = 'hidden' | 'collapsed' | 'emphasized' | 'review';

export type SessionWorkspaceSectionOrder = {
  context: number;
  activities: number;
  attendance: number;
  capture: number;
  memo: number;
  primary: number;
  manage: number;
  schedule: number;
};

export type SessionWorkspacePresentation = {
  presentationKind: SessionWorkspacePresentationKind;
  /** Teacher-facing phase label (not internal enum). */
  phaseLabel: string;
  nextPendingProgramId: string | null;
  showScheduleEditor: boolean;
  scheduleEditingAvailable: boolean;
  attendanceEmphasis: SessionWorkspaceEmphasis;
  memoEmphasis: SessionWorkspaceEmphasis;
  primarySurfaceIntent: SessionWorkspacePrimaryIntent;
  sectionOrder: SessionWorkspaceSectionOrder;
  attendanceMode: SessionAttendanceSurfaceMode;
  attendanceDefaultOpen: boolean;
  captureMode: SessionCaptureSurfaceMode;
  memoMode: SessionMemoSurfaceMode;
  /** Lite paywall cards only when the teacher is actually wrapping/reviewing records. */
  showInlinePremiumUpsell: boolean;
};

const PHASE_LABEL: Record<SessionWorkspacePresentationKind, string> = {
  PREP: '준비',
  RUN: '진행',
  WRAP: '마무리',
  ATTENTION: '상태 확인',
  REVIEW: '확인',
  RECOVERY: '취소 기록',
};

function sectionOrderFor(kind: SessionWorkspacePresentationKind): SessionWorkspaceSectionOrder {
  if (kind === 'PREP') {
    return { context: 1, activities: 2, capture: 3, primary: 4, attendance: 6, memo: 7, manage: 9, schedule: 8 };
  }
  if (kind === 'RUN') {
    return { context: 1, activities: 2, attendance: 3, primary: 4, capture: 5, memo: 6, manage: 7, schedule: 8 };
  }
  if (kind === 'WRAP' || kind === 'ATTENTION') {
    return { context: 1, attendance: 2, primary: 3, capture: 4, memo: 4, activities: 5, manage: 7, schedule: 6 };
  }
  if (kind === 'REVIEW') {
    return { context: 1, primary: 2, activities: 3, attendance: 4, capture: 5, memo: 5, manage: 8, schedule: 7 };
  }
  return { context: 1, primary: 2, manage: 3, activities: 4, attendance: 5, capture: 6, memo: 6, schedule: 7 };
}

export function resolveSessionWorkspacePresentation({
  workState,
  actions,
  programs,
  teachingStarted = false,
}: {
  workState: MasterSessionWorkState;
  actions: SessionActionPolicy;
  programs: MasterSessionDto['programs'];
  teachingStarted?: boolean;
}): SessionWorkspacePresentation {
  const presentationKind: SessionWorkspacePresentationKind = workState.stage === 'cancelled'
    ? 'RECOVERY'
    : workState.stage === 'completed'
      ? 'REVIEW'
      : workState.attention.overdue
        ? 'ATTENTION'
        : workState.stage === 'needs-preparation' || (workState.stage === 'ready' && !teachingStarted)
          ? 'PREP'
          : workState.stage === 'ready-to-wrap'
            ? 'WRAP'
            : 'RUN';
  const nextPendingProgramId = presentationKind === 'RUN' || presentationKind === 'PREP'
    ? programs.find((program) => !program.isCompleted)?.id ?? null
    : null;

  const attendanceMode: SessionAttendanceSurfaceMode = presentationKind === 'WRAP' || presentationKind === 'ATTENTION'
    ? 'attention'
    : presentationKind === 'REVIEW'
      ? 'review'
      : presentationKind === 'RUN'
        ? 'summary'
        : 'collapsed';

  const captureMode: SessionCaptureSurfaceMode = presentationKind === 'RECOVERY' || presentationKind === 'RUN'
    ? 'hidden'
    : presentationKind === 'PREP'
      ? 'memory'
        : presentationKind === 'WRAP' || presentationKind === 'ATTENTION'
        ? 'emphasized'
        : presentationKind === 'REVIEW'
          ? 'review'
          : 'collapsed';

  const memoMode: SessionMemoSurfaceMode = presentationKind === 'RECOVERY' || presentationKind === 'PREP' || presentationKind === 'RUN'
    ? 'hidden'
    : presentationKind === 'WRAP' || presentationKind === 'ATTENTION'
      ? 'emphasized'
      : presentationKind === 'REVIEW'
        ? 'review'
        : 'collapsed';

  return {
    presentationKind,
    phaseLabel: PHASE_LABEL[presentationKind],
    nextPendingProgramId,
    showScheduleEditor: false,
    scheduleEditingAvailable: actions.editSchedule && presentationKind !== 'RECOVERY' && presentationKind !== 'REVIEW',
    attendanceEmphasis: presentationKind === 'WRAP' || presentationKind === 'ATTENTION'
      ? 'attention'
      : presentationKind === 'REVIEW'
        ? 'review'
        : presentationKind === 'RECOVERY'
          ? 'recovery'
          : presentationKind === 'RUN'
            ? 'summary'
            : 'secondary',
    memoEmphasis: presentationKind === 'WRAP'
      ? 'attention'
      : presentationKind === 'REVIEW'
        ? 'review'
        : presentationKind === 'RECOVERY'
          ? 'recovery'
          : presentationKind === 'RUN'
            ? 'summary'
            : 'secondary',
    primarySurfaceIntent: presentationKind === 'PREP'
      ? programs.length ? 'start-session' : 'add-activity'
      : presentationKind === 'RUN'
        ? 'run-next-activity'
        : presentationKind === 'WRAP'
          ? 'wrap-session'
          : presentationKind === 'ATTENTION'
            ? 'review-status'
            : presentationKind === 'REVIEW'
              ? 'post-session'
              : 'recover-session',
    sectionOrder: sectionOrderFor(presentationKind),
    attendanceMode,
    attendanceDefaultOpen: attendanceMode === 'attention',
    captureMode,
    memoMode,
    showInlinePremiumUpsell: presentationKind === 'WRAP' || presentationKind === 'REVIEW',
  };
}

export function sessionSectionOrderClass(order: number) {
  if (order === 1) return 'order-1';
  if (order === 2) return 'order-2';
  if (order === 3) return 'order-3';
  if (order === 4) return 'order-4';
  if (order === 5) return 'order-5';
  if (order === 6) return 'order-6';
  if (order === 7) return 'order-7';
  if (order === 8) return 'order-8';
  return 'order-9';
}
