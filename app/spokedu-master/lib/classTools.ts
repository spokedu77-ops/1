export const CLASS_TOOL_IDS = [
  'stopwatch',
  'timer',
  'scoreboard',
  'picker',
  'teams',
  'order',
  'tournament',
  'ladder',
] as const;

export type ClassToolId = (typeof CLASS_TOOL_IDS)[number];

export type ClassToolDefinition = {
  id: ClassToolId;
  label: string;
  shortLabel: string;
  group: string;
  description: string;
};

export const CLASS_TOOLS: readonly ClassToolDefinition[] = [
  { id: 'stopwatch', label: '스탑워치', shortLabel: '스톱워치', group: '시간', description: '활동 시간을 빠르게 측정합니다.' },
  { id: 'timer', label: '타이머', shortLabel: '타이머', group: '시간', description: '활동과 휴식 시간을 맞춰 진행합니다.' },
  { id: 'scoreboard', label: '점수판', shortLabel: '점수', group: '진행', description: '팀 점수를 한눈에 기록합니다.' },
  { id: 'picker', label: '무작위 선택', shortLabel: '뽑기', group: '명단', description: '명단에서 참여자를 무작위로 선택합니다.' },
  { id: 'teams', label: '팀 나누기', shortLabel: '팀', group: '명단', description: '명단을 빠르게 팀으로 배정합니다.' },
  { id: 'order', label: '진행 순서', shortLabel: '순서', group: '명단', description: '참여 순서를 무작위로 정합니다.' },
  { id: 'tournament', label: '토너먼트', shortLabel: '대진', group: '경쟁', description: '대진표로 토너먼트를 진행합니다.' },
  { id: 'ladder', label: '사다리타기', shortLabel: '사다리', group: '경쟁', description: '사다리타기로 결과를 연결합니다.' },
];

export function parseClassToolId(value: string | null | undefined): ClassToolId | null {
  return CLASS_TOOL_IDS.find((id) => id === value) ?? null;
}

export function getClassToolDefinition(id: ClassToolId): ClassToolDefinition {
  return CLASS_TOOLS.find((tool) => tool.id === id) ?? CLASS_TOOLS[0]!;
}

export function buildClassToolHref(id: ClassToolId) {
  return id === 'stopwatch'
    ? '/spokedu-master/class-tools'
    : `/spokedu-master/class-tools?tool=${encodeURIComponent(id)}`;
}
