'use client';

import { useMemo } from 'react';
import { SchedulerSlotCard } from './SchedulerSlotCard';
import type { ScheduleLightRow } from '@/app/lib/admin/hooks/useRotationSchedule';

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

export interface SchedulerMonthAccordionProps {
  year: number;
  month: number;
  slots: Array<{ weekKey: string; month: number; week: number }>;
  rowMap: Map<string, ScheduleLightRow>;
  /** 해당 월 주차 프로그램 (week_id 필터됨) */
  programs: { id: string; title: string }[];
  /** 전체 프로그램 (챌린지 등 slot별 id/week_id 매칭용) */
  allPrograms?: { id: string; title: string; week_id: string | null }[];
  isOpen: boolean;
  onToggle: () => void;
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

export function SchedulerMonthAccordion({
  year,
  month,
  slots,
  rowMap,
  programs,
  allPrograms = [],
  isOpen,
  onToggle,
  onSave,
  isSaving,
}: SchedulerMonthAccordionProps) {
  const programsWithAssigned = useMemo(() => {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
    const isForThisMonth = (p: { id: string; week_id: string | null } | undefined) =>
      p &&
      (p.week_id === 'template' ||
        (p.id != null && p.id.startsWith('think150_')) ||
        (typeof p.week_id === 'string' && p.week_id.startsWith(monthPrefix)));

    const byId = new Map(programs.map((p) => [p.id, p]));
    for (const slot of slots) {
      const fromFull = allPrograms.find(
        (p) => p.week_id === slot.weekKey || p.id === `challenge_${slot.weekKey}`
      );
      if (fromFull && !byId.has(fromFull.id)) {
        byId.set(fromFull.id, { id: fromFull.id, title: fromFull.title });
      }
      const row = rowMap.get(slot.weekKey);
      if (row?.program_id && !byId.has(row.program_id)) {
        const prog = allPrograms.find((p) => p.id === row.program_id);
        if (isForThisMonth(prog)) {
          byId.set(row.program_id, { id: row.program_id, title: row.programTitle ?? row.program_id });
        }
      }
    }
    return Array.from(byId.values());
  }, [programs, allPrograms, slots, rowMap, year, month]);

  const assignedWeeks = slots.filter((s) => !!rowMap.get(s.weekKey)?.program_id).map((s) => s.week);
  const assignedCount = assignedWeeks.length;
  const summary =
    assignedCount === 0
      ? '미배정'
      : assignedCount === slots.length
        ? '전체 배정'
        : `배정: ${assignedWeeks.sort((a, b) => a - b).join(', ')}주차`;
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900/50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-neutral-200 hover:bg-neutral-800/50"
        onClick={onToggle}
      >
        <span className="flex items-center gap-3">
          <span>{year}년 {MONTH_LABELS[month - 1]}</span>
          <span className="rounded bg-neutral-700/80 px-2 py-0.5 text-xs font-normal text-neutral-400">
            {summary} {assignedCount > 0 && assignedCount < slots.length && `(${assignedCount}/${slots.length})`}
          </span>
        </span>
        <span className="text-neutral-500">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && slots.length > 0 && (
        <div className="border-t border-neutral-700 bg-neutral-900/30 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {slots.map((slot) => {
                  const row = rowMap.get(slot.weekKey);
                  return (
                    <SchedulerSlotCard
                      key={slot.weekKey}
                      weekKey={slot.weekKey}
                      month={slot.month}
                      week={slot.week}
                      row={row}
                      programs={programsWithAssigned}
                      onSave={onSave}
                      isSaving={isSaving}
                    />
                  );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
