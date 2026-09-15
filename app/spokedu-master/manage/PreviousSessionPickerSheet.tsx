'use client';

import { ChevronRight } from 'lucide-react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { formatSeoulSessionDay, formatSeoulSessionTime, getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

export function PreviousSessionPickerSheet({ open, candidates, onClose, onSelect }: {
  open: boolean;
  candidates: readonly MasterSessionDto[];
  onClose: () => void;
  onSelect: (session: MasterSessionDto) => void;
}) {
  return <BottomSheet open={open} title="직전 수업으로 만들기" onClose={onClose}>
    <div className="min-w-0 divide-y divide-slate-100 border-y border-slate-100">
      {candidates.map((session) => <button
        key={session.id}
        type="button"
        onClick={() => onSelect(session)}
        className="group grid min-h-16 w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-transparent py-3 text-left transition-colors duration-200 hover:border-blue-300 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--spm-acc)]"
      >
        <span className="min-w-0">
          <strong className="block truncate text-[15px] font-semibold text-slate-900 transition-colors duration-200 group-hover:text-slate-950">{session.className}</strong>
          <span className="mt-1 block truncate text-[13px] text-slate-500 transition-colors duration-200 group-hover:text-slate-700">
            {formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { month: 'numeric', day: 'numeric' })} · {formatSeoulSessionTime(session.startAt)}–{formatSeoulSessionTime(session.endAt)} · 출석부 {session.roster?.length ?? session.attendance.length}명
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-600" aria-hidden />
      </button>)}
    </div>
  </BottomSheet>;
}
