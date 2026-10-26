import { describe, expect, it } from "vitest";
import type { TeacherFeeRow } from "@/app/admin/classes/lib/bulkSessionDefaults";
import { HARD_CODED_TIER_FEES } from "@/app/lib/teacherTierSchedule";
import {
  buildTeacherOperationsSummary,
  type OperationsCalendarEvent,
  type OperationsSession,
} from "./teacherOperationsSummary";

const teacher = (id: string, sessionCount: number, logCount = 0): TeacherFeeRow => ({
  id,
  name: id.toUpperCase(),
  session_count: sessionCount,
  logCount,
  fee_private: null,
  fee_group: null,
  fee_center_main: null,
  fee_center_assist: null,
});

const session = (overrides: Partial<OperationsSession> = {}): OperationsSession => ({
  id: "session-1",
  group_id: "group-1",
  title: "수업 A",
  start_at: "2026-10-26T01:00:00.000Z",
  end_at: "2026-10-26T02:00:00.000Z",
  status: "opened",
  created_by: "main",
  price: 42_500,
  session_type: "regular_center",
  memo: "",
  ...overrides,
});

const build = (options: {
  sessions?: OperationsSession[];
  teachers?: ReturnType<typeof teacher>[];
  calendarEvents?: OperationsCalendarEvent[];
  calendarDataStatus?: "range-limited" | "incomplete" | "unavailable";
} = {}) => buildTeacherOperationsSummary({
  sessionsByGroupId: { "group-1": options.sessions ?? [session()] },
  teachers: options.teachers ?? [teacher("main", 50), teacher("assist", 105)],
  tierFeeMap: HARD_CODED_TIER_FEES,
  calendarEvents: options.calendarEvents ?? [],
  calendarDataStatus: options.calendarDataStatus ?? "range-limited",
});

