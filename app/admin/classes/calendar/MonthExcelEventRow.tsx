"use client";

import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { monthRowToneClassesForSessionType } from "../lib/sessionTypeCategory";
import { formatTimeShort, toDate } from "./lib/dateGrid";

function roundLabel(ev: SessionEvent) {
  if (ev.roundInfo) return ev.roundInfo;
  if (ev.roundIndex != null && ev.roundTotal != null) return `${ev.roundIndex}/${ev.roundTotal}`;
  return "";
}

function showFinBadge(ev: SessionEvent) {
  const ri = ev.roundIndex;
  const rt = ev.roundTotal;
  if (ri == null || rt == null || rt <= 0) return false;
  if (ri !== rt) return false;
  const st = ev.status;
  if (st === "postponed" || st === "cancelled" || st === "deleted") return false;
  return true;
}

function sessionTypeOf(ev: SessionEvent): string {
  return String(ev.type ?? ev.session_type ?? "").trim();
}

function statusLabel(status: string | null | undefined): string {
  if (status === "postponed") return "연기";
  if (status === "cancelled" || status === "deleted") return "취소";
  if (status === "finished" || status === "verified" || status === "completed") return "완료";
  return "예정";
}

function monthRowTone(ev: SessionEvent): string {
  if (ev.status === "cancelled" || ev.status === "deleted")
    return "bg-rose-200 border-2 border-rose-600 shadow-sm";
  if (ev.status === "postponed") return "bg-violet-200 border-2 border-violet-600 shadow-sm";

  const st = sessionTypeOf(ev);
  const teacherLabel = String(ev.teacher || "").trim();
  const mainUndecided = !ev.teacherId || teacherLabel.startsWith("미정");

  /** 특강은 항상 샛노란. 미정이면 테두리만 빨강(기존 분홍 덮어쓰기 방지). */
  if (st === "special_lecture") {
    if (mainUndecided) {
      return `bg-[#FFE100] border-2 border-red-600 shadow-sm`;
    }
    return monthRowToneClassesForSessionType("special_lecture");
  }

  if (mainUndecided) return "bg-red-100 border-2 border-red-500 shadow-sm";
  return monthRowToneClassesForSessionType(ev.type);
}

const FIN_BADGE_CLASS =
  "inline-flex items-center justify-center px-1 py-px rounded leading-none text-[8px] font-black bg-red-600 text-white shadow-sm shrink-0";

export function MonthExcelEventRow({
  ev,
  isPastDay,
  onOpen,
}: {
  ev: SessionEvent;
  isPastDay: boolean;
  onOpen: (ev: SessionEvent) => void;
}) {
  const start = toDate(ev.start);
  const r = roundLabel(ev);
  const fin = showFinBadge(ev);
  const struck = ev.status === "cancelled" || ev.status === "deleted";
  const strikeTitle = struck;
  const teacherShort = ev.teacher ? String(ev.teacher).trim() : "";
  const institutionShort = ev.studentsText ? String(ev.studentsText).trim() : "";
  const assignmentLabel = [institutionShort, teacherShort].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      className={`mx-1.5 mb-1.5 flex min-h-[74px] w-[calc(100%-0.75rem)] min-w-0 flex-col gap-1 rounded-xl border-l-4 px-2.5 py-2 text-left ${monthRowTone(ev)} ${isPastDay && !struck ? "opacity-80" : ""} hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
    >
      <div className="flex items-start gap-1 min-w-0">
        <span className="w-10 shrink-0 text-xs font-black tabular-nums text-slate-800">
          {formatTimeShort(start)}
        </span>
        <span
          className={`min-w-0 flex-1 line-clamp-2 text-[13px] font-extrabold leading-[1.3] text-slate-950 ${
            strikeTitle ? "line-through text-slate-500" : ""
          }`}
        >
          {ev.title}
        </span>
        <span className="shrink-0 flex flex-col items-end gap-0.5">
          {r ? (
            <span
              className={`whitespace-nowrap text-[11px] font-bold tabular-nums ${
                strikeTitle ? "line-through text-slate-500" : "text-slate-600"
              }`}
            >
              {r}
            </span>
          ) : null}
        </span>
      </div>
      {assignmentLabel || fin ? (
        <div
          className={`pl-10 flex min-w-0 items-center justify-between gap-1.5 ${
            strikeTitle ? "line-through text-slate-400" : "text-slate-500"
          }`}
        >
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{assignmentLabel || "\u00A0"}</span>
          <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-extrabold">{statusLabel(ev.status)}</span>
          {fin ? <span className={FIN_BADGE_CLASS}>FIN</span> : null}
        </div>
      ) : null}
    </button>
  );
}
