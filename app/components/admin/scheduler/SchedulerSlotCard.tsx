'use client';

import { useEffect, useState } from 'react';
import type { ScheduleLightRow } from '@/app/lib/admin/hooks/useRotationSchedule';

export interface SchedulerSlotCardProps {
  weekKey: string;
  month: number;
  week: number;
  row: ScheduleLightRow | undefined;
  programs: { id: string; title: string }[];
  onSave: (vars: {
    week_key: string;
    program_id: string;
    program_snapshot: unknown;
    is_published?: boolean;
    programTitle?: string;
    asset_pack_id?: string;
  }) => Promise<unknown>;
  isSaving: boolean;
}

function savePayload(
  weekKey: string,
  month: number,
  week: number,
  programId: string,
  programs: { id: string; title: string }[],
  published: boolean
) {
  return {
    week_key: weekKey,
    program_id: programId,
    asset_pack_id: 'iiwarmup_think_default',
    program_snapshot: { think150: true, week, month, audience: 'elementary' },
    is_published: published,
    programTitle: programs.find((p) => p.id === programId)?.title,
  };
}

export function SchedulerSlotCard({
  weekKey,
  month,
  week,
  row,
  programs,
  onSave,
  isSaving,
}: SchedulerSlotCardProps) {
  const [programId, setProgramId] = useState(row?.program_id ?? '');

  // Sync from props when row changes
  /* eslint-disable react-hooks/set-state-in-effect -- intentional sync from props */
  useEffect(() => {
    setProgramId(row?.program_id ?? '');
  }, [row?.program_id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async (published: boolean) => {
    if (!programId) return;
    try {
      await onSave(savePayload(weekKey, month, week, programId, programs, published));
    } catch (err) {
      console.error('Scheduler slot save failed:', err);
    }
  };

  const isPublishedDisplay = row?.is_published ?? false;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isPublishedDisplay
          ? 'border-emerald-600/40 bg-emerald-950/20'
          : 'border-neutral-700/80 bg-neutral-800/50'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-neutral-300">
          {week}주차
        </span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            isPublishedDisplay
              ? 'bg-emerald-600/40 text-emerald-300'
              : 'bg-neutral-700/80 text-neutral-500'
          }`}
        >
          {isPublishedDisplay ? '공개' : '미공개'}
        </span>
      </div>
      <select
        className="mb-2 w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        value={programId}
        onChange={(e) => setProgramId(e.target.value)}
      >
        <option value="">프로그램 선택</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      {programId ? (
        <p className="mb-3 text-xs text-neutral-400" title={programId}>
          {programs.find((p) => p.id === programId)?.title ?? row?.programTitle ?? programId}
        </p>
      ) : (
        <p className="mb-3 text-xs text-neutral-500">선택된 프로그램 없음</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
          onClick={() => handleSave(true)}
          disabled={!programId || isSaving}
        >
          배정 &amp; 공개
        </button>
        <button
          type="button"
          className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
          onClick={() => handleSave(false)}
          disabled={!programId || isSaving}
        >
          미공개로 저장
        </button>
      </div>
    </div>
  );
}
