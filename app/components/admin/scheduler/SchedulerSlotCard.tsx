'use client';

import { useEffect, useState } from 'react';
import type { ScheduleLightRow } from '@/app/lib/admin/hooks/useRotationSchedule';
import type { Audience } from '@/app/lib/admin/constants/thinkTiming';

const DEFAULT_AUDIENCE: Audience = '700ms';

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
  const isThink = programId.startsWith('think150_');
  return {
    week_key: weekKey,
    program_id: programId,
    asset_pack_id: isThink ? 'iiwarmup_think_default' : undefined,
    program_snapshot: isThink
      ? { think150: true, week, month, audience: DEFAULT_AUDIENCE }
      : {},
    is_published: published,
    programTitle: programId ? programs.find((p) => p.id === programId)?.title : undefined,
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
  const [thinkId, setThinkId] = useState(row?.program_id ?? '');

  const thinkOptions = programs.filter((p) => p.id.startsWith('think150_'));
  const challengeId = `challenge_${weekKey}`;
  const challengeOption = programs.find((p) => p.id === challengeId);

  useEffect(() => {
    setThinkId(row?.program_id ?? '');
  }, [row?.program_id]);

  const handleSave = async () => {
    try {
      await onSave(savePayload(weekKey, month, week, thinkId, programs, true));
    } catch (err) {
      console.error('Scheduler slot save failed:', err);
    }
  };

  const isAssigned = !!row?.program_id;

  return (
    <div
      className={`rounded-lg border p-4 ${
        isAssigned
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
            isAssigned
              ? 'bg-emerald-600/40 text-emerald-300'
              : 'bg-neutral-700/80 text-neutral-500'
          }`}
        >
          {isAssigned ? '배정됨' : '미배정'}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">1) THINK</label>
          <select
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            value={thinkId}
            onChange={(e) => setThinkId(e.target.value)}
            aria-label="THINK 프로그램 선택"
          >
            <option value="">선택</option>
            {thinkOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">2) CHALLENGE</label>
          <select
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            value={challengeId}
            disabled
            aria-label="CHALLENGE 해당 주차"
          >
            <option value={challengeId}>
              {challengeOption ? challengeOption.title : '미배정'}
            </option>
          </select>
          <p className="mt-0.5 text-[10px] text-neutral-500">챌린지 스튜디오에서 해당 주차 저장 시 표시</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">3) FLOW</label>
          <select
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            value="flow_monthly"
            disabled
            aria-label="FLOW 월별 테마"
          >
            <option value="flow_monthly">월별 테마 적용</option>
          </select>
          <p className="mt-0.5 text-[10px] text-neutral-500">Asset Hub Flow에서 월별 BGM·배경 설정</p>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        onClick={handleSave}
        disabled={!thinkId || isSaving}
      >
        배정 &amp; 공개
      </button>
    </div>
  );
}
