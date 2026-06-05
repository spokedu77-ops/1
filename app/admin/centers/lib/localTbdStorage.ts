export type CenterTbdRound = {
  id: string;
  roundIndex: number;
  date: string;
  startTime: string;
  endTime: string;
};

export type CenterTbdClass = {
  id: string;
  title: string;
  mainTeacherId: string | null;
  extraTeacherId: string | null;
  mainTeacherName: string;
  extraTeacherName: string;
  roundTotal: number;
  rounds: CenterTbdRound[];
};

/** @deprecated localStorage v2 호환용 */
export type LocalTbdRound = CenterTbdRound;
/** @deprecated localStorage v2 호환용 */
export type LocalTbdClass = CenterTbdClass & {
  startTime?: string;
  endTime?: string;
};

export type LocalTbdCalendarItem = {
  classId: string;
  roundId: string;
  title: string;
  startAt: string;
  endAt: string;
  mainTeacherName: string;
  extraTeacherName: string;
  roundIndex: number;
  roundTotal: number;
};

const STORAGE_KEY_V2 = 'center-tbd-calendar-v2';
const STORAGE_KEY_V1 = 'center-tbd-calendar-v1';

export function teacherUndecided(name: string, teacherId?: string | null) {
  if (teacherId) return false;
  return !String(name ?? '').trim();
}

export function teacherDisplay(name: string) {
  const t = String(name ?? '').trim();
  return t || '미정';
}

export function teachersLine(main: string, extra: string) {
  const m = teacherDisplay(main);
  const e = String(extra ?? '').trim();
  if (!e) return m;
  return `${m} · ${e}`;
}

function padTime(n: number) {
  return String(n).padStart(2, '0');
}

export function toTimeInputValue(time: string | null | undefined, fallback = '10:00') {
  const t = String(time ?? '').trim();
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  return fallback;
}

export function mergeDateAndTime(dateStr: string, timeStr: string, fallback: Date) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '10:00').split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    return fallback;
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
}

export function todayDateInputValue() {
  return toDateInputValue(new Date());
}

function addDays(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toDateInputValue(dt);
}

function isCenterTbdRound(v: unknown): v is CenterTbdRound {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.roundIndex === 'number' &&
    typeof o.date === 'string' &&
    typeof o.startTime === 'string' &&
    typeof o.endTime === 'string'
  );
}

function isLegacyRoundWithoutTimes(v: unknown): v is { id: string; roundIndex: number; date: string } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.roundIndex === 'number' &&
    typeof o.date === 'string' &&
    typeof o.startTime !== 'string'
  );
}

export function normalizeCenterTbdClass(input: Partial<CenterTbdClass> & { id: string }): CenterTbdClass {
  const roundTotal = Math.max(1, Math.min(52, Math.floor(input.roundTotal ?? 1) || 1));
  const anchorDate = input.rounds?.[0]?.date ?? todayDateInputValue();
  const defaultStart = toTimeInputValue(
    input.rounds?.[0]?.startTime ?? '10:00'
  );
  const defaultEnd = toTimeInputValue(
    input.rounds?.[0]?.endTime ?? '11:00'
  );

  let rounds = Array.isArray(input.rounds) ? input.rounds : [];
  if (rounds.length === 0 || rounds.length !== roundTotal) {
    rounds = buildRounds(roundTotal, anchorDate, rounds, defaultStart, defaultEnd);
  } else {
    rounds = rounds.map((r) => ({
      id: r.id,
      roundIndex: r.roundIndex,
      date: r.date,
      startTime: toTimeInputValue(r.startTime, defaultStart),
      endTime: toTimeInputValue(r.endTime, defaultEnd),
    }));
  }

  return {
    id: input.id,
    title: String(input.title ?? '').trim() || '제목 없음',
    mainTeacherId: input.mainTeacherId ?? null,
    extraTeacherId: input.extraTeacherId ?? null,
    mainTeacherName: String(input.mainTeacherName ?? '').trim(),
    extraTeacherName: String(input.extraTeacherName ?? '').trim(),
    roundTotal,
    rounds,
  };
}

export function normalizeLegacyLocalClass(v: unknown): CenterTbdClass | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string') return null;

  const classStart = toTimeInputValue(typeof o.startTime === 'string' ? o.startTime : '10:00');
  const classEnd = toTimeInputValue(typeof o.endTime === 'string' ? o.endTime : '11:00');
  const roundTotal = Math.max(1, Math.min(52, Math.floor(Number(o.roundTotal) || 1)));

  let rounds: CenterTbdRound[] = [];
  if (Array.isArray(o.rounds)) {
    for (const item of o.rounds) {
      if (isCenterTbdRound(item)) {
        rounds.push(item);
      } else if (isLegacyRoundWithoutTimes(item)) {
        rounds.push({
          id: item.id,
          roundIndex: item.roundIndex,
          date: item.date,
          startTime: classStart,
          endTime: classEnd,
        });
      }
    }
  }

  return normalizeCenterTbdClass({
    id: o.id,
    title: typeof o.title === 'string' ? o.title : '',
    mainTeacherId: typeof o.mainTeacherId === 'string' ? o.mainTeacherId : null,
    extraTeacherId: typeof o.extraTeacherId === 'string' ? o.extraTeacherId : null,
    mainTeacherName: typeof o.mainTeacherName === 'string' ? o.mainTeacherName : '',
    extraTeacherName: typeof o.extraTeacherName === 'string' ? o.extraTeacherName : '',
    roundTotal,
    rounds,
  });
}

