export type ScreenplayTagMappingV1 = {
  version: 1;
  modeIdMap: Record<string, { domainLabel: string; taskLabel: string }>;
  levelLabelTemplate?: string; // 기본: "Lv.{n}"
};

// 스포무브(브레인체육) DB에서 사용하는 mode_id 목록
export const SCREENPLAY_MODE_IDS = [
  'FLOW',
  '반응인지',
  '순차기억',
  '스트룹',
  '사이먼효과',
  '플랭커',
  'GoNoGo',
  'TaskSwitching',
  '이중과제',
  'CHALLENGE',
] as const;

export type ScreenplayModeId = (typeof SCREENPLAY_MODE_IDS)[number];

const DEFAULT_MODE_ID_MAP: Record<ScreenplayModeId, { domainLabel: string; taskLabel: string }> = {
  FLOW: { domainLabel: '주의', taskLabel: 'FLOW' },
  '반응인지': { domainLabel: '주의', taskLabel: '반응인지' },
  '순차기억': { domainLabel: '기억', taskLabel: '순차기억' },
  스트룹: { domainLabel: '억제', taskLabel: '스트룹' },
  '사이먼효과': { domainLabel: '주의', taskLabel: '사이먼효과' },
  플랭커: { domainLabel: '주의', taskLabel: '플랭커' },
  GoNoGo: { domainLabel: '억제', taskLabel: 'Go/NoGo' },
  TaskSwitching: { domainLabel: '작업기억', taskLabel: 'Task Switching' },
  '이중과제': { domainLabel: '작업기억', taskLabel: '이중과제' },
  CHALLENGE: { domainLabel: '주의', taskLabel: 'CHALLENGE' },
};

export const DEFAULT_SCREENPLAY_TAG_MAPPING_V1: ScreenplayTagMappingV1 = {
  version: 1,
  levelLabelTemplate: 'Lv.{n}',
  modeIdMap: { ...DEFAULT_MODE_ID_MAP },
};

function safeString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
}

export function resolveScreenplayTagMappingV1(input: unknown): ScreenplayTagMappingV1 {
  if (!input || typeof input !== 'object') return DEFAULT_SCREENPLAY_TAG_MAPPING_V1;
  const candidate = input as any;
  if (candidate.version !== 1) return DEFAULT_SCREENPLAY_TAG_MAPPING_V1;
  if (!candidate.modeIdMap || typeof candidate.modeIdMap !== 'object') return DEFAULT_SCREENPLAY_TAG_MAPPING_V1;

  const merged: Record<string, { domainLabel: string; taskLabel: string }> = {};
  for (const modeId of SCREENPLAY_MODE_IDS) {
    const cur = candidate.modeIdMap[modeId] ?? {};
    const domainLabel = safeString(cur.domainLabel) ?? DEFAULT_MODE_ID_MAP[modeId].domainLabel;
    const taskLabel = safeString(cur.taskLabel) ?? DEFAULT_MODE_ID_MAP[modeId].taskLabel;
    merged[modeId] = { domainLabel, taskLabel };
  }

  return {
    version: 1,
    levelLabelTemplate:
      safeString(candidate.levelLabelTemplate) ?? DEFAULT_SCREENPLAY_TAG_MAPPING_V1.levelLabelTemplate,
    modeIdMap: merged,
  };
}

export function getScreenplayLevelTag(presetRef: string | null | undefined, levelLabelTemplate?: string): string {
  const n = Number(presetRef ?? '1');
  const level = Number.isFinite(n) && n > 0 ? n : 1;
  const tmpl = levelLabelTemplate ?? DEFAULT_SCREENPLAY_TAG_MAPPING_V1.levelLabelTemplate ?? 'Lv.{n}';
  return tmpl.replace('{n}', String(level));
}

