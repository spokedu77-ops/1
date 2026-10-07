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

export const FREE_CLASS_TOOL_IDS = ['stopwatch', 'timer', 'scoreboard'] as const satisfies readonly ClassToolId[];
export const ROSTER_CLASS_TOOL_IDS = ['picker', 'teams', 'order', 'tournament', 'ladder'] as const satisfies readonly ClassToolId[];

export function isFreeClassToolId(id: ClassToolId): boolean {
  return FREE_CLASS_TOOL_IDS.includes(id as (typeof FREE_CLASS_TOOL_IDS)[number]);
}

export function isRosterClassToolId(id: ClassToolId): boolean {
  return ROSTER_CLASS_TOOL_IDS.includes(id as (typeof ROSTER_CLASS_TOOL_IDS)[number]);
}

export function canUseClassTool(id: ClassToolId, canUseRosterTools: boolean): boolean {
  return isFreeClassToolId(id) || canUseRosterTools;
}

export type ClassToolDefinition = {
  id: ClassToolId;
  label: string;
  shortLabel: string;
  group: string;
  compactDescription: string;
  description: string;
};

export const CLASS_TOOLS: readonly ClassToolDefinition[] = [
  { id: 'stopwatch', label: '스탑워치', shortLabel: '스톱워치', group: '시간', compactDescription: '시간 측정', description: '활동 시간을 빠르게 측정합니다.' },
  { id: 'timer', label: '타이머', shortLabel: '타이머', group: '시간', compactDescription: '시간 설정', description: '활동과 휴식 시간을 맞춰 진행합니다.' },
  { id: 'scoreboard', label: '점수판', shortLabel: '점수', group: '진행', compactDescription: '점수 기록', description: '팀 점수를 한눈에 기록합니다.' },
  { id: 'picker', label: '무작위 선택', shortLabel: '뽑기', group: '명단', compactDescription: '참여자 뽑기', description: '명단에서 참여자를 무작위로 선택합니다.' },
  { id: 'teams', label: '팀 나누기', shortLabel: '팀', group: '명단', compactDescription: '팀 배정', description: '명단을 빠르게 팀으로 배정합니다.' },
  { id: 'order', label: '진행 순서', shortLabel: '순서', group: '명단', compactDescription: '순서 정하기', description: '참여 순서를 무작위로 정합니다.' },
  { id: 'tournament', label: '토너먼트', shortLabel: '대진', group: '경쟁', compactDescription: '대진표 진행', description: '대진표로 토너먼트를 진행합니다.' },
  { id: 'ladder', label: '사다리타기', shortLabel: '사다리', group: '경쟁', compactDescription: '결과 연결', description: '사다리타기로 결과를 연결합니다.' },
];

export function parseClassToolId(value: string | null | undefined): ClassToolId | null {
  return CLASS_TOOL_IDS.find((id) => id === value) ?? null;
}

export function getClassToolDefinition(id: ClassToolId): ClassToolDefinition {
  return CLASS_TOOLS.find((tool) => tool.id === id) ?? CLASS_TOOLS[0]!;
}

export function buildClassToolHref(id: ClassToolId) {
  return id === 'stopwatch'
    ? '/spokedu-lab/class-tools'
    : `/spokedu-lab/class-tools?tool=${encodeURIComponent(id)}`;
}
