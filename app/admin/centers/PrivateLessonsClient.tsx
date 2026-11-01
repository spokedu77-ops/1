'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import PrivateLessonsTable from './components/PrivateLessonsTable';
import { uid, type SettlementCenter } from '@/app/admin/master/reports/settlementSheetCore';

export default function PrivateLessonsClient({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const [rows, setRows] = useState<SettlementCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch('/api/admin/settlement-sheet?scope=private', { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 403 ? '개인 수업 DB는 MASTER 계정에서 관리할 수 있습니다.' : '개인수업을 불러오지 못했습니다.');
        return response.json() as Promise<{ centers: Record<string, SettlementCenter> }>;
      }).then((body) => {
        if (!controller.signal.aborted) setRows(Object.values(body.centers).filter((row) => row.type === 'private').sort((a, b) => a.ord - b.ord));
      }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '조회에 실패했습니다.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const save = async (row: SettlementCenter) => {
    if (!row.name.trim()) throw new Error('이름 또는 수업명을 입력해 주세요.');
    const response = await fetch('/api/admin/settlement-sheet', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'center', value: row }) });
    const body = await response.json() as { revision?: string; error?: string };
    if (!response.ok || !body.revision) throw new Error(body.error || '저장하지 못했습니다.');
    setRows((previous) => previous.map((item) => item.id === row.id ? { ...row, rev: body.revision! } : item));
    toast.success('저장했습니다.');
  };
  const remove = async (row: SettlementCenter) => {
    if (!window.confirm(`${row.name || '새 개인수업'}을 삭제할까요? 월별 정산 기록은 유지됩니다.`)) return;
    if (row.rev) {
      const response = await fetch(`/api/admin/settlement-sheet?kind=center&id=${encodeURIComponent(row.id)}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('삭제하지 못했습니다.');
    }
    setRows((previous) => previous.filter((item) => item.id !== row.id));
  };
  const add = () => setRows((previous) => [...previous, {
    id: uid(), name: '', type: 'private', instr: '', assist: '', rental: '', fee: '', cost: '', sessions: '',
    vat: 'none', whRate: 0, status: 'active', note: '', ord: Date.now(), rates: [], termType: 'end', termValue: 0, rev: '',
  }]);

  return <div className="p-3 sm:p-4">
    {loading ? <p role="status" className="py-6 text-center text-sm text-slate-500">개인수업을 불러오는 중…</p>
      : error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-2 underline">다시 시도</button></div>
        : <PrivateLessonsTable centers={rows} save={save} remove={remove} add={add} onDirtyChange={onDirtyChange} />}
  </div>;
}
