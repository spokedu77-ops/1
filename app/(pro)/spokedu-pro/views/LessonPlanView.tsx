'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Share2, BookOpenCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import LibraryView from './LibraryView';
import { useLessonPlan, type LessonPlanDayKo, type LessonPlanSlot } from '../hooks/useLessonPlan';
import { useClassStore } from '../hooks/useClassStore';
import { formatWeekLabelFromMonday } from '@/app/lib/spokedu-pro/weekUtils';
import { getProgramTitle } from '@/app/lib/spokedu-pro/dashboardDefaults';
import { SubscriberBadge, SubscriberButton } from '../components/SubscriberWorkspacePrimitives';
import type { ProgramDetail } from '../types';

function dayKoFromMondayOffset(monday: Date, offset: number): LessonPlanDayKo {
  const date = new Date(monday);
  date.setDate(monday.getDate() + offset);
  const map: LessonPlanDayKo[] = ['일', '월', '화', '수', '목', '금', '토'];
  return map[date.getDay()] ?? '월';
}

export default function LessonPlanView({
  programDetails = {},
}: {
  programDetails?: Record<string, ProgramDetail>;
}) {
  const tr = useTranslator();
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
    persistError,
    retryPersist,
    clearPersistError,
  } = useLessonPlan(weekOffset);

  const { classes } = useClassStore();
  const [librarySlotId, setLibrarySlotId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const weekTitle = useMemo(() => formatWeekLabelFromMonday(monday), [monday]);
  const dayColumns = useMemo(
    () => DAY_ORDER.map((_, index) => ({ day: dayKoFromMondayOffset(monday, index), offset: index })),
    [monday, DAY_ORDER]
  );

  const buildShareText = useCallback(() => {
    const lines: string[] = [`[${tr('스포키듀')}] ${tr('수업 계획')} ${tr(weekTitle)} (${tr(weekLabel)})`, ''];
    for (const { day } of dayColumns) {
      const slots = slotsByDay[day];
      if (slots.length === 0) continue;
      lines.push(`${day}요일`);
      for (const slot of slots) {
        lines.push(`  - ${slot.classGroup || tr('(반 미정)')}`);
        if (slot.programIds.length) {
          slot.programIds.forEach((id) => {
            const title = programDetails[String(id)]?.title ?? getProgramTitle(id);
            lines.push(`    · ${title}`);
          });
        }
        if (slot.memo.trim()) lines.push(`    ${tr('메모:')} ${slot.memo.trim()}`);
        lines.push(`    ${slot.completed ? tr('완료') : tr('예정')}`);
      }
      lines.push('');
    }
    return lines.join('\n').trim();
  }, [dayColumns, slotsByDay, weekTitle, weekLabel, programDetails, tr]);

  const handleShare = () => {
    const text = buildShareText();
    setShareError(null);
    void navigator.clipboard.writeText(text).then(
      () => {
        toast.success(tr('계획이 클립보드에 복사되었습니다.'));
      },
      () => {
        setShareError(tr('클립보드에 복사하지 못했어요. 브라우저 권한을 확인해 주세요.'));
        toast.error(tr('복사에 실패했습니다.'));
      }
    );
  };

  return (
    <div className="relative flex min-h-full flex-col bg-[#0f172a]">
      <section className="flex-1 space-y-6 px-4 py-8 pb-40 sm:px-8 lg:px-12">
        {persistError && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-200 sm:flex-row sm:items-center">
            <span className="flex-1">{persistError}</span>
            <div className="flex shrink-0 flex-wrap gap-2">
              <SubscriberButton tone="red" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void retryPersist()}>
                {tr('다시 시도')}
              </SubscriberButton>
              <SubscriberButton tone="slate" size="sm" onClick={() => clearPersistError()}>
                {tr('닫기')}
              </SubscriberButton>
            </div>
          </div>
        )}

        {shareError && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-900/20 p-4 text-sm text-amber-100 sm:flex-row sm:items-center">
            <span className="flex-1">{shareError}</span>
            <SubscriberButton tone="amber" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={handleShare}>
              {tr('다시 시도')}
            </SubscriberButton>
          </div>
        )}

        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-8 w-8 shrink-0 text-sky-400" />
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">{tr('주간 수업 계획')}</h2>
              <p className="mt-0.5 text-sm font-medium text-slate-400">{tr(weekTitle)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label={tr('이전 주')} onClick={() => setWeekOffset((offset) => offset - 1)} icon={<ChevronLeft className="h-5 w-5" />} />
            <SubscriberButton tone="slate" size="sm" onClick={() => setWeekOffset(0)}>
              {tr('이번 주')}
            </SubscriberButton>
            <IconButton label={tr('다음 주')} onClick={() => setWeekOffset((offset) => offset + 1)} icon={<ChevronRight className="h-5 w-5" />} />
            <SubscriberButton tone="emerald" size="sm" icon={<Share2 className="h-4 w-4" />} onClick={handleShare}>
              {tr('이 계획 공유')}
            </SubscriberButton>
          </div>
        </header>

        <div className="hidden gap-3 xl:grid xl:grid-cols-7">
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

        <div className="space-y-6 xl:hidden">
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

      {librarySlotId !== null && (
        <>
          <button
            type="button"
            aria-label={tr('패널 닫기')}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setLibrarySlotId(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-black text-white">{tr('프로그램 추가')}</p>
              <button
                type="button"
                onClick={() => setLibrarySlotId(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label={tr('닫기')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="custom-scroll min-h-0 flex-1 overflow-y-auto">
              <LibraryView
                onOpenDetail={() => {}}
                onSelectProgram={(id) => {
                  addProgramToSlot(librarySlotId, id);
                  toast.success(tr('계획에 추가했습니다.'));
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

function IconButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-600 p-2.5 text-slate-300 transition-colors hover:bg-slate-800"
      aria-label={label}
    >
      {icon}
    </button>
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
  slots: LessonPlanSlot[];
  classes: { id: string; name: string }[];
  programDetails: Record<string, ProgramDetail>;
  onAddSlot: () => void;
  onUpdateSlot: (slotId: string, patch: Partial<LessonPlanSlot>) => void;
  onRemoveSlot: (slotId: string) => void;
  onMarkDone: (slotId: string, completed: boolean) => void;
  onRemoveProgram: (slotId: string, programId: number) => void;
  onOpenLibrary: (slotId: string) => void;
}) {
  const tr = useTranslator();
  return (
    <div className="min-h-[120px] space-y-3 rounded-2xl border border-slate-700 bg-slate-800/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-amber-400">{day}</span>
      </div>
      <div className="space-y-3">
        {slots.map((slot) => (
          <div key={slot.slotId} className="space-y-2 rounded-xl border border-slate-600 bg-slate-900/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <select
                value={slot.classGroup}
                onChange={(event) => onUpdateSlot(slot.slotId, { classGroup: event.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs font-bold text-white focus:border-sky-500/50 focus:outline-none"
              >
                <option value="">{tr('반 선택')}</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.name}>
                    {classItem.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onRemoveSlot(slot.slotId)}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400"
                aria-label={tr('슬롯 삭제')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SubscriberButton tone="cyan" size="sm" wide onClick={() => onOpenLibrary(slot.slotId)}>
              {tr('프로그램 추가')}
            </SubscriberButton>

            {slot.programIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {slot.programIds.map((programId) => {
                  const detail = programDetails[String(programId)];
                  const tag = detail?.functionType ?? detail?.mainTheme ?? '';
                  const title = detail?.title ?? getProgramTitle(programId);
                  return (
                    <span key={programId} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 py-1 pl-2 pr-1 text-[10px] font-bold text-white">
                      <span className="truncate">{title}</span>
                      {tag ? <SubscriberBadge tone="emerald">{tag}</SubscriberBadge> : null}
                      <button
                        type="button"
                        onClick={() => onRemoveProgram(slot.slotId, programId)}
                        className="shrink-0 rounded p-0.5 text-slate-500 hover:text-white"
                        aria-label={tr('제거')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <textarea
              value={slot.memo}
              onChange={(event) => onUpdateSlot(slot.slotId, { memo: event.target.value })}
              placeholder={tr('메모')}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-400">
              <input
                type="checkbox"
                checked={slot.completed}
                onChange={(event) => onMarkDone(slot.slotId, event.target.checked)}
                className="rounded border-slate-600 text-amber-500"
              />
              {tr('완료')}
            </label>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAddSlot}
        className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-600 py-2 text-xs font-bold text-slate-400 transition-colors hover:border-slate-500 hover:text-white"
      >
        <Plus className="h-4 w-4" /> {tr('수업 추가')}
      </button>
    </div>
  );
}
