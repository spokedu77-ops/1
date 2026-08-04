export type TodayLessonNextActionKind =
  | 'select_lesson'
  | 'review_preparation'
  | 'continue_record'
  | 'create_record'
  | 'view_record';

export type TodayLessonNextActionReason =
  | 'no_today_lesson'
  | 'today_lesson_selected'
  | 'same_program_record_draft'
  | 'same_program_execution_without_record'
  | 'same_program_record_saved';

export type TodayLessonNextActionInput = {
  todayLesson: {
    programId: string;
    title: string;
  } | null;
  recordDraft: {
    id?: string;
    programId?: string;
  } | null;
  savedRecord: {
    id: string;
    programId?: string;
  } | null;
  recentSpomove: {
    presetId?: string;
    programId?: string;
  } | null;
};

export type TodayLessonNextActionRecommendation = {
  primary: {
    kind: TodayLessonNextActionKind;
    reason: TodayLessonNextActionReason;
    targetId?: string;
  };
  secondary: Array<
    | {
        kind: 'view_spomove';
        presetId?: string;
      }
    | {
        kind: 'create_report';
        recordId: string;
      }
  >;
};

function sameProgram(programId: string, candidate: string | null | undefined) {
  return candidate?.trim() === programId;
}

export function resolveTodayLessonNextAction(
  input: TodayLessonNextActionInput,
): TodayLessonNextActionRecommendation {
  const programId = input.todayLesson?.programId.trim();
  if (!programId) {
    return {
      primary: {
        kind: 'select_lesson',
        reason: 'no_today_lesson',
      },
      secondary: [],
    };
  }

  if (sameProgram(programId, input.recordDraft?.programId)) {
    return {
      primary: {
        kind: 'continue_record',
        reason: 'same_program_record_draft',
        targetId: input.recordDraft?.id,
      },
      secondary: [],
    };
  }

  const savedRecord = input.savedRecord;
  if (savedRecord && sameProgram(programId, savedRecord.programId)) {
    return {
      primary: {
        kind: 'view_record',
        reason: 'same_program_record_saved',
        targetId: savedRecord.id,
      },
      secondary: [{ kind: 'create_report', recordId: savedRecord.id }],
    };
  }

  if (sameProgram(programId, input.recentSpomove?.programId)) {
    return {
      primary: {
        kind: 'create_record',
        reason: 'same_program_execution_without_record',
      },
      secondary: [{ kind: 'view_spomove', presetId: input.recentSpomove?.presetId }],
    };
  }

  return {
    primary: {
      kind: 'review_preparation',
      reason: 'today_lesson_selected',
    },
    secondary: [],
  };
}
