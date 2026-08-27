'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveLeadRoute } from '@/app/lib/admin/leadInboxSummary';
import { ConsultDetailDialog } from './_components/ConsultDetailDialog';
import { ConsultTable } from './_components/ConsultTable';
import { ConsultToolbar } from './_components/ConsultToolbar';
import { useConsultActions } from './_hooks/useConsultActions';
import { useConsultLeads } from './_hooks/useConsultLeads';
import type { ConsultRow, RouteTab } from './types';

export default function AdminConsultPage() {
  const [routeTab, setRouteTab] = useState<RouteTab>('all');
  const [selected, setSelected] = useState<ConsultRow | null>(null);

  const onNewPending = useCallback((row: ConsultRow) => {
    setSelected(row);
  }, []);

  const { rows, setRows, loading, error, setError, load, setDetailOpen, setMutating } =
    useConsultLeads({ onNewPending });

  const handleDeleted = useCallback((id: string) => {
    setSelected((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleRowUpdated = useCallback((row: ConsultRow) => {
    setSelected((prev) => (prev?.id === row.id ? { ...prev, ...row } : prev));
  }, []);

  const { updatingId, deletingId, setStatus, deleteConsult } = useConsultActions({
    setRows,
    setError,
    onDeleted: handleDeleted,
    onRowUpdated: handleRowUpdated,
    setMutating,
  });

  useEffect(() => {
    setDetailOpen(selected != null);
  }, [selected, setDetailOpen]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (routeTab === 'all') return true;
      return resolveLeadRoute(row) === routeTab;
    });
  }, [rows, routeTab]);

  const pendingCount = filteredRows.filter((row) => row.status === 'pending').length;
  const doneCount = filteredRows.filter((row) => row.status === 'done').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <ConsultToolbar
        routeTab={routeTab}
        onRouteTabChange={setRouteTab}
        total={filteredRows.length}
        pendingCount={pendingCount}
        doneCount={doneCount}
        loading={loading}
        onRefresh={() => void load()}
      />

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-900/80 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <ConsultTable
          rows={filteredRows}
          loading={loading}
          updatingId={updatingId}
          deletingId={deletingId}
          onOpen={setSelected}
          onSetStatus={(id, status) => void setStatus(id, status)}
          onDelete={(row) => void deleteConsult(row)}
        />
      </div>

      {selected ? (
        <ConsultDetailDialog
          row={selected}
          onClose={() => setSelected(null)}
          onSetStatus={(id, status) => void setStatus(id, status)}
          onDelete={(row) => void deleteConsult(row)}
          updatingId={updatingId}
          deletingId={deletingId}
        />
      ) : null}
    </div>
  );
}
