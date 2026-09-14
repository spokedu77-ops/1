import { Check } from 'lucide-react';
import { MASTER_ACTION_COPY, SPM_PRIMARY_BTN_FULL, SPM_SECONDARY_BTN } from '../../lib/masterActionGrammar';
import type { MasterSessionDto, MasterSessionStatus } from '../../types/operational';

export function SessionActions({ status, isCreate, activeSession, dirty, saving, classId, persist }: { status: MasterSessionStatus; isCreate: boolean; activeSession: MasterSessionDto | null; dirty: boolean; saving: boolean; classId: string; persist: (status: MasterSessionStatus) => Promise<void> }) {
  if (status === 'scheduled') return <div className={`grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-slate-200 bg-white ${isCreate ? 'py-3' : 'px-1 pb-[max(16px,env(safe-area-inset-bottom))] pt-3'}`}>
    {activeSession ? <button type="button" disabled={saving || !dirty} onClick={() => void persist('scheduled')} className={`${SPM_SECONDARY_BTN} px-4`}>변경 저장</button> : null}
    <button type="button" disabled={saving || !classId} onClick={() => void persist(activeSession ? 'completed' : 'scheduled')} className={`${SPM_PRIMARY_BTN_FULL} ${isCreate ? '!h-12 rounded-xl' : 'h-12'}`}>{saving ? '저장 중…' : activeSession ? <><Check size={16} />{MASTER_ACTION_COPY.completeSession}</> : MASTER_ACTION_COPY.createSession}</button>
  </div>;
  if (status === 'completed') return <div className={`grid gap-2 border-t border-slate-200 bg-white px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 ${dirty ? 'grid-cols-2' : 'grid-cols-1'}`}>
    {dirty ? <button type="button" disabled={saving} onClick={() => void persist('completed')} className={SPM_PRIMARY_BTN_FULL}>변경 저장</button> : null}
    <button type="button" disabled={saving} onClick={() => { if (window.confirm('수업 완료를 취소하고 예정 상태로 되돌릴까요?')) void persist('scheduled'); }} className={`${SPM_SECONDARY_BTN} w-full`}>수업 완료 취소</button>
  </div>;
  return null;
}
