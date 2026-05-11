'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, ClipboardCheck, Library, Sparkles, UserPlus } from 'lucide-react';
import type { ThemeKey } from '@/app/lib/spokedu-pro/dashboardDefaults';
import { SubscriberButton } from '../../components/SubscriberWorkspacePrimitives';
import { useClassStore } from '../../hooks/useClassStore';
import {
  readTodayClassState,
  patchTodayClassState,
  type TodayClassPhase,
} from '../../utils/todayClassStorage';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const CARD_SPACING = 'space-y-4 md:space-y-5';

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
  const t = useTranslator();
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
    const byId = persisted.selectedClassId ? classes.find((item) => item.id === persisted.selectedClassId) : null;
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
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekday = WEEKDAYS[now.getDay()];
    return t(`${year}년 ${month}월 ${day}일 ${weekday}`);
  }, [t]);

  const filledBars = phase === 'idle' ? 0 : phase === 'ready' ? 1 : phase === 'in-progress' ? 2 : 3;

  if (!loaded) {
    return <div className="sp-pro-today-card min-h-[140px] animate-pulse rounded-[var(--sp-ott-radius-2xl,2rem)] p-6" />;
  }

  if (classes.length === 0) {
    return (
      <div className={`sp-pro-today-card rounded-[var(--sp-ott-radius-2xl,2rem)] p-5 md:p-6 ${CARD_SPACING}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-400">{dateLabel}</p>
        </div>
        <h3 className="text-xl font-black text-white">{t('오늘 수업 없음')}</h3>
        <p className="text-sm text-slate-400">{t('등록된 반이 없어요. 반을 추가하면 오늘 수업 카드를 만들 수 있습니다.')}</p>
        <SubscriberButton tone="sky" icon={<UserPlus className="h-5 w-5" />} onClick={onAddClass}>
          {t('반 추가하기')}
        </SubscriberButton>
      </div>
    );
  }

  return (
    <div className={`sp-pro-today-card rounded-[var(--sp-ott-radius-2xl,2rem)] p-5 md:p-6 ${CARD_SPACING}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 md:text-[13px] lg:text-sm">{dateLabel}</p>
          <h3 className="mt-1 text-base font-black text-white md:text-[1.02rem] lg:text-lg">{t('오늘의 수업')}</h3>
        </div>
        <div className="relative min-w-[160px]">
          <label className="sr-only" htmlFor="today-class-select">
            {t('수업 반 선택')}
          </label>
          <select
            id="today-class-select"
            value={selectedClass?.id ?? ''}
            onChange={(event) => updatePersisted({ selectedClassId: event.target.value || null })}
            className="w-full appearance-none rounded-xl border border-slate-600 bg-slate-900 py-2.5 pl-4 pr-10 text-xs font-bold text-white focus:border-amber-500/60 focus:outline-none md:text-[13px] lg:text-sm"
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-1.5 lg:gap-2">
        {(['준비 완료', '수업 중', '수업 마무리'] as const).map((label, index) => {
          const done = index < filledBars;
          const current = index === filledBars && phase !== 'done';
          return (
            <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors md:h-2 ${
                  done ? 'bg-amber-400' : current ? 'bg-amber-400/50 ring-1 ring-amber-400/40' : 'bg-slate-700'
                }`}
              />
              <span className={`hidden shrink-0 text-[10px] font-bold uppercase tracking-wider lg:inline ${done || current ? 'text-amber-400' : 'text-slate-500'}`}>
                {t(label)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between gap-1 text-[10px] font-bold uppercase text-slate-500 lg:hidden">
        <span className={filledBars >= 1 ? 'text-amber-400' : ''}>{t('준비')}</span>
        <span className={filledBars >= 2 ? 'text-amber-400' : ''}>{t('진행')}</span>
        <span className={filledBars >= 3 ? 'text-amber-400' : ''}>{t('마무리')}</span>
      </div>

      <div>
        {phase === 'idle' && (
          <SubscriberButton
            tone="emerald"
            wide
            icon={<Library className="h-5 w-5" />}
            onClick={() => {
              updatePersisted({ phase: 'ready' });
              onGoToLibrary(weekThemeKey);
            }}
          >
            {t('수업 준비 시작')}
          </SubscriberButton>
        )}
        {phase === 'ready' && (
          <SubscriberButton
            tone="amber"
            wide
            icon={<Bell className="h-5 w-5" />}
            onClick={() => {
              updatePersisted({ phase: 'in-progress' });
              onStartClass();
            }}
          >
            {t('수업 시작')}
          </SubscriberButton>
        )}
        {phase === 'in-progress' && (
          <SubscriberButton tone="blue" wide icon={<ClipboardCheck className="h-5 w-5" />} onClick={() => onOpenPostClass(className)}>
            {t('수업 마무리')}
          </SubscriberButton>
        )}
        {phase === 'done' && (
          <SubscriberButton tone="purple" wide icon={<Sparkles className="h-5 w-5" />} onClick={onGoToAIReport}>
            {t('리포트 생성하기')}
          </SubscriberButton>
        )}
      </div>
    </div>
  );
}
