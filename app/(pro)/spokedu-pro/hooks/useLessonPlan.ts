'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMondayWithWeekOffset,
  getWeekLabelForStorage,
} from '@/app/lib/spokedu-pro/weekUtils';

export type LessonPlanDayKo = '일' | '월' | '화' | '수' | '목' | '금' | '토';

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
      (item): item is LessonPlanSlot =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as LessonPlanSlot).slotId === 'string' &&
        DAY_ORDER.includes((item as LessonPlanSlot).dayOfWeek)
    );
  } catch {
    return [];
  }
}

function saveSlots(weekLabel: string, slots: LessonPlanSlot[]): { ok: true } | { ok: false; error: unknown } {
  try {
    localStorage.setItem(storageKey(weekLabel), JSON.stringify(slots));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function persistFailureMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);
  if (name === 'QuotaExceededError' || /quota|QuotaExceeded/i.test(message)) {
    return '저장 공간이 부족할 수 있어요. 브라우저 저장소를 비운 뒤 다시 시도해 주세요.';
  }
  return '브라우저에 수업 계획을 저장하지 못했어요.';
}

export function useLessonPlan(weekOffset: number) {
  const monday = useMemo(() => getMondayWithWeekOffset(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => getWeekLabelForStorage(monday), [monday]);

  const [slots, setSlotsState] = useState<LessonPlanSlot[]>(() => loadSlots(weekLabel));
  const [persistError, setPersistError] = useState<string | null>(null);

  useEffect(() => {
    setSlotsState(loadSlots(weekLabel));
    setPersistError(null);
  }, [weekLabel]);

  const setSlots = useCallback(
    (next: LessonPlanSlot[] | ((prev: LessonPlanSlot[]) => LessonPlanSlot[])) => {
      setSlotsState((prev) => {
        const resolved = typeof next === 'function' ? (next as (value: LessonPlanSlot[]) => LessonPlanSlot[])(prev) : next;
        const saved = saveSlots(weekLabel, resolved);
        if (!saved.ok) {
          queueMicrotask(() => setPersistError(persistFailureMessage(saved.error)));
          return prev;
        }
        queueMicrotask(() => setPersistError(null));
        return resolved;
      });
    },
    [weekLabel]
  );

  const retryPersist = useCallback(() => {
    try {
      localStorage.setItem(storageKey(weekLabel), JSON.stringify(slots));
      setPersistError(null);
      return true;
    } catch (error) {
      setPersistError(persistFailureMessage(error));
      return false;
    }
  }, [weekLabel, slots]);

  const clearPersistError = useCallback(() => setPersistError(null), []);

  const reloadForWeek = useCallback(() => {
    setSlotsState(loadSlots(weekLabel));
    setPersistError(null);
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
      setSlots((prev) => prev.map((slot) => (slot.slotId === slotId ? { ...slot, ...patch } : slot)));
    },
    [setSlots]
  );

  const removeSlot = useCallback(
    (slotId: string) => {
      setSlots((prev) => prev.filter((slot) => slot.slotId !== slotId));
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
        prev.map((slot) => {
          if (slot.slotId !== slotId) return slot;
          if (slot.programIds.includes(programId)) return slot;
          if (slot.programIds.length >= 5) return slot;
          return { ...slot, programIds: [...slot.programIds, programId] };
        })
      );
    },
    [setSlots]
  );

  const removeProgramFromSlot = useCallback(
    (slotId: string, programId: number) => {
      setSlots((prev) =>
        prev.map((slot) =>
          slot.slotId === slotId ? { ...slot, programIds: slot.programIds.filter((id) => id !== programId) } : slot
        )
      );
    },
    [setSlots]
  );

  const slotsForWeek = useMemo(() => slots, [slots]);

  const slotsByDay = useMemo(() => {
    const map: Record<LessonPlanDayKo, LessonPlanSlot[]> = {
      월: [],
      화: [],
      수: [],
      목: [],
      금: [],
      토: [],
      일: [],
    };
    for (const slot of slotsForWeek) {
      map[slot.dayOfWeek].push(slot);
    }
    return map;
  }, [slotsForWeek]);

  const todayKo = useMemo((): LessonPlanDayKo => {
    const day = new Date().getDay();
    const map: LessonPlanDayKo[] = ['일', '월', '화', '수', '목', '금', '토'];
    return map[day] ?? '월';
  }, []);

  const todaySlots = useMemo(() => {
    if (weekOffset !== 0) return [];
    return slotsForWeek.filter((slot) => slot.dayOfWeek === todayKo);
  }, [slotsForWeek, todayKo, weekOffset]);

  return {
    weekLabel,
    monday,
    slotsForWeek,
    slotsByDay,
    todaySlots,
    reloadForWeek,
    persistError,
    retryPersist,
    clearPersistError,
    addSlot,
    updateSlot,
    removeSlot,
    markDone,
    addProgramToSlot,
    removeProgramFromSlot,
    DAY_ORDER,
  };
}
