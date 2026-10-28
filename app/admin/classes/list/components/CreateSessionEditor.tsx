'use client';

import { AssistantFields, type ScheduleTeacher } from './CreateScheduleFields';
import { localDateInput, type CreateSession } from '../lib/createSchedule';

const control = 'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900';
export function CreateSessionEditor({ sessions, teachers, onChange, mainDefault, assistDefault }: {
  sessions: CreateSession[]; teachers: ScheduleTeacher[]; onChange: (sessions: CreateSession[]) => void;
  mainDefault: (id: string) => number; assistDefault: (id: string) => number;
}) {
  const update = (index: number, patch: Partial<CreateSession>) => onChange(sessions.map((session, i) => i === index ? { ...session, ...patch } : session));
  const moveStart = (index: number, startAt: Date) => {
    const session = sessions[index]!;
    const duration = session.endAt.getTime() - session.startAt.getTime();
    update(index, { startAt, endAt: new Date(startAt.getTime() + duration) });
  };
  return <section aria-label="회차별 일정 편집" className="space-y-3">
    <div><h3 className="text-base font-bold text-slate-950">회차별 최종 확인</h3><p className="mt-1 text-xs text-slate-500">개별 일정과 배정을 수정할 수 있습니다. 저장 시 기존 일정과의 강사 충돌을 다시 확인합니다.</p></div>
    {sessions.map((session, index) => <article key={index} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
      <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-slate-900">{index + 1}/{sessions.length}회차 <span className="ml-2 font-medium text-slate-500">{session.startAt.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })}</span></h4><button type="button" className="min-h-10 rounded-lg px-3 text-xs font-bold text-rose-600 hover:bg-rose-50" onClick={() => onChange(sessions.filter((_, i) => i !== index).map((row, i) => ({ ...row, roundIndex: i + 1 })))}>회차 삭제</button></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="min-w-0 text-xs font-semibold text-slate-600">날짜<input type="date" value={localDateInput(session.startAt)} className={control} onChange={(event) => { if (!event.target.value) return; const start = new Date(`${event.target.value}T${session.startAt.toTimeString().slice(0, 5)}`); moveStart(index, start); }} /></label>
        <label className="min-w-0 text-xs font-semibold text-slate-600">시작 시간<input type="time" value={session.startAt.toTimeString().slice(0, 5)} className={control} onChange={(event) => { if (!event.target.value) return; moveStart(index, new Date(`${localDateInput(session.startAt)}T${event.target.value}`)); }} /></label>
        <label className="min-w-0 text-xs font-semibold text-slate-600">수업 길이(분)<input type="number" min="1" className={control} value={(session.endAt.getTime() - session.startAt.getTime()) / 60_000} onChange={(event) => update(index, { endAt: new Date(session.startAt.getTime() + Number(event.target.value) * 60_000) })} /></label>
        <label className="min-w-0 text-xs font-semibold text-slate-600">메인강사<select value={session.teacherId} className={control} onChange={(event) => update(index, { teacherId: event.target.value, price: mainDefault(event.target.value), assistants: session.assistants.filter((teacher) => teacher.id !== event.target.value) })}><option value="">강사 선택</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">메인 회당 금액(원)<input type="number" min="0" value={session.price} className={`${control} tabular-nums`} onChange={(event) => update(index, { price: Number(event.target.value) })} /></label>
      </div>
      <AssistantFields value={session.assistants} teachers={teachers} mainId={session.teacherId} onChange={(assistants) => update(index, { assistants })} assistDefault={assistDefault} />
    </article>)}
  </section>;
}
