'use client';

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
  programs: { id: string; title: string }[];
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
  isOpen,
  onToggle,
  onSave,
  isSaving,
}: SchedulerMonthAccordionProps) {
  const publishedWeeks = slots.filter((s) => rowMap.get(s.weekKey)?.is_published).map((s) => s.week);
  const publishedCount = publishedWeeks.length;
  const summary =
    publishedCount === 0
      ? '미공개'
      : publishedCount === slots.length
        ? '전체 공개'
        : `공개: ${publishedWeeks.sort((a, b) => a - b).join(', ')}주차`;
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
            {summary} {publishedCount > 0 && publishedCount < slots.length && `(${publishedCount}/${slots.length})`}
          </span>
        </span>
        <span className="text-neutral-500">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && slots.length > 0 && (
        <div className="border-t border-neutral-700 bg-neutral-900/30 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {slots.map((slot) => {
                  const row = rowMap.get(slot.weekKey);
                  return (
                    <SchedulerSlotCard
                      key={slot.weekKey}
                      weekKey={slot.weekKey}
                      month={slot.month}
                      week={slot.week}
                      row={row}
                      programs={programs}
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
