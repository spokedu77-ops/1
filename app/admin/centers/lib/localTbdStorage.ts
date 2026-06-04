export type LocalTbdRound = {
  id: string;
  roundIndex: number;
  date: string;
};

export type LocalTbdClass = {
  id: string;
  title: string;
  mainTeacherName: string;
  extraTeacherName: string;
  roundTotal: number;
  startTime: string;
  endTime: string;
  rounds: LocalTbdRound[];
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

export function teacherUndecided(name: string) {
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

function isLocalTbdRound(v: unknown): v is LocalTbdRound {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.roundIndex === 'number' &&
    typeof o.date === 'string'
  );
}

function isLocalTbdClass(v: unknown): v is LocalTbdClass {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.mainTeacherName === 'string' &&
    typeof o.extraTeacherName === 'string' &&
    typeof o.roundTotal === 'number' &&
    typeof o.startTime === 'string' &&
    typeof o.endTime === 'string' &&
    Array.isArray(o.rounds) &&
    o.rounds.every(isLocalTbdRound)
  );
}

function migrateV1ToClasses(raw: unknown): LocalTbdClass[] {
  if (!Array.isArray(raw)) return [];
  const out: LocalTbdClass[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.startAt !== 'string') continue;
    const start = new Date(o.startAt);
    const end = new Date(typeof o.endAt === 'string' ? o.endAt : o.startAt);
    out.push({
      id: o.id,
      title: typeof o.title === 'string' ? o.title : '',
      mainTeacherName: typeof o.teacherName === 'string' ? o.teacherName : '',
      extraTeacherName: '',
      roundTotal: 1,
      startTime: `${padTime(start.getHours())}:${padTime(start.getMinutes())}`,
      endTime: `${padTime(end.getHours())}:${padTime(end.getMinutes())}`,
      rounds: [
        {
          id: crypto.randomUUID(),
          roundIndex: 1,
          date: toDateInputValue(start),
        },
      ],
    });
  }
  return out;
}

export function loadLocalTbdClasses(): LocalTbdClass[] {
  if (typeof window === 'undefined') return [];
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (v2) {
      const parsed = JSON.parse(v2) as unknown;
      if (Array.isArray(parsed)) return parsed.filter(isLocalTbdClass);
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

export function saveLocalTbdClasses(classes: LocalTbdClass[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(classes));
  } catch {
    /* quota / private mode */
  }
}

export function buildRounds(roundTotal: number, anchorDate: string, lastExisting?: LocalTbdRound[]) {
  const total = Math.max(1, Math.min(52, Math.floor(roundTotal) || 1));
  const rounds: LocalTbdRound[] = [];
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
    });
  }
  return rounds;
}

export function createDefaultLocalTbdClass(anchor?: Date, roundTotal = 4): LocalTbdClass {
  const d = anchor ?? new Date();
  const anchorDate = toDateInputValue(d);
  return {
    id: crypto.randomUUID(),
    title: '',
    mainTeacherName: '',
    extraTeacherName: '',
    roundTotal,
    startTime: '10:00',
    endTime: '11:00',
    rounds: buildRounds(roundTotal, anchorDate),
  };
}

export function flattenClassToCalendarItems(cls: LocalTbdClass): LocalTbdCalendarItem[] {
  const title = cls.title.trim() || '제목 없음';
  const total = cls.roundTotal;
  return cls.rounds.map((round) => {
    const start = mergeDateAndTime(round.date, cls.startTime, new Date());
    const end = mergeDateAndTime(round.date, cls.endTime, new Date(start.getTime() + 3600000));
    return {
      classId: cls.id,
      roundId: round.id,
      title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      mainTeacherName: cls.mainTeacherName,
      extraTeacherName: cls.extraTeacherName,
      roundIndex: round.roundIndex,
      roundTotal: total,
    };
  });
}

export function flattenClassesToCalendarItems(classes: LocalTbdClass[]): LocalTbdCalendarItem[] {
  return classes.flatMap(flattenClassToCalendarItems);
}
