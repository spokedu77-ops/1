"use client";

import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { monthRowToneClassesForSessionType } from "../lib/sessionTypeCategory";
import { formatTimeShort, toDate } from "./lib/dateGrid";
import { sessionDisplayStatus } from "./lib/sessionDisplayStatus";

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
  now,
}: {
  ev: SessionEvent;
  isPastDay: boolean;
  onOpen: (ev: SessionEvent) => void;
  now: number;
}) {
  const start = toDate(ev.start);
  const r = roundLabel(ev);
  const fin = showFinBadge(ev);
  const struck = ev.status === "cancelled" || ev.status === "deleted";
  const strikeTitle = struck;
  const teacherShort = ev.teacher ? String(ev.teacher).trim() : "";
  // studentsText is also the feedback document, not a dedicated institution field.
  // Only a plain single-line label is safe to show in the calendar.
  const studentsText = String(ev.studentsText || "").trim();
  const institutionShort = /[\r\n]|EXTRA_TEACHERS:|주요\s*활동|✅|☑/.test(studentsText) ? "" : studentsText;

  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      className={`mx-1.5 mb-1.5 flex min-h-[74px] w-[calc(100%-0.75rem)] min-w-0 flex-col gap-1 rounded-xl border-l-4 px-2.5 py-2 text-left ${monthRowTone(ev)} ${isPastDay && !struck ? "opacity-80" : ""} hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-[10px] font-black tabular-nums text-slate-800">
          {formatTimeShort(start)}
        </span>
        <span className="shrink-0 flex flex-col items-end gap-0.5">
          {r ? (
            <span
              className={`whitespace-nowrap text-[10px] font-bold tabular-nums ${
                strikeTitle ? "line-through text-slate-500" : "text-slate-600"
              }`}
            >
              {r}
            </span>
          ) : null}
        </span>
      </div>
      <span className={`block w-full min-w-0 whitespace-normal [overflow-wrap:anywhere] text-[11px] font-extrabold leading-normal text-slate-950 ${strikeTitle ? "line-through text-slate-500" : ""}`}>
        {ev.title}
      </span>
      {institutionShort ? <span className="block w-full whitespace-normal [overflow-wrap:anywhere] text-[10px] leading-normal text-slate-600">{institutionShort}</span> : null}
      {teacherShort ? <span className="block w-full whitespace-normal [overflow-wrap:anywhere] text-[10px] font-semibold leading-normal text-slate-600">{teacherShort}</span> : null}
        <div
          className={`flex w-full min-w-0 flex-wrap items-center gap-1.5 ${
            strikeTitle ? "line-through text-slate-400" : "text-slate-500"
          }`}
        >
          <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-extrabold">{sessionDisplayStatus(ev, now)}</span>
          {fin ? <span className={FIN_BADGE_CLASS}>FIN</span> : null}
        </div>
    </button>
  );
}
