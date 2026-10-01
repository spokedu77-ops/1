'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMasterCanUseSpomove } from '../../access/MasterAccessProvider';
import { buildNextSessionCarryoverInput, isCarryoverProgramAvailable, selectableCarryoverIds, type SessionCarryoverMode } from '../../activity/sessionCarryover';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SPM_PRIMARY_BTN_FULL } from '../../lib/masterActionGrammar';
import { getMasterRequestErrorMessage } from '../../lib/masterRequestError';
import { addSeoulSessionDays, getSeoulSessionDay, seoulDateTimeInputToIso, toSeoulDateTimeInput } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import { useMasterStore } from '../../store';
import type { MasterSessionDto } from '../../types/operational';

function initialDateTime(source: MasterSessionDto, value: string, initialTargetDay?: string) {
  const nextDay = initialTargetDay ?? addSeoulSessionDays(getSeoulSessionDay(source.startAt), 7);
  return `${nextDay}${toSeoulDateTimeInput(value).slice(10)}`;
}

const COPY_MODES: Array<{ value: SessionCarryoverMode; label: string }> = [
  { value: 'none', label: '활동 없이 만들기' },
  { value: 'all', label: '모든 활동 가져오기' },
  { value: 'selective', label: '가져올 활동 선택' },
];

export function NextSessionSheet({ source, open, initialTargetDay, nested = true, onClose, onCreated }: {
  source: MasterSessionDto;
  open: boolean;
  initialTargetDay?: string;
  nested?: boolean;
  onClose: () => void;
  onCreated: (session: MasterSessionDto) => void;
}) {
  const data = useOperationalData();
  const canUseSpomove = useMasterCanUseSpomove();
  const programs = useMasterStore((state) => state.programs);
  const programsLoaded = useMasterStore((state) => state.programsLoaded);
  const reloadPrograms = useMasterStore((state) => state.reloadPrograms);
  const sourcePrograms = useMemo(() => [...source.programs].sort((a, b) => a.sortOrder - b.sortOrder), [source.programs]);
  const availableProgramIds = useMemo(() => new Set(programs.map((program) => Number(program.id))), [programs]);
  const selectableIds = useMemo(() => selectableCarryoverIds(sourcePrograms, [], availableProgramIds, canUseSpomove), [availableProgramIds, canUseSpomove, sourcePrograms]);
  const [copyMode, setCopyMode] = useState<SessionCarryoverMode>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => sourcePrograms.map((program) => program.id));
  const [startAt, setStartAt] = useState(() => initialDateTime(source, source.startAt, initialTargetDay));
  const [endAt, setEndAt] = useState(() => initialDateTime(source, source.endAt, initialTargetDay));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !programsLoaded) void reloadPrograms();
  }, [open, programsLoaded, reloadPrograms]);

  async function create() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const carryover = buildNextSessionCarryoverInput(copyMode, selectableIds, selectedIds);
      const created = await data.createNextSession(source.id, {
        startAt: seoulDateTimeInputToIso(startAt),
        endAt: seoulDateTimeInputToIso(endAt),
        ...carryover,
      });
      onCreated(created);
    } catch (caught) {
      setError(getMasterRequestErrorMessage(caught, '새 수업을 만들지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  const footer = <div className="border-t border-slate-200 bg-white pt-3 pb-[max(4px,env(safe-area-inset-bottom))]">
    <button type="button" disabled={saving || (sourcePrograms.length > 0 && !programsLoaded)} onClick={() => void create()} className={`${SPM_PRIMARY_BTN_FULL} min-h-11 w-full`}>
      {saving ? '만드는 중…' : sourcePrograms.length > 0 && !programsLoaded ? '활동 확인 중…' : '이전 수업으로 새 수업 만들기'}
    </button>
  </div>;

  return <BottomSheet nested={nested} open={open} title="이전 수업으로 새 수업 만들기" onClose={onClose} footer={footer} initialFocusSelector="input[type=date]">
    <div className="min-w-0 space-y-6 pt-1">
      <div>
        <p className="text-[17px] font-semibold text-slate-950">{source.className}</p>
        <p className="mt-1 text-sm text-slate-500">현재 수업반 명단을 사용합니다. 출석 결과와 메모, 기록은 가져오지 않습니다.</p>
      </div>
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <label className="min-w-0 text-[13px] font-semibold text-slate-700">날짜
          <input type="date" value={startAt.slice(0, 10)} onChange={(event) => { const day = event.target.value; setStartAt(`${day}${startAt.slice(10)}`); setEndAt(`${day}${endAt.slice(10)}`); }} className="mt-2 h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900" />
        </label>
        <fieldset className="min-w-0"><legend className="text-[13px] font-semibold text-slate-700">시간</legend>
          <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <input aria-label="시작 시간" type="time" value={startAt.slice(11, 16)} onChange={(event) => setStartAt(`${startAt.slice(0, 11)}${event.target.value}`)} className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-center text-base text-slate-900" />
            <span className="text-slate-400" aria-hidden>–</span>
            <input aria-label="종료 시간" type="time" value={endAt.slice(11, 16)} onChange={(event) => setEndAt(`${endAt.slice(0, 11)}${event.target.value}`)} className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-center text-base text-slate-900" />
          </div>
        </fieldset>
      </div>
      {sourcePrograms.length > 0 ? <fieldset className="space-y-3 border-t border-slate-100 pt-4">
        <legend className="text-sm font-semibold text-slate-800">활동 가져오기</legend>
        <div className="grid gap-2">
          {COPY_MODES.map((mode) => <label key={mode.value} className="flex min-h-10 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
            <input type="radio" name="copy-mode" value={mode.value} checked={copyMode === mode.value} onChange={() => setCopyMode(mode.value)} />
            {mode.label}
          </label>)}
        </div>
        {copyMode === 'selective' ? <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-3">
          {sourcePrograms.map((program) => {
            const available = programsLoaded && isCarryoverProgramAvailable(program, availableProgramIds, canUseSpomove);
            return <label key={program.id} className={`flex min-h-14 items-center gap-3 py-2 ${available ? 'text-slate-800' : 'text-slate-400'}`}>
              <input type="checkbox" disabled={!available} checked={available && selectedIds.includes(program.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, program.id] : current.filter((id) => id !== program.id))} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{program.programTitle ?? '이름 없는 활동'}</span>
                <span className="block text-xs">{program.sourceType === 'spomove' ? 'SPOMOVE' : '놀이체육'}{available ? '' : ' · 현재 가져올 수 없음'}</span>
              </span>
            </label>;
          })}
        </div> : null}
        {programsLoaded && selectableIds.length < sourcePrograms.length && copyMode !== 'selective' ? <p className="text-xs font-medium text-amber-700">현재 가져올 수 없는 활동 {sourcePrograms.length - selectableIds.length}개는 복사되지 않습니다. ‘가져올 활동 선택’에서 이유를 확인하세요.</p> : null}
      </fieldset> : <p className="border-t border-slate-100 pt-4 text-sm text-slate-500">등록된 활동 없음</p>}
      {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  </BottomSheet>;
}
