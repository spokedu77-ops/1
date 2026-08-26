'use client';
import { useEffect, useState } from 'react';
import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterSessionDto } from '../types/operational';
import { fetchSessionCaptures } from '../lib/sessionCaptureClient';
import { SPM_PRIMARY_BTN_FULL } from '../lib/masterActionGrammar';
import type { NextSessionDraft } from './nextSession';

export function NextSessionPlanner({ source, draft, setDraft, selectedIds, setSelectedIds, unavailableIds, canUseRecords, saving, error, onCreate }: {
  source: MasterSessionDto; draft: NextSessionDraft; setDraft: (draft: NextSessionDraft) => void;
  selectedIds: string[]; setSelectedIds: (ids: string[]) => void; unavailableIds: Set<string>;
  canUseRecords: boolean; saving: boolean; error: string | null; onCreate: () => void;
}) {
  const [capture, setCapture] = useState<MasterClassRecordDto | null>(null);
  const [memoryError, setMemoryError] = useState(false);
  useEffect(() => { if (!canUseRecords) return; void fetchSessionCaptures(`session=${encodeURIComponent(source.id)}`).then((result) => { if (result.status === 'error') setMemoryError(true); else setCapture(result.data[0] ?? null); }); }, [canUseRecords, source.id]);
  const availableIds = source.programs.filter((program) => !unavailableIds.has(program.id)).map((program) => program.id);
  return <div className="space-y-4 pb-3">
    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">수업반 · 이전 수업</p><p className="mt-1 truncate text-sm font-black text-slate-900">{source.className} · {source.startAt.slice(0, 10)}</p></div>
    {capture?.applicationIdea ? <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[11px] font-black text-emerald-700">지난 수업에서 이어갈 점</p><p className="mt-1 text-sm font-semibold text-emerald-900">{capture.applicationIdea}</p></div> : null}
    {memoryError ? <p className="text-xs font-bold text-amber-700">지난 수업 기록을 불러오지 못했습니다. 다음 수업은 계속 만들 수 있습니다.</p> : null}
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-black text-slate-600">날짜<input type="date" value={draft.day} onChange={(event) => setDraft({ ...draft, day: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" /></label><label className="text-xs font-black text-slate-600">시작<input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" /></label><label className="text-xs font-black text-slate-600">종료<input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value, endDayOffset: event.target.value <= draft.startTime ? 1 : 0 })} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold" /></label></div>
    <section><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-slate-800">다음 수업에도 가져갈 활동</h3><div><button type="button" onClick={() => setSelectedIds(availableIds)} className="min-h-11 px-2 text-xs font-black text-emerald-700">전체 선택</button><button type="button" onClick={() => setSelectedIds([])} className="min-h-11 px-2 text-xs font-black text-slate-500">전체 해제</button></div></div><div className="space-y-2">{source.programs.map((program) => { const unavailable = unavailableIds.has(program.id); return <label key={program.id} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 ${unavailable ? 'bg-slate-50 text-slate-400' : 'border-slate-200 text-slate-700'}`}><input type="checkbox" disabled={unavailable} checked={selectedIds.includes(program.id)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, program.id] : selectedIds.filter((id) => id !== program.id))} className="h-5 w-5" /><span className="min-w-0 flex-1 truncate text-sm font-bold">{program.programTitle ?? '이름 없는 활동'} <small>{program.sourceType === 'spomove' ? 'SPOMOVE' : '놀이체육'} · {program.isCompleted ? '지난 수업 완료' : '지난 수업 미완료'}</small>{unavailable ? <small className="block">현재 사용할 수 없음</small> : null}</span></label>; })}</div></section>
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p> : null}
    <button type="button" disabled={saving || !draft.day || !draft.startTime || !draft.endTime} onClick={onCreate} className={SPM_PRIMARY_BTN_FULL}>{saving ? '만드는 중…' : '다음 수업 생성'}</button>
  </div>;
}
