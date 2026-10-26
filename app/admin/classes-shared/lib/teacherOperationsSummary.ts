import {
  resolveDefaultAssistSessionPrice,
  resolveDefaultSessionPrice,
  type TeacherFeeRow,
} from "@/app/admin/classes/lib/bulkSessionDefaults";
import { parseExtraTeachers } from "@/app/admin/classes-shared/lib/sessionUtils";
import {
  computeTier,
  tierLabelKo,
  totalLessonsFromCounts,
  type TeacherTierId,
  type TierFeeMap,
} from "@/app/lib/teacherTierSchedule";

const EXCLUDED_STATUSES = new Set(["cancelled", "postponed", "deleted"]);
const COMPLETED_STATUSES = new Set(["finished", "verified"]);

export type OperationsSession = {
  id: string;
  group_id: string;
  title?: string | null;
  start_at: string;
  end_at: string;
  status?: string | null;
  created_by?: string | null;
  price?: number | null;
  session_type?: string | null;
  memo?: string | null;
};

export type OperationsCalendarEvent = {
  id: string;
  title?: string | null;
  start: Date | string;
  end: Date | string;
  status?: string | null;
  teacherId?: string | null;
  extraTeacherIds?: string[];
  memo?: string | null;
  studentsText?: string | null;
};

export type CalendarDataStatus = "range-limited" | "incomplete" | "unavailable";

export type TeacherOperationsRow = {
  key: string;
  teacherId: string;
  name: string;
  role: "main" | "assist";
  tier: TeacherTierId;
  tierLabel: string;
  lessonCount: number;
  sessionType: string;
  recommendedFee: number;
  storedFees: number[];
};

export type GroupLaborCost = {
  groupId: string;
  completed: number;
  planned: number;
  excludedSessions: number;
  incomplete: boolean;
};

export type ScheduleConflict = {
  key: string;
  sessionId: string;
  otherSessionId?: string;
  teacherIds: string[];
  message: string;
};

export type TeacherOperationsSummary = {
  teachers: TeacherOperationsRow[];
  groups: GroupLaborCost[];
  conflicts: ScheduleConflict[];
  costIncomplete: boolean;
  scheduleState: "conflicts" | "not-found-in-scope" | "needs-review";
  scheduleMessage: string;
};

function finiteStoredAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAssistants(source: string | null | undefined) {
  const raw = source ?? "";
  const parsed = parseExtraTeachers(raw).extraTeachers;
  const hasMarker = raw.includes("EXTRA_TEACHERS:");
  const isExplicitlyEmpty = /EXTRA_TEACHERS:\s*\[\s*\]/.test(raw);
  const malformed = hasMarker && parsed.length === 0 && !isExplicitlyEmpty;
  return { assistants: parsed, malformed };
}

function assistantsForSession(
  session: OperationsSession,
  matchingEvent?: OperationsCalendarEvent,
) {
  const memoResult = parseAssistants(session.memo);
  if (memoResult.assistants.length > 0) return memoResult;
  const fallbackResult = parseAssistants(matchingEvent?.studentsText);
  if (fallbackResult.assistants.length > 0) return fallbackResult;
  return {
    assistants: [],
    malformed: memoResult.malformed || fallbackResult.malformed,
  };
}

function assignedTeacherIds(event: OperationsCalendarEvent): { ids: string[]; uncertain: boolean } {
  const ids: string[] = [];
  if (event.teacherId) ids.push(String(event.teacherId));

  let extras = (event.extraTeacherIds ?? []).map(String).filter(Boolean);
  let uncertain = false;
  if (extras.length === 0) {
    const memoResult = parseAssistants(event.memo);
    const legacyResult = memoResult.assistants.length > 0
      ? memoResult
      : parseAssistants(event.studentsText);
    extras = legacyResult.assistants.map((teacher) => String(teacher.id ?? "")).filter(Boolean);
    uncertain = memoResult.malformed || legacyResult.malformed;
  }
  ids.push(...extras);
  return { ids, uncertain };
}

function overlaps(
  left: { start: Date | string; end: Date | string },
  right: { start: Date | string; end: Date | string },
): boolean {
  const leftStart = new Date(left.start).getTime();
  const leftEnd = new Date(left.end).getTime();
  const rightStart = new Date(right.start).getTime();
  const rightEnd = new Date(right.end).getTime();
  if (![leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)) return false;
  return leftStart < rightEnd && rightStart < leftEnd;
}

function teacherInfo(teacher: TeacherFeeRow | undefined) {
  const lessonCount = totalLessonsFromCounts(teacher?.session_count, teacher?.logCount);
  const tier = computeTier(lessonCount);
  return { lessonCount, tier, tierLabel: tierLabelKo(tier) };
}

