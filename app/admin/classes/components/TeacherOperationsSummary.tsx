"use client";

import { useMemo } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { TeacherFeeRow } from "@/app/admin/classes/lib/bulkSessionDefaults";
import {
  buildTeacherOperationsSummary,
  type CalendarDataStatus,
  type OperationsCalendarEvent,
  type OperationsSession,
} from "@/app/admin/classes-shared/lib/teacherOperationsSummary";
import type { TierFeeMap } from "@/app/lib/teacherTierSchedule";

type Props = {
  sessionsByGroupId: Record<string, OperationsSession[]>;
  teachers: TeacherFeeRow[];
  tierFeeMap: TierFeeMap;
  calendarEvents?: OperationsCalendarEvent[];
  calendarDataStatus?: CalendarDataStatus;
};

function won(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

export default function TeacherOperationsSummary({
  sessionsByGroupId,
  teachers,
  tierFeeMap,
  calendarEvents,
  calendarDataStatus,
}: Props) {
  const summary = useMemo(
    () => buildTeacherOperationsSummary({
      sessionsByGroupId,
      teachers,
      tierFeeMap,
      calendarEvents,
      calendarDataStatus,
    }),
    [sessionsByGroupId, teachers, tierFeeMap, calendarEvents, calendarDataStatus],
  );
  const teacherNames = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher.name?.trim() || "강사 정보 확인 필요"])),
    [teachers],
  );

  return (
    <details className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-left marker:hidden">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">강사 운영 요약</p>
          <p className="mt-0.5 text-[11px] text-slate-500">읽기 전용 · 저장된 금액과 조회된 일정 기준</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t border-slate-200 px-3 py-3">
        <section aria-labelledby="teacher-operations-people">
          <h3 id="teacher-operations-people" className="text-[11px] font-semibold text-slate-500">
            강사별 RANK · 수업료
          </h3>
          {summary.teachers.length > 0 ? (
            <div className="mt-2 grid min-w-0 gap-2 lg:grid-cols-2">
              {summary.teachers.map((teacher) => (
                <div key={teacher.key} className="min-w-0 rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words text-xs font-semibold text-slate-900">{teacher.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {teacher.role === "main" ? "메인" : "보조"}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700">{teacher.tierLabel}</span>
                    <span className="text-[11px] text-slate-500">인정 {teacher.lessonCount.toLocaleString("ko-KR")}회</span>
                  </div>
                  <dl className="mt-2 grid min-w-0 grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
                    <div className="flex min-w-0 justify-between gap-2 rounded bg-slate-50 px-2 py-1.5">
                      <dt className="shrink-0 text-slate-500">추천 기본료</dt>
                      <dd className="break-words text-right font-semibold tabular-nums text-slate-800">{won(teacher.recommendedFee)}</dd>
                    </div>
                    <div className="flex min-w-0 justify-between gap-2 rounded bg-slate-50 px-2 py-1.5">
                      <dt className="shrink-0 text-slate-500">저장 수업료</dt>
                      <dd className="break-words text-right font-semibold tabular-nums text-slate-800">
                        {teacher.storedFees.length > 0 ? teacher.storedFees.map(won).join(" · ") : "확인 필요"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-800">강사 배정 정보를 확인할 수 없습니다.</p>
          )}
        </section>

        <section aria-labelledby="teacher-operations-costs">
          <h3 id="teacher-operations-costs" className="text-[11px] font-semibold text-slate-500">
            그룹별 예상 강사 인건비
          </h3>
          <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
            {summary.groups.map((group, index) => (
              <div key={group.groupId} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[11px] font-semibold text-slate-700">{index + 1}사이클</p>
                <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-slate-600">예정 기준 <strong className="tabular-nums text-slate-900">{won(group.planned)}</strong></span>
                  <span className="text-slate-600">완료 기준 <strong className="tabular-nums text-slate-900">{won(group.completed)}</strong></span>
                </div>
                {group.excludedSessions > 0 ? (
                  <p className="mt-1 text-[10px] text-slate-500">취소·연기·삭제 {group.excludedSessions}회 제외</p>
                ) : null}
                {group.incomplete ? (
                  <p className="mt-1 text-[10px] font-medium text-amber-700">일부 금액 또는 보조강사 정보 누락 가능</p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">
            예상 비용이며 지급 확정액이 아닙니다. 마일리지와 시간 배수는 포함하지 않습니다.
          </p>
        </section>

        <section aria-labelledby="teacher-operations-conflicts">
          <h3 id="teacher-operations-conflicts" className="text-[11px] font-semibold text-slate-500">
            등록 일정 충돌 미리보기
          </h3>
          <div className={`mt-2 rounded-lg border px-2.5 py-2 ${
            summary.scheduleState === "conflicts"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : summary.scheduleState === "needs-review"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-700"
          }`}>
            <p className="flex items-start gap-1.5 text-[11px] font-semibold">
              {summary.scheduleState !== "not-found-in-scope" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
              <span>{summary.scheduleMessage}</span>
            </p>
            {summary.conflicts.length > 0 ? (
              <ul className="mt-1.5 space-y-1 pl-5 text-[10px]">
                {summary.conflicts.map((conflict) => (
                  <li key={conflict.key} className="list-disc break-words">
                    {conflict.message}
                    {conflict.teacherIds.length > 0
                      ? ` · ${conflict.teacherIds.map((id) => teacherNames.get(id) || "강사 확인 필요").join(", ")}`
                      : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">
            캘린더 조회 범위 안의 미리보기이며 저장을 차단하지 않습니다.
          </p>
        </section>
      </div>
    </details>
  );
}
