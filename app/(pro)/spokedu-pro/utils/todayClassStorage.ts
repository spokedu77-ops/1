export type TodayClassPhase = 'idle' | 'ready' | 'in-progress' | 'done';

export type PersistedTodayClass = {
  phase: TodayClassPhase;
  selectedClassId: string | null;
};

function dateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readTodayClassState(): PersistedTodayClass {
  const d = dateKey();
  if (typeof window === 'undefined') {
    return { phase: 'idle', selectedClassId: null };
  }
  try {
    const raw = localStorage.getItem(`spokedu-pro:today-class:${d}`);
    if (!raw) return { phase: 'idle', selectedClassId: null };
    const j = JSON.parse(raw) as Partial<PersistedTodayClass>;
    const phase = j.phase;
    const ok =
      phase === 'idle' || phase === 'ready' || phase === 'in-progress' || phase === 'done';
    return {
      phase: ok ? phase : 'idle',
      selectedClassId: typeof j.selectedClassId === 'string' ? j.selectedClassId : null,
    };
  } catch {
    return { phase: 'idle', selectedClassId: null };
  }
}

export function patchTodayClassState(patch: Partial<PersistedTodayClass>): void {
  const d = dateKey();
  try {
    const cur = readTodayClassState();
    const next = { ...cur, ...patch };
    localStorage.setItem(`spokedu-pro:today-class:${d}`, JSON.stringify(next));
    window.dispatchEvent(new Event('spokedu-pro-today-class-updated'));
  } catch {
    /* ignore */
  }
}

export function setTodayClassPhase(phase: TodayClassPhase): void {
  patchTodayClassState({ phase });
}
