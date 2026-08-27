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
  const strikeTitle = struck || isPastDay;
  const teacherShort = ev.teacher ? String(ev.teacher).trim() : "";

  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      className={`w-full text-left border-b border-slate-200/80 last:border-b-0 px-0.5 py-1 min-w-0 flex flex-col gap-0.5 ${monthRowTone(ev)} hover:brightness-[0.97]`}
    >
      <div className="flex items-start gap-1 min-w-0">
        <span className="shrink-0 text-[9px] font-black text-slate-600 tabular-nums w-9">
          {formatTimeShort(start)}
        </span>
        <span
          className={`min-w-0 flex-1 text-[10px] font-bold text-slate-900 leading-snug line-clamp-2 break-words ${
            strikeTitle ? "line-through text-slate-500" : ""
          }`}
        >
          {ev.title}
        </span>
        <span className="shrink-0 flex flex-col items-end gap-0.5">
          {r ? (
            <span
              className={`text-[9px] font-black tabular-nums whitespace-nowrap ${
                strikeTitle ? "line-through text-slate-500" : "text-slate-600"
              }`}
            >
              {r}
            </span>
          ) : null}
        </span>
      </div>
      {teacherShort || fin ? (
        <div
          className={`pl-9 flex min-w-0 items-center justify-between gap-1 ${
            strikeTitle ? "line-through text-slate-400" : "text-slate-500"
          }`}
        >
          <span className="min-w-0 flex-1 truncate text-[8px] font-bold">{teacherShort || "\u00A0"}</span>
          {fin ? <span className={FIN_BADGE_CLASS}>FIN</span> : null}
        </div>
      ) : null}
    </button>
  );
}
