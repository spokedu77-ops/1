'use client';

import { Loader2 } from 'lucide-react';
import { ConsultListRow } from './ConsultRow';
import type { ConsultRow } from '../types';

type ConsultTableProps = {
  rows: ConsultRow[];
  loading: boolean;
  updatingId: string | null;
  deletingId: string | null;
  onOpen: (row: ConsultRow) => void;
  onSetStatus: (id: string, status: 'pending' | 'done') => void;
  onDelete: (row: ConsultRow) => void;
};

export function ConsultTable({
  rows,
  loading,
  updatingId,
  deletingId,
  onOpen,
  onSetStatus,
  onDelete,
}: ConsultTableProps) {
  return (
    <>
      <div className="space-y-2.5 md:hidden">
        {loading && rows.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-12 text-center text-slate-500">
            <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-60" />
            <p className="mt-2 text-sm">불러오는 중…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-slate-500">
            등록된 상담이 없습니다.
          </div>
        ) : (
          rows.map((row) => (
            <ConsultListRow
              key={row.id}
              row={row}
              compact
              updatingId={updatingId}
              deletingId={deletingId}
              onOpen={onOpen}
              onSetStatus={onSetStatus}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-2xl shadow-black/40 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-900/90">
              <tr>
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-400">접수</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-400">대상</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-400">문의</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-400">주요 조건</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-400">상태</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-400">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-60" />
                    <p className="mt-2 text-sm">불러오는 중…</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    등록된 상담이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <ConsultListRow
                    key={row.id}
                    row={row}
                    updatingId={updatingId}
                    deletingId={deletingId}
                    onOpen={onOpen}
                    onSetStatus={onSetStatus}
                    onDelete={onDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
