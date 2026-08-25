import type { MasterClassDto, MasterSessionDto, MasterSessionStatus } from '../types/operational';
import { buildActivitySessionHref } from './masterNavigationContext';
import { getSeoulSessionDay } from './sessionDateTime';
import { MASTER_ACTION_COPY } from './masterActionGrammar';

export type MasterSessionWorkStage =
  | 'needs-preparation'
  | 'ready'
  | 'in-progress'
  | 'ready-to-wrap'
  | 'completed'
  | 'cancelled';

export type SessionTimeRelation = 'upcoming' | 'today' | 'overdue' | 'past';
export type MasterSessionPrimaryIntent =
  | 'prepare-session'
  | 'open-session'
  | 'continue-session'
  | 'wrap-session'
  | 'record-attendance'
  | 'view-session';

export type MasterSessionWorkState = {
  lifecycle: MasterSessionStatus;
  stage: MasterSessionWorkStage;
  timeRelation: SessionTimeRelation;
  progress: { completed: number; total: number };
  attention: {
    needsActivities: boolean;
    incompleteActivities: boolean;
    allActivitiesDone: boolean;
    attendanceMissing: boolean;
    overdue: boolean;
  };
  primaryIntent: MasterSessionPrimaryIntent | null;
  primaryLabel: string | null;
  operationalLabel: string;
  href: string;
};

function deriveStage(session: MasterSessionDto, completed: number): MasterSessionWorkStage {
  if (session.status === 'completed') return 'completed';
  if (session.status === 'cancelled') return 'cancelled';
  if (session.programs.length === 0) return 'needs-preparation';
  if (completed === 0) return 'ready';
  if (completed === session.programs.length) return 'ready-to-wrap';
  return 'in-progress';
}

function deriveTimeRelation(session: MasterSessionDto, now: Date): SessionTimeRelation {
  const today = getSeoulSessionDay(now);
  const sessionDay = getSeoulSessionDay(session.startAt);
  if (session.status === 'scheduled' && new Date(session.endAt).getTime() < now.getTime()) return 'overdue';
  if (sessionDay === today) return 'today';
  return sessionDay > today ? 'upcoming' : 'past';
}

function derivePrimary(stage: MasterSessionWorkStage, timeRelation: SessionTimeRelation, attendanceMissing: boolean) {
  if (stage === 'cancelled') return { intent: null, label: null } as const;
  if (stage === 'completed') return attendanceMissing
    ? { intent: 'record-attendance', label: MASTER_ACTION_COPY.recordAttendance } as const
    : { intent: 'view-session', label: MASTER_ACTION_COPY.viewSession } as const;
  if (timeRelation === 'overdue' && stage !== 'ready-to-wrap') {
    return { intent: 'view-session', label: '수업 상태 확인' } as const;
  }
  if (stage === 'needs-preparation') return { intent: 'prepare-session', label: MASTER_ACTION_COPY.prepareSession } as const;
  if (stage === 'ready') return { intent: 'open-session', label: MASTER_ACTION_COPY.openSession } as const;
  if (stage === 'in-progress') return { intent: 'continue-session', label: MASTER_ACTION_COPY.continueSession } as const;
  return { intent: 'wrap-session', label: MASTER_ACTION_COPY.wrapSession } as const;
}

export function deriveMasterSessionWorkState(
  session: MasterSessionDto,
  classItem: MasterClassDto | null | undefined,
  now: Date = new Date(),
): MasterSessionWorkState {
  const total = session.programs.length;
  const completed = session.programs.filter((program) => program.isCompleted).length;
  const stage = deriveStage(session, completed);
  const timeRelation = deriveTimeRelation(session, now);
  const attendanceMissing = stage === 'completed'
    && Boolean(classItem?.studentIds.length)
    && session.attendance.length === 0;
  const primary = derivePrimary(stage, timeRelation, attendanceMissing);
  const operationalLabel = timeRelation === 'overdue'
    ? '수업 상태 확인 필요'
    : stage === 'needs-preparation'
      ? '수업 준비 필요'
      : stage === 'ready'
        ? '준비됨'
        : stage === 'in-progress'
          ? `진행 ${completed}/${total}`
          : stage === 'ready-to-wrap'
            ? '마무리 필요'
            : attendanceMissing
              ? '출석 미기록'
              : stage === 'completed' ? '완료' : '취소';

  return {
    lifecycle: session.status,
    stage,
    timeRelation,
    progress: { completed, total },
    attention: {
      needsActivities: stage === 'needs-preparation',
      incompleteActivities: stage === 'in-progress',
      allActivitiesDone: stage === 'ready-to-wrap' || stage === 'completed',
      attendanceMissing,
      overdue: timeRelation === 'overdue',
    },
    primaryIntent: primary.intent,
    primaryLabel: primary.label,
    operationalLabel,
    href: buildActivitySessionHref(session.id),
  };
}

export type MasterWorkQueueItem = { session: MasterSessionDto; classItem: MasterClassDto | null; workState: MasterSessionWorkState };

const QUEUE_PRIORITY: Record<string, number> = {
  overdue: 0,
  'ready-to-wrap': 1,
  'in-progress': 2,
  attendance: 3,
  ready: 4,
  'needs-preparation': 5,
  upcoming: 6,
  completed: 7,
};

export function getMasterWorkQueuePriority(state: MasterSessionWorkState) {
  if (state.attention.overdue) return QUEUE_PRIORITY.overdue;
  if (state.stage === 'ready-to-wrap') return QUEUE_PRIORITY['ready-to-wrap'];
  if (state.stage === 'in-progress') return QUEUE_PRIORITY['in-progress'];
  if (state.attention.attendanceMissing) return QUEUE_PRIORITY.attendance;
  if (state.stage === 'ready') return QUEUE_PRIORITY.ready;
  if (state.stage === 'needs-preparation') return QUEUE_PRIORITY['needs-preparation'];
  if (state.timeRelation === 'upcoming') return QUEUE_PRIORITY.upcoming;
  return QUEUE_PRIORITY.completed;
}

export function buildMasterWorkQueue({ sessions, classes, now = new Date(), overdueHorizonDays = 14 }: {
  sessions: MasterSessionDto[];
  classes: MasterClassDto[];
  now?: Date;
  overdueHorizonDays?: number;
}): MasterWorkQueueItem[] {
  const classesById = new Map(classes.map((item) => [item.id, item]));
  const horizon = now.getTime() - overdueHorizonDays * 24 * 60 * 60 * 1000;
  return sessions.flatMap((session) => {
    if (session.status === 'cancelled') return [];
    const classItem = classesById.get(session.classId) ?? null;
    const workState = deriveMasterSessionWorkState(session, classItem, now);
    const actionable = workState.timeRelation === 'today'
      || workState.timeRelation === 'upcoming'
      || (workState.attention.attendanceMissing && new Date(session.endAt).getTime() >= horizon)
      || (workState.attention.overdue && new Date(session.endAt).getTime() >= horizon);
    return actionable ? [{ session, classItem, workState }] : [];
  }).sort((left, right) => getMasterWorkQueuePriority(left.workState) - getMasterWorkQueuePriority(right.workState)
    || new Date(left.session.startAt).getTime() - new Date(right.session.startAt).getTime()
    || left.session.id.localeCompare(right.session.id));
}