export function buildTeacherOperationsSummary(input: {
  sessionsByGroupId: Record<string, OperationsSession[]>;
  teachers: TeacherFeeRow[];
  tierFeeMap: TierFeeMap;
  calendarEvents?: OperationsCalendarEvent[];
  calendarDataStatus?: CalendarDataStatus;
}): TeacherOperationsSummary {
  const sessions = Object.values(input.sessionsByGroupId).flat();
  const teacherById = new Map(input.teachers.map((teacher) => [teacher.id, teacher]));
  const eventById = new Map((input.calendarEvents ?? []).map((event) => [String(event.id), event]));
  const teacherRows = new Map<string, TeacherOperationsRow>();
  let costIncomplete = false;

  const addTeacherRow = (
    teacherId: string,
    role: "main" | "assist",
    sessionType: string,
    storedFee: unknown,
  ) => {
    if (!teacherId) {
      costIncomplete = true;
      return;
    }
    const teacher = teacherById.get(teacherId);
    const info = teacherInfo(teacher);
    const key = `${role}:${teacherId}:${sessionType}`;
    const amount = finiteStoredAmount(storedFee);
    const existing = teacherRows.get(key);
    if (existing) {
      if (amount !== null && !existing.storedFees.includes(amount)) existing.storedFees.push(amount);
      return;
    }
    teacherRows.set(key, {
      key,
      teacherId,
      name: teacher?.name?.trim() || "강사 정보 확인 필요",
      role,
      ...info,
      sessionType,
      recommendedFee: role === "main"
        ? resolveDefaultSessionPrice(teacher, sessionType, input.tierFeeMap)
        : resolveDefaultAssistSessionPrice(teacher, sessionType, input.tierFeeMap),
      storedFees: amount === null ? [] : [amount],
    });
    if (!teacher || amount === null) costIncomplete = true;
  };

  const groups = Object.entries(input.sessionsByGroupId).map(([groupId, rows]) => {
    let completed = 0;
    let planned = 0;
    let excludedSessions = 0;
    let incomplete = false;

    for (const session of rows) {
      const status = String(session.status ?? "");
      if (EXCLUDED_STATUSES.has(status)) {
        excludedSessions += 1;
        continue;
      }

      const sessionType = session.session_type?.trim() || "regular_private";
      const mainFee = finiteStoredAmount(session.price);
      if (mainFee === null) incomplete = true;
      if (session.created_by) addTeacherRow(session.created_by, "main", sessionType, session.price);
      else incomplete = true;

      const assistantResult = assistantsForSession(session, eventById.get(session.id));
      if (assistantResult.malformed) incomplete = true;
      let sessionTotal = mainFee ?? 0;
      for (const assistant of assistantResult.assistants) {
        const teacherId = String(assistant.id ?? "").trim();
        const fee = finiteStoredAmount(assistant.price);
        if (!teacherId || fee === null) incomplete = true;
        if (fee !== null) sessionTotal += fee;
        addTeacherRow(teacherId, "assist", sessionType, assistant.price);
      }

      if (COMPLETED_STATUSES.has(status)) completed += sessionTotal;
      else planned += sessionTotal;
    }

    costIncomplete ||= incomplete;
    return { groupId, completed, planned, excludedSessions, incomplete };
  });

  const conflicts = new Map<string, ScheduleConflict>();
  let assignmentUncertain = false;
  const calendarEvents = (input.calendarEvents ?? []).filter(
    (event) => !EXCLUDED_STATUSES.has(String(event.status ?? "")),
  );

  for (const session of sessions) {
    if (EXCLUDED_STATUSES.has(String(session.status ?? ""))) continue;
    const matchingEvent = eventById.get(session.id);
    const assistantResult = assistantsForSession(session, matchingEvent);
    assignmentUncertain ||= assistantResult.malformed;
    const ownIds = [
      String(session.created_by ?? "").trim(),
      ...assistantResult.assistants.map((teacher) => String(teacher.id ?? "").trim()),
    ].filter(Boolean);

    const duplicates = [...new Set(ownIds.filter((id, index) => ownIds.indexOf(id) !== index))];
    if (duplicates.length > 0) {
      const key = `duplicate:${session.id}:${duplicates.sort().join(",")}`;
      conflicts.set(key, {
        key,
        sessionId: session.id,
        teacherIds: duplicates,
        message: `${session.title || "선택 수업"}: 같은 강사가 메인·보조 또는 보조에 중복 배정됨`,
      });
    }

    for (const event of calendarEvents) {
      if (String(event.id) === session.id) continue;
      if (!overlaps(
        { start: session.start_at, end: session.end_at },
        { start: event.start, end: event.end },
      )) continue;
      const other = assignedTeacherIds(event);
      assignmentUncertain ||= other.uncertain;
      const shared = [...new Set(ownIds.filter((id) => other.ids.includes(id)))].sort();
      if (shared.length === 0) continue;
      const pair = [session.id, String(event.id)].sort();
      const key = `overlap:${pair.join(":")}:${shared.join(",")}`;
      conflicts.set(key, {
        key,
        sessionId: session.id,
        otherSessionId: String(event.id),
        teacherIds: shared,
        message: `${session.title || "선택 수업"} ↔ ${event.title || "기존 일정"}: 시간 중복`,
      });
    }
  }

  const conflictList = [...conflicts.values()];
  const scheduleNeedsReview = input.calendarDataStatus !== "range-limited" || assignmentUncertain;
  const scheduleState = conflictList.length > 0
    ? "conflicts"
    : scheduleNeedsReview
      ? "needs-review"
      : "not-found-in-scope";
  const scheduleMessage = conflictList.length > 0
    ? `조회된 일정에서 ${conflictList.length}건의 중복 가능성을 발견했습니다.`
    : scheduleNeedsReview
      ? "일정 확인 필요 — 조회 상태 또는 보조강사 정보가 불완전합니다."
      : "조회된 일정 내 중복 미발견";

  return {
    teachers: [...teacherRows.values()].sort((left, right) =>
      left.role.localeCompare(right.role) || left.name.localeCompare(right.name, "ko")),
    groups,
    conflicts: conflictList,
    costIncomplete,
    scheduleState,
    scheduleMessage,
  };
}
