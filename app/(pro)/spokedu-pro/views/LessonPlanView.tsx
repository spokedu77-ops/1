'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Share2, BookOpenCheck } from 'lucide-react';
import { toast } from 'sonner';
import LibraryView from './LibraryView';
import { useLessonPlan, type LessonPlanDayKo } from '../hooks/useLessonPlan';
import { useClassStore } from '../hooks/useClassStore';
import { formatWeekLabelFromMonday } from '@/app/lib/spokedu-pro/weekUtils';
import { getProgramTitle } from '@/app/lib/spokedu-pro/dashboardDefaults';
import type { ProgramDetail } from '../types';

function dayKoFromMondayOffset(monday: Date, offset: number): LessonPlanDayKo {
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);
  const map: LessonPlanDayKo[] = ['일', '월', '화', '수', '목', '금', '토'];
  return map[d.getDay()];
}

export default function LessonPlanView({
  programDetails = {},
}: {
  programDetails?: Record<string, ProgramDetail>;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const {
    monday,
    weekLabel,
    slotsByDay,
    addSlot,
    updateSlot,
    removeSlot,
    markDone,
    addProgramToSlot,
    removeProgramFromSlot,
    DAY_ORDER,
  } = useLessonPlan(weekOffset);

  const { classes } = useClassStore();
  const [librarySlotId, setLibrarySlotId] = useState<string | null>(null);

  const weekTitle = useMemo(() => formatWeekLabelFromMonday(monday), [monday]);

  const dayColumns = useMemo(
    () => DAY_ORDER.map((_, i) => ({ day: dayKoFromMondayOffset(monday, i), offset: i })),
    [monday, DAY_ORDER]
  );

  const buildShareText = useCallback(() => {
    const lines: string[] = [`[스포키듀] 수업 계획 ${weekTitle} (${weekLabel})`, ''];
    for (const { day } of dayColumns) {
      const slots = slotsByDay[day];
      if (slots.length === 0) continue;
      lines.push(`■ ${day}요일`);
      for (const s of slots) {
        lines.push(`  · ${s.classGroup || '(반 미정)'}`);
        if (s.programIds.length) {
          s.programIds.forEach((id) => {
            const t = programDetails[String(id)]?.title ?? getProgramTitle(id);
            lines.push(`    - ${t}`);
          });
        }
        if (s.memo.trim()) lines.push(`    메모: ${s.memo.trim()}`);
        lines.push(`    ${s.completed ? '✓ 완료' : '○ 예정'}`);
      }
      lines.push('');
    }
    return lines.join('\n').trim();
  }, [dayColumns, slotsByDay, weekTitle, weekLabel, programDetails]);

  const handleShare = () => {
    const text = buildShareText();
    navigator.clipboard.writeText(text).then(
      () => toast.success('계획이 클립보드에 복사되었습니다.'),
      () => toast.error('복사에 실패했습니다.')
    );
  };

  return (
    <div className="relative min-h-full flex flex-col bg-[#0F172A]">
      <section className="px-4 sm:px-8 lg:px-12 py-8 pb-40 space-y-6 flex-1">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-8 h-8 text-sky-400 shrink-0" />
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">주간 수업 계획</h2>
              <p className="text-slate-400 text-sm font-medium mt-0.5">{weekTitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
              aria-label="이전 주"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-4 py-2.5 rounded-xl font-bold bg-slate-800 border border-slate-600 text-white hover:bg-slate-700 transition-colors text-sm"
            >
              이번 주
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
              aria-label="다음 주"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" />
              이 계획 공유
            </button>
          </div>
        </header>

        {/* 데스크톱: 7열 */}
        <div className="hidden xl:grid xl:grid-cols-7 gap-3">
          {dayColumns.map(({ day }) => (
            <DayColumn
              key={day}
              day={day}
              slots={slotsByDay[day]}
              classes={classes}
              programDetails={programDetails}
              onAddSlot={() => addSlot(day)}
              onUpdateSlot={updateSlot}
              onRemoveSlot={removeSlot}
              onMarkDone={markDone}
              onRemoveProgram={removeProgramFromSlot}
              onOpenLibrary={(slotId) => setLibrarySlotId(slotId)}
            />
          ))}
        </div>

        {/* 모바일·태블릿: 세로 */}
        <div className="xl:hidden space-y-6">
          {dayColumns.map(({ day }) => (
            <DayColumn
              key={day}
              day={day}
              slots={slotsByDay[day]}
              classes={classes}
              programDetails={programDetails}
              onAddSlot={() => addSlot(day)}
              onUpdateSlot={updateSlot}
              onRemoveSlot={removeSlot}
              onMarkDone={markDone}
              onRemoveProgram={removeProgramFromSlot}
              onOpenLibrary={(slotId) => setLibrarySlotId(slotId)}
            />
          ))}
        </div>
      </section>

      {/* 라이브러리 슬라이드 패널 */}
      {librarySlotId !== null && (
        <>
          <button
            type="button"
            aria-label="패널 닫기"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setLibrarySlotId(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <p className="text-white font-black text-sm">프로그램 추가</p>
              <button
                type="button"
                onClick={() => setLibrarySlotId(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scroll">
              <LibraryView
                onOpenDetail={() => {}}
                onSelectProgram={(id) => {
                  addProgramToSlot(librarySlotId, id);
                  toast.success('계획에 추가했습니다.');
                }}
                programDetails={programDetails}
                compact
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DayColumn({
  day,
  slots,
  classes,
  programDetails,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  onMarkDone,
  onRemoveProgram,
  onOpenLibrary,
}: {
  day: LessonPlanDayKo;
  slots: import('../hooks/useLessonPlan').LessonPlanSlot[];
  classes: { id: string; name: string }[];
  programDetails: Record<string, ProgramDetail>;
  onAddSlot: () => void;
  onUpdateSlot: (slotId: string, patch: Partial<import('../hooks/useLessonPlan').LessonPlanSlot>) => void;
  onRemoveSlot: (slotId: string) => void;
  onMarkDone: (slotId: string, completed: boolean) => void;
  onRemoveProgram: (slotId: string, programId: number) => void;
  onOpenLibrary: (slotId: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-3 space-y-3 min-h-[120px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-amber-400">{day}</span>
      </div>
      <div className="space-y-3">
        {slots.map((slot) => (
          <div key={slot.slotId} className="rounded-xl bg-slate-900/80 border border-slate-600 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <select
                value={slot.classGroup}
                onChange={(e) => onUpdateSlot(slot.slotId, { classGroup: e.target.value })}
                className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500/50"
              >
                <option value="">반 선택</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onRemoveSlot(slot.slotId)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 shrink-0"
                aria-label="슬롯 삭제"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onOpenLibrary(slot.slotId)}
              className="w-full py-2 rounded-lg text-xs font-bold bg-sky-600/20 text-sky-300 border border-sky-500/30 hover:bg-sky-600/30 transition-colors"
            >
              프로그램 추가
            </button>
            {slot.programIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {slot.programIds.map((pid) => {
                  const d = programDetails[String(pid)];
                  const tag = d?.functionType ?? d?.mainTheme ?? '';
                  const title = d?.title ?? getProgramTitle(pid);
                  return (
                    <span
                      key={pid}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-slate-800 border border-slate-600 text-[10px] font-bold text-white max-w-full"
                    >
                      <span className="truncate">{title}</span>
                      {tag ? (
                        <span className="text-emerald-400 shrink-0 px-1 py-0.5 bg-emerald-500/10 rounded">{tag}</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onRemoveProgram(slot.slotId, pid)}
                        className="p-0.5 rounded text-slate-500 hover:text-white shrink-0"
                        aria-label="제거"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <textarea
              value={slot.memo}
              onChange={(e) => onUpdateSlot(slot.slotId, { memo: e.target.value })}
              placeholder="메모"
              rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-slate-500"
            />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={slot.completed}
                onChange={(e) => onMarkDone(slot.slotId, e.target.checked)}
                className="rounded border-slate-600 text-amber-500"
              />
              완료
            </label>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAddSlot}
        className="w-full flex items-center justify-center gap-1 py-2 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 text-xs font-bold transition-colors"
      >
        <Plus className="w-4 h-4" /> 수업 추가
      </button>
    </div>
  );
}
