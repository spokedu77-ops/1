'use client';
import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { SPM_PRIMARY_BTN, SPM_SECONDARY_BTN } from '../lib/masterActionGrammar';
import { useOperationalData } from '../operational/OperationalDataProvider';
import type { MasterSessionDto } from '../types/operational';
import { resolvePreviousCompletedSession } from './masterSessionContinuity';
import { isCarryoverDuplicate, isCarryoverProgramAvailable } from './sessionCarryover';

export function PreviousActivityCarryover({ target, availableProgramIds, canUseSpomove, onImported }: { target: MasterSessionDto; availableProgramIds: Set<number>; canUseSpomove: boolean; onImported: (programs: MasterSessionDto['programs']) => void }) {
  const data = useOperationalData();
  const source = useMemo(() => resolvePreviousCompletedSession(target, data.sessions), [data.sessions, target]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!source) return null;
  const duplicate = (program: MasterSessionDto['programs'][number]) => isCarryoverDuplicate(program, target.programs);
  const unavailable = (program: MasterSessionDto['programs'][number]) => !isCarryoverProgramAvailable(program, availableProgramIds, canUseSpomove);
  const available = source.programs.filter((program) => !duplicate(program) && !unavailable(program));
  async function carryover() { setSaving(true); setError(null); try { const programs = await data.carryoverSessionPrograms(target.id, source!.id, selected); onImported(programs); setOpen(false); } catch { setError('선택한 활동을 가져오지 못했습니다.'); } finally { setSaving(false); } }
  return <><button type="button" onClick={() => { setSelected(available.map((program) => program.id)); setOpen(true); }} className={SPM_SECONDARY_BTN}>지난 수업에서 활동 가져오기</button>{open ? <BottomSheet open title="가져올 활동 선택" onClose={() => setOpen(false)}><div className="space-y-3 pb-3"><p className="text-xs font-semibold text-slate-500">다음 수업에도 가져갈 활동을 고르세요. 이미 넣었거나 지금은 쓸 수 없는 활동은 제외됩니다.</p>{source.programs.map((program) => { const added = duplicate(program); const blocked = unavailable(program); return <label key={program.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3"><input type="checkbox" disabled={added || blocked} checked={selected.includes(program.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, program.id] : selected.filter((id) => id !== program.id))} className="h-5 w-5" /><span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{program.programTitle ?? '이름 없는 활동'}<small className="ml-2 text-slate-400">{added ? '추가됨' : blocked ? '현재 사용할 수 없음' : program.sourceType === 'spomove' ? 'SPOMOVE' : '놀이체육'}</small></span></label>; })}{error ? <p role="alert" className="text-xs font-bold text-rose-700">{error}</p> : null}<button type="button" disabled={saving || !selected.length} onClick={() => void carryover()} className={SPM_PRIMARY_BTN}>{saving ? '가져오는 중…' : `선택한 활동 ${selected.length}개 가져오기`}</button></div></BottomSheet> : null}</>;
}
