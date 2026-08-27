'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { notifyConsultPendingRefresh } from '@/app/lib/admin/consultPendingBadge';
import type { ConsultRow } from '../types';

type UseConsultActionsArgs = {
  setRows: Dispatch<SetStateAction<ConsultRow[]>>;
  setError: (msg: string | null) => void;
  onDeleted?: (id: string) => void;
  onRowUpdated?: (row: ConsultRow) => void;
  setMutating?: (busy: boolean) => void;
};

export function useConsultActions({
  setRows,
  setError,
  onDeleted,
  onRowUpdated,
  setMutating,
}: UseConsultActionsArgs) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const setStatus = useCallback(
    async (id: string, status: 'pending' | 'done') => {
      setUpdatingId(id);
      setMutating?.(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/consult', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        });
        const json = (await res.json()) as { ok?: boolean; row?: ConsultRow; error?: string };
        if (!json.ok || !json.row) {
          setError(json.error ?? '상태 변경에 실패했습니다.');
          return;
        }
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...json.row! } : r)));
        onRowUpdated?.(json.row);
        notifyConsultPendingRefresh();
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setUpdatingId(null);
        setMutating?.(false);
      }
    },
    [onRowUpdated, setError, setMutating, setRows],
  );

  const deleteConsult = useCallback(
    async (row: ConsultRow) => {
      const ok = window.confirm(`"${row.parent_name}" 상담을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
      if (!ok) return;

      setDeletingId(row.id);
      setMutating?.(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/consult', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!json.ok) {
          setError(json.error ?? '삭제에 실패했습니다.');
          return;
        }
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        onDeleted?.(row.id);
        notifyConsultPendingRefresh();
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setDeletingId(null);
        setMutating?.(false);
      }
    },
    [onDeleted, setError, setMutating, setRows],
  );

  return {
    updatingId,
    deletingId,
    setStatus,
    deleteConsult,
  };
}