function migrateV1ToClasses(raw: unknown): CenterTbdClass[] {
  if (!Array.isArray(raw)) return [];
  const out: CenterTbdClass[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.startAt !== 'string') continue;
    const start = new Date(o.startAt);
    const end = new Date(typeof o.endAt === 'string' ? o.endAt : o.startAt);
    const startTime = `${padTime(start.getHours())}:${padTime(start.getMinutes())}`;
    const endTime = `${padTime(end.getHours())}:${padTime(end.getMinutes())}`;
    out.push(
      normalizeCenterTbdClass({
        id: o.id,
        title: typeof o.title === 'string' ? o.title : '',
        mainTeacherId: null,
        extraTeacherId: null,
        mainTeacherName: typeof o.teacherName === 'string' ? o.teacherName : '',
        extraTeacherName: '',
        roundTotal: 1,
        rounds: [
          {
            id: crypto.randomUUID(),
            roundIndex: 1,
            date: toDateInputValue(start),
            startTime,
            endTime,
          },
        ],
      })
    );
  }
  return out;
}

export function loadLocalTbdClasses(): CenterTbdClass[] {
  if (typeof window === 'undefined') return [];
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (v2) {
      const parsed = JSON.parse(v2) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeLegacyLocalClass(item))
          .filter(Boolean) as CenterTbdClass[];
      }
    }
    const v1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const migrated = migrateV1ToClasses(JSON.parse(v1) as unknown);
      if (migrated.length > 0) {
        saveLocalTbdClasses(migrated);
      }
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveLocalTbdClasses(classes: CenterTbdClass[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(classes));
  } catch {
    /* quota / private mode */
  }
}

export function clearLocalTbdClasses() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_V2);
    window.localStorage.removeItem(STORAGE_KEY_V1);
  } catch {
    /* ignore */
  }
}

type BuildRoundSeed = Pick<CenterTbdRound, 'roundIndex'> &
  Partial<Pick<CenterTbdRound, 'id' | 'date' | 'startTime' | 'endTime'>>;

export function buildRounds(
  roundTotal: number,
  anchorDate: string,
  lastExisting?: BuildRoundSeed[],
  defaultStart = '10:00',
  defaultEnd = '11:00'
) {
  const total = Math.max(1, Math.min(52, Math.floor(roundTotal) || 1));
  const start = toTimeInputValue(defaultStart);
  const end = toTimeInputValue(defaultEnd);
  const rounds: CenterTbdRound[] = [];
  for (let i = 1; i <= total; i++) {
    const prev = lastExisting?.find((r) => r.roundIndex === i);
    let date = anchorDate;
    if (prev?.date) {
      date = prev.date;
    } else if (i > 1) {
      const prevRound = rounds[i - 2];
      date = addDays(prevRound?.date ?? anchorDate, 7);
    }
    rounds.push({
      id: prev?.id ?? crypto.randomUUID(),
      roundIndex: i,
      date,
      startTime: toTimeInputValue(prev?.startTime, start),
      endTime: toTimeInputValue(prev?.endTime, end),
    });
  }
  return rounds;
}

export function createDefaultCenterTbdClass(anchor?: Date, roundTotal = 4): CenterTbdClass {
  const d = anchor ?? new Date();
  const anchorDate = toDateInputValue(d);
  return normalizeCenterTbdClass({
    id: crypto.randomUUID(),
    title: '',
    mainTeacherId: null,
    extraTeacherId: null,
    mainTeacherName: '',
    extraTeacherName: '',
    roundTotal,
    rounds: buildRounds(roundTotal, anchorDate),
  });
}

/** @deprecated createDefaultCenterTbdClass 사용 */
export const createDefaultLocalTbdClass = createDefaultCenterTbdClass;

export function flattenClassToCalendarItems(cls: CenterTbdClass): LocalTbdCalendarItem[] {
  const normalized = normalizeCenterTbdClass(cls);
  const title = normalized.title.trim() || '제목 없음';
  const total = normalized.roundTotal;
  return normalized.rounds.map((round) => {
    const start = mergeDateAndTime(round.date, round.startTime, new Date());
    const end = mergeDateAndTime(round.date, round.endTime, new Date(start.getTime() + 3600000));
    return {
      classId: normalized.id,
      roundId: round.id,
      title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      mainTeacherName: normalized.mainTeacherName,
      extraTeacherName: normalized.extraTeacherName,
      roundIndex: round.roundIndex,
      roundTotal: total,
    };
  });
}

export function flattenClassesToCalendarItems(classes: CenterTbdClass[]): LocalTbdCalendarItem[] {
  return classes.flatMap(flattenClassToCalendarItems);
}
