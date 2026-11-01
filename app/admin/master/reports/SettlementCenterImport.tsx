'use client';

import { useEffect, useState } from 'react';
import type { SettlementRow } from './settlementSheetCore';
import { dueDate, emptyRow } from './settlementSheetCore';
import { readCenterSettlementDefaults, type CenterSettlementDefaults } from '@/app/lib/centers/settlementDefaults';

type CenterOption = {
  defaults: CenterSettlementDefaults;
  mainZeroFee?: boolean; assistZeroFee?: boolean;
  id: string; name: string; region: string | null;
  sessionFee: number | null; mainFee: number | null; assistFee: number | null;
};
const inputClass = 'h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs tabular-nums';
const validAmount = (value: string) => value.trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0;

export default function SettlementCenterImport({ monthKey, disabled, existingIds, onAdd, expanded = false }: {
  monthKey: string; disabled: boolean; existingIds: string[]; onAdd: (row: SettlementRow) => void; expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CenterOption[]>([]);
  const [selected, setSelected] = useState<CenterOption | null>(null);
  const [fee, setFee] = useState('');
  const [main, setMain] = useState('');
  const [assist, setAssist] = useState('');
  const [sessions, setSessions] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setResults([]);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/settlement-centers?scope=import&q=${encodeURIComponent(query)}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const body = await response.json() as { centers: CenterOption[] };
        if (!controller.signal.aborted) setResults(body.centers);
      } catch { if (!controller.signal.aborted) setError('센터 목록을 불러오지 못했습니다.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [open, query, disabled, retry]);
  const select = (center: CenterOption) => {
    setSelected(center); setFee(center.sessionFee == null ? '' : String(center.sessionFee));
    setMain(center.mainFee == null ? '' : String(center.mainFee));
    setAssist(center.assistFee == null ? '' : String(center.assistFee)); setSessions(center.defaults.sessions == null ? '' : String(center.defaults.sessions));
  };
  const labor = (selected?.mainZeroFee ? 0 : Number(main)) + (selected?.assistZeroFee ? 0 : Number(assist));
  const count = Number(sessions);
  const canAdd = Boolean(selected) && !disabled && validAmount(fee) && validAmount(main) && validAmount(assist)
    && Number.isSafeInteger(labor) && Number.isSafeInteger(count) && count > 0
    && Number.isSafeInteger(Number(fee) * count) && Number.isSafeInteger(labor * count)
    && !existingIds.includes(selected?.id ?? '');
  return <div className={expanded ? "mt-2 border-t border-slate-100" : "rounded-lg border border-slate-200 bg-white"}>
    {!expanded && <button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen((value) => !value)}
      className="flex min-h-9 w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-700 disabled:opacity-50">
      <span>센터 DB에서 수업 추가</span><span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>}
    {open && !disabled ? <div className="space-y-3 border-t border-slate-100 p-3">
      <input aria-label="추가할 센터 검색" placeholder="센터명 검색" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} />
      {loading ? <p role="status" className="text-xs text-slate-500">불러오는 중…</p> : error ? <p role="alert" className="text-xs text-red-600">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="underline">다시 시도</button></p> : <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
        {results.map((center) => <button type="button" key={center.id} disabled={existingIds.includes(center.id)} onClick={() => select(center)}
          className={`rounded-md border px-2 py-1.5 text-xs disabled:opacity-40 ${selected?.id === center.id ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700'}`}>
          {center.name}{center.region ? ` · ${center.region}` : ''}{existingIds.includes(center.id) ? ' · 추가됨' : ''}
        </button>)}
        {!results.length ? <p className="text-xs text-slate-500">검색 결과가 없습니다.</p> : null}
      </div>}
      {selected ? <div className="space-y-2 border-t border-slate-100 pt-2">
        <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([['센터 수업료 / 회', fee, setFee], ['메인 강사료 / 회', main, setMain], ['보조 강사료 합계 / 회', assist, setAssist], ['회기', sessions, setSessions]] as const).map(([label, value, setValue]) => <label key={label} className="space-y-1 text-xs text-slate-500">
            <span>{label}</span><input disabled={(setValue === setMain && selected.mainZeroFee) || (setValue === setAssist && selected.assistZeroFee)} type="number" min={label === '회기' ? 1 : 0} step={1} max={Number.MAX_SAFE_INTEGER} value={value} onChange={(event) => setValue(event.target.value)} placeholder="직접 입력" className={inputClass} />
          </label>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">메인·보조 합계를 경비(인건비)에 반영합니다. 추가 후 시트에서 수정할 수 있습니다.</p>
          <button type="button" disabled={!canAdd} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40" onClick={() => {
            if (!selected || !canAdd) return;
            const defaults = readCenterSettlementDefaults(selected.defaults);
            onAdd({ ...emptyRow(), operationalCenterId: selected.id, name: selected.name, fee: Number(fee), sessions: count,
              cost: `${labor}*회기`, type: defaults.type, vatMode: defaults.vat, whRate: defaults.whRate, dueDate: dueDate(monthKey, defaults) });
            setSelected(null); setOpen(false);
          }}>이 달에 추가</button>
        </div>
      </div> : null}
    </div> : null}
  </div>;
}
