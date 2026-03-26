'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Library, Bell, ClipboardCheck, Sparkles, UserPlus } from 'lucide-react';
import type { ThemeKey } from '@/app/lib/spokedu-pro/dashboardDefaults';
import { useClassStore } from '../../hooks/useClassStore';
import {
  readTodayClassState,
  patchTodayClassState,
  type TodayClassPhase,
} from '../../utils/todayClassStorage';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export default function TodayClassCard({
  weekThemeKey,
  onGoToLibrary,
  onStartClass,
  onOpenPostClass,
  onGoToAIReport,
  onAddClass,
}: {
  weekThemeKey: ThemeKey;
  onGoToLibrary: (themeKey?: ThemeKey) => void;
  onStartClass: () => void;
  onOpenPostClass: (className: string) => void;
  onGoToAIReport: () => void;
  onAddClass: () => void;
}) {
  const { classes, loaded } = useClassStore();
  const [persisted, setPersisted] = useState(() => readTodayClassState());

  const syncFromStorage = useCallback(() => {
    setPersisted(readTodayClassState());
  }, []);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    window.addEventListener('spokedu-pro-today-class-updated', syncFromStorage);
    return () => window.removeEventListener('spokedu-pro-today-class-updated', syncFromStorage);
  }, [syncFromStorage]);

  const selectedClass = useMemo(() => {
    if (!classes.length) return null;
    const byId = persisted.selectedClassId
      ? classes.find((c) => c.id === persisted.selectedClassId)
      : null;
    return byId ?? classes[0];
  }, [classes, persisted.selectedClassId]);

  const updatePersisted = useCallback((patch: { phase?: TodayClassPhase; selectedClassId?: string | null }) => {
    patchTodayClassState(patch);
    setPersisted(readTodayClassState());
  }, []);

  const phase = persisted.phase;
  const className = selectedClass?.name ?? '';

  const dateLabel = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const day = now.getDate();
    const wd = WEEKDAYS[now.getDay()];
    return `${y}년 ${m}월 ${day}일 ${wd}`;
  }, []);

  const filledBars = phase === 'idle' ? 0 : phase === 'ready' ? 1 : phase === 'in-progress' ? 2 : 3;

  if (!loaded) {
    return (
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 animate-pulse min-h-[140px]" />
    );
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-slate-400 text-sm font-bold">{dateLabel}</p>
        </div>
        <h3 className="text-xl font-black text-white">오늘 수업 없음</h3>
        <p className="text-slate-400 text-sm">등록된 반이 없어요. 반을 추가하면 오늘의 수업 카드를 쓸 수 있어요.</p>
        <button
          type="button"
          onClick={onAddClass}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          반 추가하기
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-800 border border-slate-700 p-5 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-slate-400 text-sm font-bold">{dateLabel}</p>
          <h3 className="text-lg font-black text-white mt-1">오늘의 수업</h3>
        </div>
        <div className="relative min-w-[160px]">
          <label className="sr-only" htmlFor="today-class-select">
            수업 반 선택
          </label>
          <select
            id="today-class-select"
            value={selectedClass?.id ?? ''}
            onChange={(e) => updatePersisted({ selectedClassId: e.target.value || null })}
            className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl pl-4 pr-10 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-amber-500/60"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {(['준비 완료', '수업 중', '수업 마무리'] as const).map((label, i) => {
          const done = i < filledBars;
          const current = i === filledBars && phase !== 'done';
          return (
            <div key={label} className="flex-1 flex items-center gap-2 min-w-0">
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  done ? 'bg-amber-400' : current ? 'bg-amber-400/50 ring-1 ring-amber-400/40' : 'bg-slate-700'
                }`}
              />
              <span
                className={`hidden lg:inline text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  done || current ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex lg:hidden justify-between text-[10px] font-bold text-slate-500 uppercase gap-1">
        <span className={filledBars >= 1 ? 'text-amber-400' : ''}>준비</span>
        <span className={filledBars >= 2 ? 'text-amber-400' : ''}>진행</span>
        <span className={filledBars >= 3 ? 'text-amber-400' : ''}>마무리</span>
      </div>

      <div>
        {phase === 'idle' && (
          <button
            type="button"
            onClick={() => {
              updatePersisted({ phase: 'ready' });
              onGoToLibrary(weekThemeKey);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <Library className="w-5 h-5" />
            수업 준비 시작
          </button>
        )}
        {phase === 'ready' && (
          <button
            type="button"
            onClick={() => {
              updatePersisted({ phase: 'in-progress' });
              onStartClass();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors"
          >
            <Bell className="w-5 h-5" />
            수업 시작 🔔
          </button>
        )}
        {phase === 'in-progress' && (
          <button
            type="button"
            onClick={() => onOpenPostClass(className)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <ClipboardCheck className="w-5 h-5" />
            수업 마무리
          </button>
        )}
        {phase === 'done' && (
          <button
            type="button"
            onClick={onGoToAIReport}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            리포트 생성하기
          </button>
        )}
      </div>
    </div>
  );
}
