'use client';

import { useEffect, useState } from 'react';
import SettlementSearchSelect from './SettlementSearchSelect';
import BillingVatToggle, { type BillingVatMode } from '@/app/admin/centers/components/BillingVatToggle';
import type { SettlementRow } from './settlementSheetCore';
import { dueDate, emptyRow } from './settlementSheetCore';
import { readCenterSettlementDefaults, type CenterSettlementDefaults } from '@/app/lib/centers/settlementDefaults';
import { centerBillingBreakdownSchema, totalCenterFee, type CenterBillingBreakdown } from '@/app/lib/centers/feeBreakdown';

type CenterOption = {
  defaults: CenterSettlementDefaults;
  mainZeroFee?: boolean; assistZeroFee?: boolean;
  id: string; name: string; region: string | null;
  sessionFee: number | null; mainFee: number | null; assistFee: number | null;
  billingBreakdown?: CenterBillingBreakdown | null;
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
  const [legacyFee, setLegacyFee] = useState('');
  const [main, setMain] = useState('');
  const [assist, setAssist] = useState('');
  const [mainCharge, setMainCharge] = useState('0');
  const [assistCharge, setAssistCharge] = useState('0');
  const [rentalCharge, setRentalCharge] = useState('0');
  const [billingVatMode, setBillingVatMode] = useState<BillingVatMode>('included');
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
    setSelected(center); setLegacyFee(center.sessionFee == null ? '' : String(center.sessionFee));
    setMain(center.mainZeroFee ? '0' : center.mainFee == null ? '' : String(center.mainFee));
    setAssist(center.assistZeroFee ? '0' : center.assistFee == null ? '' : String(center.assistFee));
    setMainCharge(center.billingBreakdown ? String(center.billingBreakdown.mainCharge) : '0');
    setAssistCharge(center.billingBreakdown ? String(center.billingBreakdown.assistCharge) : '0');
    setRentalCharge(center.billingBreakdown ? String(center.billingBreakdown.rentalCharge) : '0');
    setBillingVatMode(center.defaults.vat === 'none' ? 'none' : center.billingBreakdown?.vatIncluded === false ? 'excluded' : 'included');
    setSessions(center.defaults.sessions == null ? '' : String(center.defaults.sessions));
  };
  const labor = (selected?.mainZeroFee ? 0 : Number(main)) + (selected?.assistZeroFee ? 0 : Number(assist));
  const count = Number(sessions);
  const parsedBilling = centerBillingBreakdownSchema.safeParse({
    mainCharge: validAmount(mainCharge) ? Number(mainCharge) : null,
    assistCharge: validAmount(assistCharge) ? Number(assistCharge) : null,
    rentalCharge: validAmount(rentalCharge) ? Number(rentalCharge) : null,
    vatIncluded: billingVatMode !== 'excluded',
  });
  const fee = parsedBilling.success ? totalCenterFee(parsedBilling.data) : null;
  const canAdd = Boolean(selected) && !disabled && fee != null && validAmount(main) && validAmount(assist)
    && Number.isSafeInteger(fee)
    && Number.isSafeInteger(labor) && Number.isSafeInteger(count) && count > 0
    && Number.isSafeInteger(Number(fee) * count) && Number.isSafeInteger(labor * count)
    && !existingIds.includes(selected?.id ?? '');
  return <div className={expanded ? "mt-2 border-t border-slate-100" : "rounded-lg border border-slate-200 bg-white"}>
    {!expanded && <button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen((value) => !value)}
      className="flex min-h-9 w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-700 disabled:opacity-50">
      <span>센터 DB에서 수업 추가</span><span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>}
    {open && !disabled ? <div className="space-y-3 border-t border-slate-100 p-3">
      <SettlementSearchSelect label="센터명 검색 또는 선택" selectedLabel={selected ? `${selected.name}${selected.region ? ` · ${selected.region}` : ''}` : undefined}
        query={query} onQueryChange={setQuery} loading={loading} error={error} onRetry={() => setRetry((value) => value + 1)}
        options={results.map((center) => ({ id: center.id, label: center.name, detail: center.region || undefined, disabled: existingIds.includes(center.id) }))}
        onSelect={(id) => { const center = results.find((item) => item.id === id); if (center) select(center); }} />
      {selected ? <div className="space-y-2 border-t border-slate-100 pt-2">
        <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
        <fieldset className="min-w-0 space-y-2"><legend className="mb-2 text-xs font-semibold text-indigo-800">우리가 받는 회당 수업료</legend>
          <BillingVatToggle mode={billingVatMode} onChange={setBillingVatMode} />
          {billingVatMode === 'excluded' && parsedBilling.success && <p className="text-xs text-indigo-600">입력 금액 합계에 부가세 {Math.round((parsedBilling.data.mainCharge + parsedBilling.data.assistCharge + parsedBilling.data.rentalCharge) / 10).toLocaleString()}원을 합산합니다.</p>}
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
            {([['청구 주강사비 / 회', mainCharge, setMainCharge], ['청구 보조강사비 / 회', assistCharge, setAssistCharge], ['청구 대여비 / 회', rentalCharge, setRentalCharge]] as const).map(([label, value, setValue]) => <label key={label} className="min-w-0 space-y-1 text-xs text-slate-500"><span>{label}</span><input type="number" min={0} step={1} max={Number.MAX_SAFE_INTEGER} value={value} onChange={(event) => setValue(event.target.value)} placeholder="없으면 0 입력" className={inputClass} /></label>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800"><span>총 회당 수업료</span><output aria-label="회당 수업료 합계">{fee != null ? `${fee.toLocaleString()}원` : '청구 금액을 입력해 주세요.'}</output></div>
          {!selected.billingBreakdown && <p className="text-xs text-slate-500">기존 회당 수업료: {legacyFee ? `${Number(legacyFee).toLocaleString()}원` : '미설정'} · 청구 항목별 금액을 확인해 입력해 주세요.</p>}
        </fieldset>
        <fieldset className="min-w-0 space-y-2 border-t border-slate-100 pt-2"><legend className="text-xs font-semibold text-emerald-800">선생님이 받는 강사료</legend>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            {([['메인 선생님 수업료 / 회', main, setMain], ['보조 선생님 수업료 합계 / 회', assist, setAssist]] as const).map(([label, value, setValue]) => <label key={label} className="min-w-0 space-y-1 text-xs text-slate-500"><span>{label}</span><input disabled={(setValue === setMain && selected.mainZeroFee) || (setValue === setAssist && selected.assistZeroFee)} type="number" min={0} step={1} max={Number.MAX_SAFE_INTEGER} value={value} onChange={(event) => setValue(event.target.value)} placeholder="직접 입력" className={inputClass} /></label>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><span>강사료 합계 (인건비 / 회)</span><output aria-label="강사료 인건비 합계">{validAmount(main) && validAmount(assist) && Number.isSafeInteger(labor) ? `${labor.toLocaleString()}원` : '지급 금액을 입력해 주세요.'}</output></div>
        </fieldset>
        <label className="flex items-center gap-2 text-xs text-slate-500"><span>회기</span><input aria-label="회기" type="number" min={1} step={1} value={sessions} onChange={(event) => setSessions(event.target.value)} className={inputClass + ' max-w-24'} /></label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">청구 3개 항목의 합계는 수업료로, 선생님 지급액의 합계는 강사료(인건비)로 각각 반영합니다.</p>
          <button type="button" disabled={!canAdd} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40" onClick={() => {
            if (!selected || !canAdd) return;
            const defaults = readCenterSettlementDefaults(selected.defaults);
            onAdd({ ...emptyRow(), operationalCenterId: selected.id, name: selected.name, fee: Number(fee), sessions: count,
              cost: `${labor}*회기`, type: defaults.type, vatMode: billingVatMode === 'none' ? 'none' : 'auto', whRate: defaults.whRate, dueDate: dueDate(monthKey, defaults) });
            setSelected(null); setOpen(false);
          }}>이 달에 추가</button>
        </div>
      </div> : null}
    </div> : null}
  </div>;
}
