export function distributeEvenly<T>(items: readonly T[], teamCount: number, random: () => number = Math.random): T[][] {
  const normalizedTeamCount = Math.max(2, Math.min(4, Math.trunc(teamCount)));
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
  }
  const teams = Array.from({ length: normalizedTeamCount }, () => [] as T[]);
  shuffled.forEach((item, index) => teams[index % normalizedTeamCount]!.push(item));
  return teams;
}

type ToolAttendanceEntry = {
  studentId: string;
  status: 'present' | 'absent';
};

/**
 * Standalone tools use the selected Class roster. Session-linked tools use only
 * students whose attendance was explicitly saved as present for that Session.
 */
export function resolveClassToolParticipants<T extends { id: string }>(
  classRoster: readonly T[],
  sessionAttendance?: readonly ToolAttendanceEntry[],
): T[] {
  if (!sessionAttendance) return [...classRoster];
  const presentStudentIds = new Set(
    sessionAttendance
      .filter((entry) => entry.status === 'present')
      .map((entry) => entry.studentId),
  );
  return classRoster.filter((student) => presentStudentIds.has(student.id));
}

export function traceLadderDestination(
  start: number,
  levelCount: number,
  rungs: readonly { level: number; left: number }[],
) {
  const rungKeys = new Set(rungs.map((rung) => `${rung.level}:${rung.left}`));
  let column = start;
  for (let level = 0; level < levelCount; level += 1) {
    if (rungKeys.has(`${level}:${column}`)) column += 1;
    else if (rungKeys.has(`${level}:${column - 1}`)) column -= 1;
  }
  return column;
}

export type CountdownTimerMode = 'activity' | 'rest';

export const COUNTDOWN_TIMER_MODE_CONFIG = {
  activity: {
    label: '활동',
    expiredLabel: '활동 시간이 끝났습니다.',
    options: [30, 60, 120, 180, 300],
    supportsCount: true,
  },
  rest: {
    label: '휴식',
    expiredLabel: '휴식 시간이 끝났습니다.',
    options: [30, 60, 120, 180],
    supportsCount: false,
  },
} as const satisfies Record<CountdownTimerMode, {
  label: string;
  expiredLabel: string;
  options: readonly number[];
  supportsCount: boolean;
}>;

export function formatCountdownOption(seconds: number) {
  if (seconds < 60) return `${seconds}초`;
  return `${seconds / 60}분`;
}
