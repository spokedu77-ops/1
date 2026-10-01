import { Check } from 'lucide-react';
import type { SessionWorkspacePrimaryIntent } from '../../activity/masterSessionWorkspaceModel';
import { MASTER_ACTION_COPY, SPM_PRIMARY_BTN_FULL, SPM_SECONDARY_BTN } from '../../lib/masterActionGrammar';
import type { MasterSessionDto, MasterSessionStatus } from '../../types/operational';

export type ScheduledSessionPrimaryAction = 'create' | 'start' | 'complete' | null;

export function resolveScheduledSessionPrimaryAction(isCreate: boolean, primarySurfaceIntent: SessionWorkspacePrimaryIntent | null): ScheduledSessionPrimaryAction {
  if (isCreate) return 'create';
  if (primarySurfaceIntent === 'start-session') return 'start';
  if (primarySurfaceIntent === 'run-next-activity') return 'complete';
  if (primarySurfaceIntent === 'wrap-session') return 'complete';
  return null;
}

export async function executeScheduledSessionPrimaryAction(action: Exclude<ScheduledSessionPrimaryAction, null>, startSession: () => Promise<void>, persist: (status: MasterSessionStatus) => Promise<void>) {
  if (action === 'start') return startSession();
  return persist(action === 'complete' ? 'completed' : 'scheduled');
}

export async function executeSessionStartSequence<T>({ dirty, save, start }: { dirty: boolean; save: () => Promise<T>; start: (saved: T | null) => Promise<void> }) {
  const saved = dirty ? await save() : null;
  await start(saved);
}

export function SessionActions({ status, isCreate, activeSession, dirty, saving, classId, primarySurfaceIntent, incompleteActivityCount, startSession, persist }: { status: MasterSessionStatus; isCreate: boolean; activeSession: MasterSessionDto | null; dirty: boolean; saving: boolean; classId: string; primarySurfaceIntent: SessionWorkspacePrimaryIntent | null; incompleteActivityCount: number; startSession: () => Promise<void>; persist: (status: MasterSessionStatus) => Promise<void> }) {
  if (status === 'scheduled') {
    const primaryAction = resolveScheduledSessionPrimaryAction(isCreate, primarySurfaceIntent);
    if (!primaryAction && !dirty) return null;
    return <div className={`grid gap-2 border-t border-slate-200 bg-white ${primaryAction && activeSession && dirty ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-1'} ${isCreate ? 'py-3' : 'px-1 pb-[max(16px,env(safe-area-inset-bottom))] pt-3'}`}>
      {activeSession && dirty ? <button type="button" disabled={saving} onClick={() => void persist('scheduled')} className={`${SPM_SECONDARY_BTN} px-4`}>변경 저장</button> : null}
      {primaryAction ? <button type="button" disabled={saving || !classId} onClick={() => {
        if (primaryAction === 'complete' && incompleteActivityCount > 0 && !window.confirm(`미진행 활동이 ${incompleteActivityCount}개 있습니다. 수업을 완료할까요?`)) return;
        void executeScheduledSessionPrimaryAction(primaryAction, startSession, persist);
      }} className={SPM_PRIMARY_BTN_FULL}>{saving ? '저장 중…' : primaryAction === 'start' ? '수업 시작' : primaryAction === 'complete' ? <><Check size={16} />{MASTER_ACTION_COPY.completeSession}</> : MASTER_ACTION_COPY.createSession}</button> : null}
    </div>;
  }
  if (status === 'completed') return <div className={`grid gap-2 border-t border-slate-200 bg-white px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 ${dirty ? 'grid-cols-2' : 'grid-cols-1'}`}>
    {dirty ? <button type="button" disabled={saving} onClick={() => void persist('completed')} className={SPM_PRIMARY_BTN_FULL}>변경 저장</button> : null}
    <button type="button" disabled={saving} onClick={() => { if (window.confirm('수업 완료를 취소하고 예정 상태로 되돌릴까요?')) void persist('scheduled'); }} className={`${SPM_SECONDARY_BTN} w-full`}>수업 완료 취소</button>
  </div>;
  return null;
}
