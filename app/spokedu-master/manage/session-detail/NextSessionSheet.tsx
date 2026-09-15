'use client';

import { useState } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SPM_PRIMARY_BTN_FULL } from '../../lib/masterActionGrammar';
import { getMasterRequestErrorMessage } from '../../lib/masterRequestError';
import { addSeoulSessionDays, getSeoulSessionDay, seoulDateTimeInputToIso, toSeoulDateTimeInput } from '../../lib/sessionDateTime';
import { useOperationalData } from '../../operational/OperationalDataProvider';
import type { MasterSessionDto } from '../../types/operational';

function initialDateTime(source: MasterSessionDto, value: string, initialTargetDay?: string) {
  const nextDay = initialTargetDay ?? addSeoulSessionDays(getSeoulSessionDay(source.startAt), 7);
  return `${nextDay}${toSeoulDateTimeInput(value).slice(10)}`;
}

export function NextSessionSheet({ source, open, initialTargetDay, nested = true, onClose, onCreated }: {
  source: MasterSessionDto;
  open: boolean;
  initialTargetDay?: string;
  nested?: boolean;
  onClose: () => void;
  onCreated: (session: MasterSessionDto) => void;
}) {
  const data = useOperationalData();
  const [startAt, setStartAt] = useState(() => initialDateTime(source, source.startAt, initialTargetDay));
  const [endAt, setEndAt] = useState(() => initialDateTime(source, source.endAt, initialTargetDay));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await data.createNextSession(source.id, {
        startAt: seoulDateTimeInputToIso(startAt),
        endAt: seoulDateTimeInputToIso(endAt),
      });
      onCreated(created);
    } catch (caught) {
      setError(getMasterRequestErrorMessage(caught, '다음 수업을 만들지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  const footer = <div className="border-t border-slate-200 bg-white pt-3 pb-[max(4px,env(safe-area-inset-bottom))]">
    <button type="button" disabled={saving} onClick={() => void create()} className={`${SPM_PRIMARY_BTN_FULL} min-h-11 w-full`}>
      {saving ? '만드는 중…' : '다음 수업 만들기'}
    </button>
  </div>;

  return <BottomSheet nested={nested} open={open} title="다음 수업 만들기" onClose={onClose} footer={footer} initialFocusSelector="input[type=date]">
    <div className="min-w-0 space-y-6 pt-1">
      <div>
        <p className="text-[17px] font-semibold text-slate-950">{source.className}</p>
        <p className="mt-1 text-sm text-slate-500">지난 회차의 수업반과 출석부를 이어받습니다.</p>
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
      <div className="border-t border-slate-100 pt-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">출석부 {source.roster?.length ?? source.attendance.length}명 유지</p>
        <p className="mt-1">활동과 메모는 새로 시작합니다.</p>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  </BottomSheet>;
}
