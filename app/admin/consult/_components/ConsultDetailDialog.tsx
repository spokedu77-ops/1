'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  parseConsultSubject,
  resolveLeadRoute,
  summarizeLeadRow,
} from '@/app/lib/admin/leadInboxSummary';
import { getLeadResponseChecklist } from '@/app/spokedu/data/lead-envelope';
import type { CurriculumCommercialMode } from '@/app/spokedu/data/curriculum-commercial-modes';
import type { PrivateStartDirection } from '@/app/spokedu/data/private-page';
import { LeadRawContent } from './LeadRawContent';
import { LeadSummary } from './LeadSummary';
import { LeadAcquisitionPanel } from './LeadAcquisitionPanel';
import { STATUS_LABEL, formatConsultDate, type ConsultRow } from '../types';

type ConsultDetailDialogProps = {
  row: ConsultRow;
  onClose: () => void;
  onSetStatus: (id: string, status: 'pending' | 'done') => void;
  onDelete: (row: ConsultRow) => void;
  updatingId: string | null;
  deletingId: string | null;
};

export function ConsultDetailDialog({
  row: initialRow,
  onClose,
  onSetStatus,
  onDelete,
  updatingId,
  deletingId,
}: ConsultDetailDialogProps) {
  const [row, setRow] = useState<ConsultRow>(initialRow);
  const [contentLoading, setContentLoading] = useState(!initialRow.content);
  const [dispatchDetail, setDispatchDetail] = useState<Record<string, unknown> | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRow(initialRow);
  }, [initialRow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 목록 API는 content를 비우므로 상세 오픈 시 원문·최신 필드를 보강한다.
  // selected 변경만으로 목록 load()가 다시 돌지 않는다.
  useEffect(() => {
    let cancelled = false;
    setContentLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/consult/${encodeURIComponent(initialRow.id)}`, {
          credentials: 'include',
        });
        const json = (await res.json()) as { ok?: boolean; row?: ConsultRow };
        if (!cancelled && json.ok && json.row) {
          setRow((prev) => ({ ...prev, ...json.row! }));
        }
      } catch {
        // keep list snapshot
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialRow.id]);

  const route = resolveLeadRoute(row);
  const summary = useMemo(
    () =>
      summarizeLeadRow({
        lead_route: row.lead_route ?? null,
        curriculum_mode: row.curriculum_mode ?? null,
        private_start_direction: row.private_start_direction ?? null,
        private_preferred_format: row.private_preferred_format ?? null,
        conversion_evidence_slug: row.conversion_evidence_slug ?? null,
        lead_context: row.lead_context ?? null,
        content: row.content ?? '',
        consult_type: row.consult_type,
      }),
    [row],
  );

  const subject = parseConsultSubject(row);
  const checklist = getLeadResponseChecklist({
    leadRoute: route,
    curriculumMode: (row.curriculum_mode as CurriculumCommercialMode | null) ?? null,
    privateStartDirection: (row.private_start_direction as PrivateStartDirection | null) ?? null,
  });

  useEffect(() => {
    setDispatchDetail(null);
    if (!row.source_lead_id || route !== 'dispatch') return;
    let cancelled = false;
    setDispatchLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/dispatch-leads?id=${encodeURIComponent(row.source_lead_id!)}`, {
          credentials: 'include',
        });
        const json = (await res.json()) as { ok?: boolean; lead?: Record<string, unknown> };
        if (!cancelled && json.ok && json.lead) setDispatchDetail(json.lead);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setDispatchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.source_lead_id, route]);

  const statusClass =
    row.status === 'done' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100';

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consult-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[min(90vh,780px)] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="consult-detail-title" className="text-lg font-semibold text-white">
                {subject.name}
                {subject.meta ? (
                  <span className="font-normal text-slate-400"> · {subject.meta}</span>
                ) : null}
              </h2>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
                {STATUS_LABEL[row.status] ?? row.status}
              </span>
            </div>
            {row.phone ? (
              <a href={`tel:${row.phone}`} className="mt-1 inline-block text-sm text-sky-300 hover:underline">
                {row.phone}
              </a>
            ) : (
              <p className="mt-1 text-sm text-slate-500">연락처 없음</p>
            )}
            <p className="mt-1 text-xs text-slate-500">{formatConsultDate(row.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <LeadSummary summary={summary} variant="detail" />

          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-100">{checklist.title}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-amber-50/90">
              {checklist.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-amber-700/60 text-[10px] text-amber-200/80">
                    □
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {route === 'dispatch' ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
              <p className="text-sm font-semibold text-slate-100">Dispatch 원본</p>
              {dispatchLoading ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> 불러오는 중…
                </p>
              ) : dispatchDetail ? (
                <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-slate-300">
                  {JSON.stringify(dispatchDetail, null, 2)}
                </pre>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  {row.source_lead_id
                    ? '원본을 찾지 못했습니다. 마이그레이션·연결을 확인하세요.'
                    : 'source_lead_id 없음 (레거시 미러)'}
                </p>
              )}
            </div>
          ) : null}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-400">원본 content</p>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
            <LeadRawContent content={row.content ?? ''} loading={contentLoading} />
          </div>

          <LeadAcquisitionPanel leadContext={row.lead_context} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={updatingId === row.id || row.status === 'pending'}
              onClick={() => onSetStatus(row.id, 'pending')}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            >
              미확인
            </button>
            <button
              type="button"
              disabled={updatingId === row.id || row.status === 'done'}
              onClick={() => onSetStatus(row.id, 'done')}
              className="rounded-lg border border-emerald-700/60 bg-emerald-900/40 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-900/60 disabled:opacity-40"
            >
              확인완료
            </button>
            <button
              type="button"
              disabled={deletingId === row.id}
              onClick={() => onDelete(row)}
              className="rounded-lg border border-rose-700/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-200 hover:bg-rose-900/50 disabled:opacity-40"
            >
              {deletingId === row.id ? '삭제 중…' : '삭제'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(row.content ?? '');
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* ignore */
                }
              }}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              {copied ? '복사됨' : '본문 복사'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
