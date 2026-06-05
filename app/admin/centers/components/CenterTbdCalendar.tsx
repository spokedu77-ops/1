'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Upload, RefreshCw } from 'lucide-react';
import CenterTbdEventPanel from './CenterTbdEventPanel';
import { useCenterTbdSchedule } from '../hooks/useCenterTbdSchedule';
import {
  createDefaultCenterTbdClass,
  flattenClassesToCalendarItems,
  teacherUndecided,
  teachersLine,
  type LocalTbdCalendarItem,
  type CenterTbdClass,
} from '../lib/localTbdStorage';

function getMonthGrid(anchor: Date) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const first = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0).getDate();
  const pad = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  const monthLabel = first.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  return { cells, monthLabel, y, m };
}

function dayMapKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function chunkWeeks(cells: (Date | null)[]) {
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function formatTimeShort(iso: string) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameLocalCalendarDay(a: Date, b: Date) {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

function isPastCalendarDay(cell: Date) {
  return startOfLocalDay(cell).getTime() < startOfLocalDay(new Date()).getTime();
}

function monthRowTone(ev: LocalTbdCalendarItem) {
  if (teacherUndecided(ev.mainTeacherName)) {
    return 'bg-red-100 border-2 border-red-500 shadow-sm';
  }
  return 'bg-indigo-50 border border-indigo-200 shadow-sm';
}

function MonthEventRow({
  ev,
  isPastDay,
  onOpen,
}: {
  ev: LocalTbdCalendarItem;
  isPastDay: boolean;
  onOpen: (classId: string) => void;
}) {
  const teacherShort = teachersLine(ev.mainTeacherName, ev.extraTeacherName);
  const undecided = teacherUndecided(ev.mainTeacherName);
  const r = `${ev.roundIndex}/${ev.roundTotal}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(ev.classId)}
      className={`w-full text-left border-b border-slate-200/80 last:border-b-0 px-0.5 py-1 min-w-0 flex flex-col gap-0.5 ${monthRowTone(ev)} hover:brightness-[0.97]`}
    >
      <div className="flex items-start gap-1 min-w-0">
        <span className="shrink-0 text-[9px] font-black text-slate-600 tabular-nums w-9">
          {formatTimeShort(ev.startAt)}
        </span>
        <span
          className={`min-w-0 flex-1 text-[10px] font-bold text-slate-900 leading-snug line-clamp-2 break-words ${
            isPastDay ? 'line-through text-slate-500' : ''
          }`}
        >
          {ev.title}
        </span>
        <span
          className={`shrink-0 text-[9px] font-black tabular-nums whitespace-nowrap ${
            isPastDay ? 'line-through text-slate-500' : 'text-slate-600'
          }`}
        >
          {r}
        </span>
      </div>
      <div
        className={`pl-9 flex min-w-0 items-center gap-1 ${
          isPastDay ? 'line-through text-slate-400' : undecided ? 'text-red-700' : 'text-slate-500'
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-[8px] font-bold">{teacherShort}</span>
      </div>
    </button>
  );
}

export default function CenterTbdCalendar() {
  const {
    classes,
    teachers,
    loading,
    saving,
    importing,
    error,
    localOnlyCount,
    showImportBanner,
    reload,
    saveClass,
    removeClass,
    importFromLocal,
  } = useCenterTbdSchedule();

  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelClass, setPanelClass] = useState<CenterTbdClass | null>(null);
  const [panelIsNew, setPanelIsNew] = useState(false);

  const calendarItems = useMemo(() => flattenClassesToCalendarItems(classes), [classes]);

  const monthInfo = useMemo(() => getMonthGrid(monthAnchor), [monthAnchor]);
  const monthWeekRows = useMemo(() => chunkWeeks(monthInfo.cells), [monthInfo.cells]);

  const eventsByMonthDay = useMemo(() => {
    const map = new Map<string, LocalTbdCalendarItem[]>();
    const { y, m } = monthInfo;
    for (const ev of calendarItems) {
      const s = new Date(ev.startAt);
      if (s.getFullYear() !== y || s.getMonth() !== m) continue;
      const key = dayMapKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [calendarItems, monthInfo]);

  const openClass = useCallback(
    (classId: string) => {
      const found = classes.find((c) => c.id === classId);
      if (!found) return;
      setPanelClass(found);
      setPanelIsNew(false);
      setPanelOpen(true);
    },
    [classes]
  );

  const openCreate = useCallback(() => {
    setPanelClass(createDefaultCenterTbdClass(new Date(), 4));
    setPanelIsNew(true);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setPanelClass(null);
    setPanelIsNew(false);
  }, []);

  const today = new Date();

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col bg-white text-slate-900">
      <nav className="border-b px-4 sm:px-6 py-3 bg-white flex flex-wrap justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h2 className="text-base font-black text-slate-950 flex items-center gap-2 shrink-0">
            <CalendarIcon size={18} className="text-indigo-600" />
            센터 미정 캘린더
          </h2>

          <div className="flex bg-slate-100 rounded-lg p-0.5 items-center">
            <button
              type="button"
              onClick={() =>
                setMonthAnchor((prev) => {
                  const d = new Date(prev);
                  d.setMonth(d.getMonth() - 1);
                  return d;
                })
              }
              className="p-1.5 hover:bg-white rounded-md transition-all"
              aria-label="이전 달"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                const n = new Date();
                setMonthAnchor(new Date(n.getFullYear(), n.getMonth(), 1));
              }}
              className="px-3 py-1 text-xs font-black rounded-md hover:bg-white transition-all"
            >
              이번 달
            </button>
            <button
              type="button"
              onClick={() =>
                setMonthAnchor((prev) => {
                  const d = new Date(prev);
                  d.setMonth(d.getMonth() + 1);
                  return d;
                })
              }
              className="p-1.5 hover:bg-white rounded-md transition-all"
              aria-label="다음 달"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <span className="text-xs font-black text-slate-600">{monthInfo.monthLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            aria-label="새로고침"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus size={14} />
            수업 추가
          </button>
        </div>
      </nav>

      {error ? (
        <div className="mx-4 sm:mx-6 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      ) : null}

      {showImportBanner ? (
        <div className="mx-4 sm:mx-6 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <span>
            이 브라우저에만 저장된 수업 {localOnlyCount}개가 있습니다. 서버가 비어 있을 때만 한 번 올릴 수
            있습니다.
          </span>
          <button
            type="button"
            onClick={() => void importFromLocal()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-60"
          >
            <Upload size={14} />
            {importing ? '올리는 중…' : '서버에 올리기'}
          </button>
        </div>
      ) : (
        <div className="rounded-lg mx-4 sm:mx-6 mt-3 mb-1 border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          관리자 간 공유 · 수업 관리 DB(classes-v2)와 연동되지 않습니다.
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
        {loading ? (
          <div className="max-w-[1600px] mx-auto rounded-2xl border border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            불러오는 중…
          </div>
        ) : (
          <>
            <div className="max-w-[1600px] mx-auto rounded-2xl border border-slate-300 bg-slate-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-7 gap-px bg-slate-300 border-b border-slate-300">
                {['월', '화', '수', '목', '금', '토', '일'].map((w) => (
                  <div
                    key={w}
                    className="bg-slate-100 px-2 py-2 text-center text-[11px] font-black text-slate-600"
                  >
                    {w}
                  </div>
                ))}
              </div>

              {monthWeekRows.map((weekCells, wIdx) => (
                <div
                  key={`week-${wIdx}`}
                  className="grid grid-cols-7 gap-px bg-slate-300 border-b border-slate-300 last:border-b-0 items-stretch"
                >
                  {weekCells.map((cell, dIdx) => {
                    if (!cell) {
                      return (
                        <div
                          key={`pad-${wIdx}-${dIdx}`}
                          className="bg-slate-100/80 min-h-[100px] min-w-0"
                        />
                      );
                    }
                    const key = dayMapKey(cell);
                    const dayEvents = eventsByMonthDay.get(key) || [];
                    const isToday = isSameLocalCalendarDay(cell, today);
                    const isPastDay = isPastCalendarDay(cell);
                    const headerLabel = cell.toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                    });

                    return (
                      <div
                        key={key}
                        className={`flex flex-col min-w-0 min-h-0 border border-slate-200/80 ${
                          isToday
                            ? 'z-[1] bg-blue-50/60 shadow-md ring-[3px] ring-blue-600 ring-inset'
                            : 'bg-white'
                        }`}
                      >
                        <div
                          className={`shrink-0 flex items-center justify-center gap-1 flex-wrap py-1.5 px-1 text-[10px] font-black text-white ${
                            isToday ? 'bg-blue-800' : 'bg-blue-600'
                          }`}
                        >
                          {isToday ? (
                            <span className="rounded px-1 py-px text-[8px] font-black uppercase tracking-wide bg-white/25 text-white">
                              오늘
                            </span>
                          ) : null}
                          <span>{headerLabel}</span>
                        </div>
                        <div className="flex flex-col flex-1 min-h-0 min-w-0 p-0">
                          {dayEvents.length === 0 ? (
                            <div
                              className={`flex-1 min-h-[48px] ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}
                            />
                          ) : (
                            dayEvents.map((ev) => (
                              <MonthEventRow
                                key={ev.roundId}
                                ev={ev}
                                isPastDay={isPastDay}
                                onOpen={openClass}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <p className="mt-3 text-[11px] font-bold text-slate-500">
              같은 날 여러 회차·수업을 각각 다른 시간으로 설정할 수 있습니다. 메인 강사 미정은 빨간 칸으로
              표시됩니다.
            </p>
          </>
        )}
      </div>

      <CenterTbdEventPanel
        open={panelOpen}
        classItem={panelClass}
        isNew={panelIsNew}
        teachers={teachers}
        saving={saving}
        onClose={closePanel}
        onSave={saveClass}
        onDelete={removeClass}
      />
    </div>
  );
}
