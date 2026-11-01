"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Save, Trash2 } from 'lucide-react';
import { uid, type SettlementCenter } from '@/app/admin/master/reports/settlementSheetCore';
import MoneyInput from '@/app/admin/master/reports/SettlementMoneyInput';
const fieldClass = 'h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs';
const primaryButton = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white';

export default function PrivateLessonsTable({centers,save,remove,add,onDirtyChange}:{centers:SettlementCenter[];save:(center:SettlementCenter)=>Promise<void>;remove:(center:SettlementCenter)=>Promise<void>;add:()=>void;onDirtyChange?:(dirty:boolean)=>void}) {
  const [drafts, setDrafts] = useState<Record<string, SettlementCenter>>({});
  const shown = centers.filter((center) => center.type === 'private').map((center) => drafts[center.id] ?? center);
  const dirty = centers.some((center) => !center.rev || Boolean(drafts[center.id]));
  useEffect(() => {
    onDirtyChange?.(dirty);
    const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, onDirtyChange]);
  const patch = (center: SettlementCenter, key: keyof SettlementCenter, value: unknown) => setDrafts((previous) => ({ ...previous, [center.id]: { ...center, [key]: value } }));
  const saveDraft = async (center: SettlementCenter) => {
    try {
      await save({ ...center });
      setDrafts((previous) => { const next = { ...previous }; delete next[center.id]; return next; });
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : '\uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'); }
  };
  const removeRow = async (center: SettlementCenter) => {
    try { await remove(center); } catch (reason) { toast.error(reason instanceof Error ? reason.message : '\uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'); }
  };
  const actions=(center:SettlementCenter)=><div className="flex items-center justify-end gap-2 whitespace-nowrap"><button className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100" onClick={()=>{const from=prompt('요율 적용 시작 월 (YYYY-MM)',new Date().toISOString().slice(0,7));if(!from)return;const rates=[...(center.rates||[]),{id:uid(),from,instr:center.instr,assist:center.assist,rental:center.rental,cost:center.cost}];patch(center,'rates',rates);void saveDraft({...center,rates});}} title={`요율 이력 ${(center.rates||[]).length}건`}>이력</button><button className="rounded-md p-1.5 text-emerald-700 hover:bg-emerald-50" onClick={()=>void saveDraft({...center})} title="저장" aria-label={`${center.name} 저장`}><Save size={15}/></button><button className="rounded-md p-1.5 text-red-500 hover:bg-red-50" onClick={()=>void removeRow(center)} title="삭제" aria-label={`${center.name} 삭제`}><Trash2 size={15}/></button></div>;
  const operationalFields=(center:SettlementCenter)=><>
    <td className="p-1"><input className={fieldClass} value={center.sessions} inputMode="numeric" aria-label="기본 회기" onChange={(e)=>patch(center,'sessions',e.target.value)}/></td>
    <td className="p-1"><select className={fieldClass} value={center.vat} aria-label="부가세" onChange={(e)=>patch(center,'vat',e.target.value)}><option value="auto">자동</option><option value="none">없음</option></select></td>
  </>;
  const managementFields=(center:SettlementCenter)=><>
    <td className="p-1"><div className="flex gap-1"><select className={fieldClass} value={center.termType} aria-label="결제 조건" onChange={(e)=>patch(center,'termType',e.target.value)}><option value="end">월말</option><option value="day">익월 일자</option><option value="days">며칠 후</option></select><input className={fieldClass} type="number" value={center.termValue} aria-label="결제일 값" onChange={(e)=>patch(center,'termValue',Number(e.target.value))}/></div></td>
    <td className="p-1"><select className={fieldClass} value={center.status} aria-label="상태" onChange={(e)=>patch(center,'status',e.target.value)}><option value="active">진행</option><option value="ended">종료</option></select></td>
    <td className="p-1"><input className={fieldClass} value={center.note} aria-label="비고" onChange={(e)=>patch(center,'note',e.target.value)}/></td>
    <td className="p-1">{actions(center)}</td>
  </>;
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">개인 수업 DB</h2><button className={primaryButton} onClick={add}><Plus size={15}/>{'개인수업 추가'}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className={`table-fixed w-full text-xs min-w-[960px]`}>
      <thead className="bg-slate-50 text-slate-600"><tr>{(['이름 · 수업명','수업료','인건비','기본 회기','부가세','원천징수','결제조건','상태','비고','']).map((label)=><th key={label||'actions'} className="whitespace-nowrap p-2 text-left">{label}</th>)}</tr></thead>
      <tbody>{shown.map((center)=><tr key={center.id} className="border-t"><td className="p-1"><input className={fieldClass} value={center.name} aria-label="이름 또는 수업명" onChange={(e)=>patch(center,'name',e.target.value)}/></td><td className="p-1"><MoneyInput className={fieldClass} value={center.fee} aria-label="수업료" onChange={(e)=>patch(center,'fee',e.target.value)}/></td><td className="p-1"><MoneyInput className={fieldClass} value={center.cost} aria-label="인건비" onChange={(e)=>patch(center,'cost',e.target.value)}/></td>{operationalFields(center)}<td className="p-1"><input className={fieldClass} type="number" value={center.whRate} aria-label="원천징수율" onChange={(e)=>patch(center,'whRate',Number(e.target.value))}/></td>{managementFields(center)}</tr>)}</tbody>
    </table></div>
  </div>;
}