describe("teacher operations summary", () => {
  it.each([
    [50, "rookie"],
    [51, "silver"],
    [105, "silver"],
    [106, "gold"],
    [165, "gold"],
    [166, "diamond"],
    [230, "diamond"],
    [231, "partner"],
  ] as const)("resolves the existing RANK boundary at %i", (count, tier) => {
    const result = build({ teachers: [teacher("main", count)] });
    expect(result.teachers[0]).toMatchObject({ lessonCount: count, tier });
  });

  it("uses session_count + logCount for RANK", () => {
    const result = build({ teachers: [teacher("main", 45, 6)] });
    expect(result.teachers[0]).toMatchObject({ lessonCount: 51, tier: "silver" });
  });

  it("reuses tier fees, prefers teacher overrides, and preserves stored zero", () => {
    const custom = {
      ...teacher("main", 51),
      fee_center_main: 55_000,
    };
    const result = build({
      teachers: [custom],
      sessions: [session({ price: 0 })],
    });
    expect(result.teachers[0]).toMatchObject({
      recommendedFee: 55_000,
      storedFees: [0],
    });
    expect(result.groups[0]?.planned).toBe(0);
  });

  it("uses the existing tier fallback when no teacher override exists", () => {
    const result = build({ teachers: [teacher("main", 106)] });
    expect(result.teachers[0]?.recommendedFee).toBe(HARD_CODED_TIER_FEES.gold.fee_center_main);
  });

  it("sums stored main and two assistant fees without duration multipliers", () => {
    const result = build({
      teachers: [teacher("main", 50), teacher("assist-1", 50), teacher("assist-2", 50)],
      sessions: [session({
        end_at: "2026-10-26T03:00:00.000Z",
        price: 40_000,
        memo: 'EXTRA_TEACHERS:[{"id":"assist-1","price":10000},{"id":"assist-2","price":15000}]',
      })],
    });
    expect(result.groups[0]?.planned).toBe(65_000);
    expect(result.teachers.filter((row) => row.role === "assist").map((row) => row.storedFees[0])).toEqual([10_000, 15_000]);
    expect(result.teachers.find((row) => row.teacherId === "assist-1")?.recommendedFee)
      .toBe(HARD_CODED_TIER_FEES.rookie.fee_center_assist);
  });

  it.each([
    [90, "2026-10-26T02:30:00.000Z"],
    [120, "2026-10-26T03:00:00.000Z"],
  ])("does not apply an automatic multiplier to a %i minute session", (_minutes, endAt) => {
    const result = build({ sessions: [session({ end_at: endAt, price: 40_000 })] });
    expect(result.groups[0]?.planned).toBe(40_000);
  });

  it("does not rewrite stored fees when RANK changes", () => {
    const before = build({ teachers: [teacher("main", 50)], sessions: [session({ price: 31_234, session_type: "regular_private" })] });
    const after = build({ teachers: [teacher("main", 51)], sessions: [session({ price: 31_234, session_type: "regular_private" })] });
    expect(before.teachers[0]?.recommendedFee).not.toBe(after.teachers[0]?.recommendedFee);
    expect(before.teachers[0]?.storedFees).toEqual([31_234]);
    expect(after.teachers[0]?.storedFees).toEqual([31_234]);
  });

  it("separates completed and planned costs and excludes operationally excluded statuses", () => {
    const result = build({
      sessions: [
        session({ id: "opened", price: 10_000, status: "opened" }),
        session({ id: "finished", price: 20_000, status: "finished" }),
        session({ id: "verified", price: 30_000, status: "verified" }),
        session({ id: "cancelled", price: 40_000, status: "cancelled" }),
        session({ id: "postponed", price: 50_000, status: "postponed" }),
        session({ id: "deleted", price: 60_000, status: "deleted" }),
      ],
    });
    expect(result.groups[0]).toMatchObject({
      planned: 10_000,
      completed: 50_000,
      excludedSessions: 3,
    });
  });

  it("marks totals incomplete instead of presenting missing fees as exact", () => {
    const result = build({ sessions: [session({ price: null })] });
    expect(result.groups[0]).toMatchObject({ planned: 0, incomplete: true });
    expect(result.costIncomplete).toBe(true);
  });

  it("finds main-main, main-assist, and assist-assist overlaps", () => {
    const target = session({
      memo: 'EXTRA_TEACHERS:[{"id":"assist","price":10000}]',
    });
    const events: OperationsCalendarEvent[] = [
      { id: "other-main", title: "메인 충돌", start: "2026-10-26T01:30:00.000Z", end: "2026-10-26T02:30:00.000Z", teacherId: "main" },
      { id: "other-assist", title: "보조 충돌", start: "2026-10-26T01:30:00.000Z", end: "2026-10-26T02:30:00.000Z", teacherId: "other", extraTeacherIds: ["main"] },
      { id: "assist-assist", title: "보조끼리 충돌", start: "2026-10-26T01:30:00.000Z", end: "2026-10-26T02:30:00.000Z", teacherId: "other", extraTeacherIds: ["assist"] },
    ];
    const result = build({ sessions: [target], calendarEvents: events });
    expect(result.conflicts).toHaveLength(3);
    expect(result.scheduleState).toBe("conflicts");
  });

  it("detects partial overlap but not exactly adjacent time or the same session", () => {
    const target = session();
    const result = build({
      sessions: [target],
      calendarEvents: [
        { id: target.id, title: "자기 자신", start: target.start_at, end: target.end_at, teacherId: "main" },
        { id: "adjacent", title: "이어지는 수업", start: target.end_at, end: "2026-10-26T03:00:00.000Z", teacherId: "main" },
        { id: "partial", title: "부분 중복", start: "2026-10-26T00:30:00.000Z", end: "2026-10-26T01:30:00.000Z", teacherId: "main" },
      ],
    });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.otherSessionId).toBe("partial");
  });

  it("detects duplicate assignment inside one session", () => {
    const result = build({
      sessions: [session({ memo: 'EXTRA_TEACHERS:[{"id":"main","price":10000}]' })],
    });
    expect(result.conflicts[0]?.message).toContain("중복 배정");
  });

  it("uses students_text as the legacy assistant fallback", () => {
    const target = session({ memo: "" });
    const result = build({
      sessions: [target],
      calendarEvents: [
        {
          id: target.id,
          title: target.title,
          start: target.start_at,
          end: target.end_at,
          teacherId: "main",
          studentsText: 'EXTRA_TEACHERS:[{"id":"assist","price":12000}]',
        },
        {
          id: "other",
          title: "기존 일정",
          start: "2026-10-26T01:30:00.000Z",
          end: "2026-10-26T02:30:00.000Z",
          teacherId: "assist",
        },
      ],
    });
    expect(result.groups[0]?.planned).toBe(54_500);
    expect(result.conflicts).toHaveLength(1);
  });

  it("never reports definitive availability when calendar data is incomplete", () => {
    const result = build({ calendarDataStatus: "incomplete" });
    expect(result.scheduleState).toBe("needs-review");
    expect(result.scheduleMessage).toContain("일정 확인 필요");
    expect(result.scheduleMessage).not.toContain("근무 가능");
  });

  it("excludes cancelled, postponed, and deleted calendar records from conflicts", () => {
    const target = session();
    const calendarEvents = ["cancelled", "postponed", "deleted"].map((status) => ({
      id: status,
      title: status,
      start: target.start_at,
      end: target.end_at,
      teacherId: "main",
      status,
    }));
    const result = build({ sessions: [target], calendarEvents });
    expect(result.conflicts).toHaveLength(0);
    expect(result.scheduleMessage).toBe("조회된 일정 내 중복 미발견");
  });

  it("requires review when legacy assistant data cannot be parsed", () => {
    const target = session({ memo: "EXTRA_TEACHERS:[broken" });
    const result = build({ sessions: [target] });
    expect(result.scheduleState).toBe("needs-review");
    expect(result.groups[0]?.incomplete).toBe(true);
  });
});
