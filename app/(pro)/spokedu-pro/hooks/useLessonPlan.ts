'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMondayWithWeekOffset,
  getWeekLabelForStorage,
} from '@/app/lib/spokedu-pro/weekUtils';

export type LessonPlanDayKo = '월' | '화' | '수' | '목' | '금' | '토' | '일';

export type LessonPlanSlot = {
  slotId: string;
  dayOfWeek: LessonPlanDayKo;
  classGroup: string;
  programIds: number[];
  memo: string;
  completed: boolean;
};

const DAY_ORDER: LessonPlanDayKo[] = ['월', '화', '수', '목', '금', '토', '일'];

function storageKey(weekLabel: string): string {
  return `spokedu-pro:lesson-plan:${weekLabel}`;
}

function loadSlots(weekLabel: string): LessonPlanSlot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(weekLabel));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is LessonPlanSlot =>
        x &&
        typeof x === 'object' &&
        typeof (x as LessonPlanSlot).slotId === 'string' &&
        DAY_ORDER.includes((x as LessonPlanSlot).dayOfWeek)
    );
  } catch {
    return [];
  }
}

function saveSlots(weekLabel: string, slots: LessonPlanSlot[]): void {
  try {
    localStorage.setItem(storageKey(weekLabel), JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}

export function useLessonPlan(weekOffset: number) {
  const monday = useMemo(() => getMondayWithWeekOffset(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => getWeekLabelForStorage(monday), [monday]);

  const [slots, setSlotsState] = useState<LessonPlanSlot[]>(() => loadSlots(weekLabel));

  useEffect(() => {
    setSlotsState(loadSlots(weekLabel));
  }, [weekLabel]);

  const setSlots = useCallback(
    (next: LessonPlanSlot[] | ((prev: LessonPlanSlot[]) => LessonPlanSlot[])) => {
      setSlotsState((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: LessonPlanSlot[]) => LessonPlanSlot[])(prev) : next;
        saveSlots(weekLabel, resolved);
        return resolved;
      });
    },
    [weekLabel]
  );

  const reloadForWeek = useCallback(() => {
    setSlotsState(loadSlots(weekLabel));
  }, [weekLabel]);

  const addSlot = useCallback(
    (dayOfWeek: LessonPlanDayKo, classGroup = '') => {
      const slotId = `${dayOfWeek}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setSlots((prev) => [...prev, { slotId, dayOfWeek, classGroup, programIds: [], memo: '', completed: false }]);
    },
    [setSlots]
  );

  const updateSlot = useCallback(
    (slotId: string, patch: Partial<Omit<LessonPlanSlot, 'slotId'>>) => {
      setSlots((prev) => prev.map((s) => (s.slotId === slotId ? { ...s, ...patch } : s)));
    },
    [setSlots]
  );

  const removeSlot = useCallback(
    (slotId: string) => {
      setSlots((prev) => prev.filter((s) => s.slotId !== slotId));
    },
    [setSlots]
  );

  const markDone = useCallback(
    (slotId: string, completed: boolean) => {
      updateSlot(slotId, { completed });
    },
    [updateSlot]
  );

  const addProgramToSlot = useCallback(
    (slotId: string, programId: number) => {
      setSlots((prev) =>
        prev.map((s) => {
          if (s.slotId !== slotId) return s;
          if (s.programIds.includes(programId)) return s;
          if (s.programIds.length >= 5) return s;
          return { ...s, programIds: [...s.programIds, programId] };
        })
      );
    },
    [setSlots]
  );

  const removeProgramFromSlot = useCallback(
    (slotId: string, programId: number) => {
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slotId ? { ...s, programIds: s.programIds.filter((id) => id !== programId) } : s
        )
      );
    },
    [setSlots]
  );

  const slotsForWeek = useMemo(() => slots, [slots]);

  const slotsByDay = useMemo(() => {
    const map: Record<LessonPlanDayKo, LessonPlanSlot[]> = {
      월: [], 화: [], 수: [], 목: [], 금: [], 토: [], 일: [],
    };
    for (const s of slotsForWeek) {
      map[s.dayOfWeek].push(s);
    }
    return map;
  }, [slotsForWeek]);

  const todayKo = useMemo((): LessonPlanDayKo => {
    const js = new Date().getDay();
    const map: LessonPlanDayKo[] = ['일', '월', '화', '수', '목', '금', '토'];
    return map[js];
  }, []);

  const todaySlots = useMemo(() => {
    if (weekOffset !== 0) return [];
    return slotsForWeek.filter((s) => s.dayOfWeek === todayKo);
  }, [slotsForWeek, todayKo, weekOffset]);

  return {
    weekLabel,
    monday,
    slotsForWeek,
    slotsByDay,
    todaySlots,
    reloadForWeek,
    addSlot,
    updateSlot,
    removeSlot,
    markDone,
    addProgramToSlot,
    removeProgramFromSlot,
    DAY_ORDER,
  };
}
