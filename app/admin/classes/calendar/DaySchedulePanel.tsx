"use client";

import { X } from "lucide-react";
import type { SessionEvent } from "@/app/admin/classes-shared/types";
import { formatTimeShort, toDate } from "./lib/dateGrid";

function statusLabel(status?: string | null) {
  if (status === "postponed") return "연기";
  if (status === "cancelled" || status === "deleted") return "취소";
  if (status === "finished" || status === "verified" || status === "completed") return "완료";
  return "예정";
}

export function DaySchedulePanel({ day, events, onClose, onOpen }: { day: Date | null; events: SessionEvent[]; onClose: () => void; onOpen: (event: SessionEvent) => void }) {
  if (!day) return null;
  return (
    <div className="fixed inset-0 z-[390] flex items-end justify-end bg-slate-950/35 p-0 min-[700px]:items-stretch min-[700px]:p-4" role="dialog" aria-modal="true" aria-labelledby="day-schedule-title">
      <button type="button" aria-label="날짜별 수업 목록 닫기" className="absolute inset-0" onClick={onClose} />
      <aside className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl min-[700px]:h-full min-[700px]:max-h-none min-[700px]:max-w-xl min-[700px]:rounded-3xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div><p className="text-xs font-extrabold text-blue-600">날짜별 전체 일정</p><h2 id="day-schedule-title" className="mt-1 text-xl font-black text-slate-950">{day.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</h2><p className="mt-1 text-sm text-slate-500">시간순 {events.length}개 수업</p></div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100" aria-label="닫기"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {events.length === 0 ? <div className="grid min-h-48 place-items-center rounded-2xl bg-slate-50 text-sm font-bold text-slate-500">등록된 수업이 없습니다.</div> : events.map((event) => {
            const assistants = event.extraTeacherIds?.length ?? 0;
            const cancelled = event.status === "cancelled" || event.status === "deleted";
            return <button key={event.id} type="button" onClick={() => onOpen(event)} className="grid w-full grid-cols-[3.75rem_minmax(0,1fr)_auto] gap-3 rounded-2xl border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/40"><strong className="pt-0.5 text-sm tabular-nums text-slate-900">{formatTimeShort(toDate(event.start))}</strong><span className="min-w-0"><span className={`block text-sm font-extrabold text-slate-950 ${cancelled ? "line-through text-slate-500" : ""}`}>{event.title}</span><span className="mt-1 block text-xs font-semibold text-slate-600">메인 {event.teacher || "미정"}{assistants > 0 ? ` · 보조 ${assistants}명` : ""}</span><span className="mt-1 block truncate text-xs text-slate-500">{event.studentsText || "기관 정보 없음"}</span></span><span className="flex flex-col items-end gap-1"><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700">{statusLabel(event.status)}</span>{event.roundInfo ? <span className="text-xs font-bold text-slate-500">{event.roundInfo}</span> : null}</span></button>;
          })}
        </div>
      </aside>
    </div>
  );
}
