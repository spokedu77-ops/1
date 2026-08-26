import type { MasterSessionWorkState } from '../lib/masterSessionWorkState';
import type { MasterSessionDto } from '../types/operational';
import type { SessionActionPolicy } from './sessionActionPolicy';

export type SessionWorkspacePresentationKind = 'PREP' | 'RUN' | 'WRAP' | 'ATTENTION' | 'REVIEW' | 'RECOVERY';
export type SessionWorkspaceEmphasis = 'secondary' | 'summary' | 'attention' | 'review' | 'recovery';
export type SessionWorkspacePrimaryIntent =
  | 'add-activity'
  | 'run-next-activity'
  | 'wrap-session'
  | 'review-status'
  | 'post-session'
  | 'recover-session';

export type SessionWorkspacePresentation = {
  presentationKind: SessionWorkspacePresentationKind;
  nextPendingProgramId: string | null;
  showScheduleEditor: boolean;
  scheduleEditingAvailable: boolean;
  attendanceEmphasis: SessionWorkspaceEmphasis;
  memoEmphasis: SessionWorkspaceEmphasis;
  primarySurfaceIntent: SessionWorkspacePrimaryIntent;
};

export function resolveSessionWorkspacePresentation({
  workState,
  actions,
  programs,
}: {
  workState: MasterSessionWorkState;
  actions: SessionActionPolicy;
  programs: MasterSessionDto['programs'];
}): SessionWorkspacePresentation {
  const presentationKind: SessionWorkspacePresentationKind = workState.stage === 'cancelled'
    ? 'RECOVERY'
    : workState.stage === 'completed'
      ? 'REVIEW'
      : workState.attention.overdue
        ? 'ATTENTION'
        : workState.stage === 'needs-preparation'
          ? 'PREP'
          : workState.stage === 'ready-to-wrap'
            ? 'WRAP'
            : 'RUN';
  const nextPendingProgramId = presentationKind === 'RUN'
    ? programs.find((program) => !program.isCompleted)?.id ?? null
    : null;

  return {
    presentationKind,
    nextPendingProgramId,
    showScheduleEditor: false,
    scheduleEditingAvailable: actions.editSchedule,
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
      ? 'add-activity'
      : presentationKind === 'RUN'
        ? 'run-next-activity'
        : presentationKind === 'WRAP'
          ? 'wrap-session'
          : presentationKind === 'ATTENTION'
            ? 'review-status'
            : presentationKind === 'REVIEW'
              ? 'post-session'
              : 'recover-session',
  };
}
