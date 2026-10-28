'use client';

import type { TeacherInput } from '@/app/admin/classes-shared/types';
import { DAY_NAMES, MONDAY_FIRST_DAYS, daySettings, type CreateScheduleForm, type DaySchedule } from '../lib/createSchedule';

export type ScheduleTeacher = { id: string; name: string };
const control = 'mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900';

export function AssistantFields({ value, teachers, mainId, onChange, assistDefault }: {
  value: TeacherInput[]; teachers: ScheduleTeacher[]; mainId: string;
  onChange: (value: TeacherInput[]) => void; assistDefault: (id: string) => number;
}) {
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-600">보조강사 · 개별 회당 금액</span>{value.length < 2 ? <button type="button" onClick={() => onChange([...value, { id: '', price: 0 }])} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-blue-700">+ 보조강사 추가</button> : null}</div>
    {value.map((teacher, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] items-end gap-2">
      <label className="min-w-0 text-xs text-slate-600">보조 {index + 1}<select aria-label={`보조 ${index + 1} 강사`} value={teacher.id} className={control} onChange={(event) => onChange(value.map((item, i) => i === index ? { id: event.target.value, price: assistDefault(event.target.value) } : item))}><option value="">강사 선택</option>{teachers.filter((candidate) => candidate.id !== mainId && !value.some((item, i) => i !== index && item.id === candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
      <label className="text-xs text-slate-600">회당 금액(원)<input aria-label={`보조 ${index + 1} 수업료`} type="number" min="0" value={teacher.price} className={`${control} tabular-nums`} onChange={(event) => onChange(value.map((item, i) => i === index ? { ...item, price: Number(event.target.value) } : item))} /></label>
      <button type="button" aria-label={`보조 ${index + 1} 제거`} className="min-h-11 px-1 text-xs font-semibold text-rose-600" onClick={() => onChange(value.filter((_, i) => i !== index))}>제거</button>
    </div>)}
  </div>;
}

export function CreateScheduleFields({ form, overrides, teachers, onChange, onDays, onDayChange, onPreset, onCopy, mainDefault, assistDefault }: {
  form: CreateScheduleForm; overrides: Record<number, DaySchedule>; teachers: ScheduleTeacher[];
  onChange: (field: string, value: string | number | boolean) => void;
  onDays: (day: number) => void; onDayChange: (day: number, value: DaySchedule) => void;
  onPreset: (count: number) => void; onCopy: () => void;
  mainDefault: (id: string) => number; assistDefault: (id: string) => number;
}) {
  const single = form.repeatOnce || form.type === 'one_day_private' || form.type === 'one_day_center';
  const baseDay = new Date(`${form.startDate}T00:00:00`).getDay();
  const days = single ? [baseDay] : MONDAY_FIRST_DAYS.filter((day) => form.daysOfWeek.includes(day));
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">수업명<input className={control} value={form.title} onChange={(event) => onChange('title', event.target.value)} placeholder="수업명을 입력하세요" /></label><label className="text-xs font-semibold text-slate-600">첫 수업일<input type="date" className={control} value={form.startDate} onChange={(event) => onChange('startDate', event.target.value)} /></label></div>
    <div><p className="mb-2 text-xs font-semibold text-slate-500">빠른 선택</p><div className="flex flex-wrap gap-2">{[[0, '단일 수업'], [1, '주 1회'], [2, '주 2회'], [3, '주 3회'], [5, '주 5회']].map(([count, label]) => <button key={count} type="button" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold hover:border-blue-500 hover:bg-blue-50" onClick={() => onPreset(Number(count))}>{label}</button>)}</div></div>
    <div className="grid grid-cols-2 gap-4"><label className="text-xs font-semibold text-slate-600">총 회차<input aria-label="총 회차" type="number" min="1" max="500" disabled={single} className={control} value={single ? 1 : form.sessionCount} onChange={(event) => onChange('sessionCount', Number(event.target.value))} /></label><div className="text-xs font-semibold text-slate-600">반복<div className={`${control} flex items-center bg-slate-50`}>{single ? '한 번' : `매주 · 주 ${days.length}회`}</div></div></div>
    {!single ? <div><p className="mb-2 text-xs font-semibold text-slate-600">수업 요일 · 첫 수업일의 요일은 포함됩니다</p><div className="grid grid-cols-7 gap-1.5">{MONDAY_FIRST_DAYS.map((day) => <button key={day} type="button" aria-label={`${DAY_NAMES[day]}요일 선택`} aria-pressed={days.includes(day)} disabled={day === baseDay} onClick={() => onDays(day)} className={`min-h-11 rounded-xl border text-sm font-bold ${days.includes(day) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{DAY_NAMES[day]}</button>)}</div></div> : null}
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-bold text-slate-900">요일별 시간·강사</h3>{days.length > 1 ? <button type="button" onClick={onCopy} className="min-h-10 rounded-lg px-3 text-xs font-bold text-blue-700 hover:bg-blue-50">첫 요일 설정을 다른 요일에 복사</button> : null}</div>
    {days.map((day) => {
      const config = daySettings(form, overrides, day);
      const update = (patch: Partial<DaySchedule>) => onDayChange(day, { ...config, ...patch });
      return <section key={day} aria-label={`${DAY_NAMES[day]}요일 설정`} className="space-y-4 rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 bg-slate-50/60 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-slate-950">{DAY_NAMES[day]}요일 <span className="ml-2 font-medium text-slate-500">{config.startTime} · {config.durationMinutes}분</span></h4><span className="text-xs text-slate-500">회당 기준금액 · 시간 환산 없음</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><label className="min-w-0 text-xs font-semibold text-slate-600">시작 시간<input type="time" className={control} value={config.startTime} onChange={(event) => update({ startTime: event.target.value })} /></label><label className="text-xs font-semibold text-slate-600">수업 길이<select aria-label="수업 길이" className={control} value={config.durationMinutes} onChange={(event) => update({ durationMinutes: event.target.value })}>{[60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes}분</option>)}</select></label><label className="min-w-0 text-xs font-semibold text-slate-600">메인강사<select aria-label="메인강사" className={control} value={config.teacherId} onChange={(event) => update({ teacherId: event.target.value, price: mainDefault(event.target.value), assistants: config.assistants.filter((teacher) => teacher.id !== event.target.value) })}><option value="">강사 선택</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">메인 회당 금액(원)<input type="number" min="0" className={`${control} tabular-nums`} value={config.price} onChange={(event) => update({ price: Number(event.target.value) })} /></label></div>
        {config.teacherId ? <p className="text-xs leading-relaxed text-slate-500">메인 기준 {mainDefault(config.teacherId).toLocaleString('ko-KR')}원 · {config.price === mainDefault(config.teacherId) ? '기준금액 적용' : `개별 입력 ${config.price.toLocaleString('ko-KR')}원 적용`}</p> : null}
        <AssistantFields value={config.assistants} teachers={teachers} mainId={config.teacherId} onChange={(assistants) => update({ assistants })} assistDefault={assistDefault} />
      </section>;
    })}
  </div>;
}
