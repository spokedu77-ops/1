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
  const [isPublished, setIsPublished] = useState(row?.is_published ?? false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setProgramId(row?.program_id ?? '');
    setIsPublished(row?.is_published ?? false);
  }, [row?.program_id, row?.is_published]);

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProgramId(e.target.value);
    setHasChanges(true);
  };

  const handlePublishToggle = () => {
    setIsPublished((p) => !p);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!programId) return;
    try {
      await onSave({
        week_key: weekKey,
        program_id: programId,
        asset_pack_id: 'iiwarmup_think_default',
        program_snapshot: { think150: true, week, month, audience: 'elementary' },
        is_published: isPublished,
        programTitle: programs.find((p) => p.id === programId)?.title,
      });
      setHasChanges(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 ${
        row?.is_published
          ? 'border-emerald-600/40 bg-emerald-950/20'
          : 'border-neutral-700/80 bg-neutral-800/50'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-neutral-300">
          {week}주차
        </span>
        {row?.is_published && (
          <span className="rounded bg-emerald-600/30 px-1.5 py-0.5 text-xs text-emerald-400">
            Published
          </span>
        )}
      </div>
      <select
        className="mb-3 w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm"
        value={programId}
        onChange={handleProgramChange}
      >
        <option value="">프로그램 선택</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      <div className="flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-400">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={handlePublishToggle}
            className="rounded border-neutral-600"
          />
          Published
        </label>
        {hasChanges && programId && (
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
          >
            저장
          </button>
        )}
      </div>
    </div>
  );
}
