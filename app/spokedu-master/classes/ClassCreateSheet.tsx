'use client';

import { useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { MASTER_ACTION_COPY, SPM_PRIMARY_BTN_FULL } from '../lib/masterActionGrammar';
import { getMasterRequestErrorMessage } from '../lib/masterRequestError';
import { useOperationalData } from '../operational/OperationalDataProvider';
import type { MasterClassDto } from '../types/operational';

export function ClassCreateSheet({
  open,
  nested = false,
  onClose,
  onCreated,
}: {
  open: boolean;
  nested?: boolean;
  onClose: () => void;
  onCreated: (created: MasterClassDto) => void;
}) {
  const data = useOperationalData();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const createClass = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await data.createClass(name.trim());
      setName('');
      onCreated(created);
    } catch (caught) {
      setError(getMasterRequestErrorMessage(caught, '수업반을 만들지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return <BottomSheet open title="수업반 만들기" nested={nested} initialFocusSelector="[data-class-create-name]" onClose={onClose}>
    <div className="space-y-4 pb-3">
      <label className="block text-[13px] font-medium text-slate-600">수업반 이름 *<input data-class-create-name value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createClass(); }} placeholder="예: 양화초 늘봄체육" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium outline-none focus:border-slate-400" /></label>
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p> : null}
      <button type="button" disabled={!name.trim() || saving} onClick={() => void createClass()} className={SPM_PRIMARY_BTN_FULL}>{saving ? '만드는 중…' : MASTER_ACTION_COPY.createClass}</button>
    </div>
  </BottomSheet>;
}
