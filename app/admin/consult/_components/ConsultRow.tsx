'use client';

import {
  parseConsultSubject,
  summarizeLeadRow,
  type LeadSummaryView,
} from '@/app/lib/admin/leadInboxSummary';
import { LeadSummary } from './LeadSummary';
import { STATUS_LABEL, formatConsultDateShort, type ConsultRow } from '../types';

function rowSummary(row: ConsultRow): LeadSummaryView {
  if (row.summary) return row.summary;
  return summarizeLeadRow({
    lead_route: row.lead_route ?? null,
    curriculum_mode: row.curriculum_mode ?? null,
    private_start_direction: row.private_start_direction ?? null,
    private_preferred_format: row.private_preferred_format ?? null,
    conversion_evidence_slug: row.conversion_evidence_slug ?? null,
    lead_context: row.lead_context ?? null,
    content: row.content ?? '',
    consult_type: row.consult_type,
  });
}

type ConsultRowActionsProps = {
  row: ConsultRow;
  updatingId: string | null;
  deletingId: string | null;
  onSetStatus: (id: string, status: 'pending' | 'done') => void;
  onDelete: (row: ConsultRow) => void;
};

export function ConsultRowActions({
  row,
  updatingId,
  deletingId,
  onSetStatus,
  onDelete,
}: ConsultRowActionsProps) {
  const busy = updatingId === row.id || deletingId === row.id;
  return (
    <div className="flex flex-nowrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={busy || row.status === 'pending'}
        onClick={() => onSetStatus(row.id, 'pending')}
        className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        미확인
      </button>
      <button
        type="button"
        disabled={busy || row.status === 'done'}
        onClick={() => onSetStatus(row.id, 'done')}
        className="rounded border border-emerald-700/60 bg-emerald-900/40 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        확인
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDelete(row)}
        className="rounded border border-rose-700/60 bg-rose-900/30 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {deletingId === row.id ? '…' : '삭제'}
      </button>
    </div>
  );
}

type ConsultRowProps = {
  row: ConsultRow;
  updatingId: string | null;
  deletingId: string | null;
  onOpen: (row: ConsultRow) => void;
  onSetStatus: (id: string, status: 'pending' | 'done') => void;
  onDelete: (row: ConsultRow) => void;
  compact?: boolean;
};

export function ConsultListRow({
  row,
  updatingId,
  deletingId,
  onOpen,
  onSetStatus,
  onDelete,
  compact,
}: ConsultRowProps) {
  const summary = rowSummary(row);
  const subject = parseConsultSubject(row);
  const statusClass =
    row.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200';

  if (compact) {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={() => onOpen(row)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(row);
          }
        }}
        className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 transition hover:border-slate-700 hover:bg-slate-900/70"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{subject.name}</p>
            {subject.meta ? <p className="mt-0.5 text-xs text-slate-400">{subject.meta}</p> : null}
            {row.phone ? (
              <a
                href={`tel:${row.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 block text-xs text-sky-300 hover:underline"
              >
                {row.phone}
              </a>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
              {STATUS_LABEL[row.status] ?? row.status}
            </span>
            <p className="mt-1 text-[11px] text-slate-500">{formatConsultDateShort(row.created_at)}</p>
          </div>
        </div>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <LeadSummary summary={summary} variant="inquiry" />
          <LeadSummary summary={summary} variant="conditions" />
        </div>
        <div className="mt-3">
          <ConsultRowActions
            row={row}
            updatingId={updatingId}
            deletingId={deletingId}
            onSetStatus={onSetStatus}
            onDelete={onDelete}
          />
        </div>
      </article>
    );
  }

  return (
    <tr
      className="cursor-pointer align-top hover:bg-slate-800/40"
      onClick={() => onOpen(row)}
    >
      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-400">
        {formatConsultDateShort(row.created_at)}
      </td>
      <td className="min-w-[9rem] max-w-[12rem] px-3 py-2.5">
        <p className="truncate text-sm font-medium text-white" title={subject.name}>
          {subject.name}
        </p>
        {subject.meta ? <p className="mt-0.5 text-xs text-slate-400">{subject.meta}</p> : null}
        {row.phone ? (
          <a
            href={`tel:${row.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 block text-xs text-sky-300 hover:underline"
          >
            {row.phone}
          </a>
        ) : null}
      </td>
      <td className="min-w-[8rem] px-3 py-2.5">
        <LeadSummary summary={summary} variant="inquiry" />
      </td>
      <td className="min-w-[12rem] max-w-sm px-3 py-2.5">
        <LeadSummary summary={summary} variant="conditions" />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <ConsultRowActions
          row={row}
          updatingId={updatingId}
          deletingId={deletingId}
          onSetStatus={onSetStatus}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}
