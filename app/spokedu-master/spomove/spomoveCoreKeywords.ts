/**
 * SPOMOVE 가이드 모달 「핵심 키워드」 3축 고정 태그.
 * 자유 문자열 금지 — 시작 위치 · 참여 인원 · 난이도만.
 */
import type { SpomoveThinkingLevel } from './officialSpomovePresetGuides';
import type { ParticipantScale, StartZone } from './operations/operationTypes';
import type { MovementStartPosition } from './movements/movementTypes';

export const SPOMOVE_CORE_START_POSITIONS = ['매트 위', '매트 밖'] as const;
export const SPOMOVE_CORE_PARTICIPATIONS = ['개인', '그룹'] as const;
export const SPOMOVE_CORE_DIFFICULTIES = ['쉬움', '보통', '어려움'] as const;

export type SpomoveCoreStartPosition = (typeof SPOMOVE_CORE_START_POSITIONS)[number];
export type SpomoveCoreParticipation = (typeof SPOMOVE_CORE_PARTICIPATIONS)[number];
export type SpomoveCoreDifficulty = (typeof SPOMOVE_CORE_DIFFICULTIES)[number];

export type SpomoveCoreKeywords = {
  startPosition: SpomoveCoreStartPosition;
  participation: SpomoveCoreParticipation;
  difficulty: SpomoveCoreDifficulty;
};

export type SpomoveCoreKeywordTag = {
  key: 'startPosition' | 'participation' | 'difficulty';
  label: string;
  value: string;
};

export const SPOMOVE_CORE_KEYWORD_AXIS = [
  { key: 'startPosition', label: '시작 위치', values: SPOMOVE_CORE_START_POSITIONS },
  { key: 'participation', label: '참여 인원', values: SPOMOVE_CORE_PARTICIPATIONS },
  { key: 'difficulty', label: '난이도', values: SPOMOVE_CORE_DIFFICULTIES },
] as const;

const START_ALIASES: Record<string, SpomoveCoreStartPosition> = {
  '매트 위': '매트 위',
  '매트위': '매트 위',
  onmat: '매트 위',
  '매트 밖': '매트 밖',
  '매트밖': '매트 밖',
  '매트 바로 밖': '매트 밖',
  '외부 스팟': '매트 밖',
  behindmat: '매트 밖',
  adjacenttomat: '매트 밖',
  externalspot: '매트 밖',
};

const PARTICIPATION_ALIASES: Record<string, SpomoveCoreParticipation> = {
  개인: '개인',
  개인전: '개인',
  individual: '개인',
  그룹: '그룹',
  팀: '그룹',
  팀전: '그룹',
  짝: '그룹',
  소집단: '그룹',
  pair: '그룹',
  smallgroup: '그룹',
  team: '그룹',
};

const DIFFICULTY_ALIASES: Record<string, SpomoveCoreDifficulty> = {
  쉬움: '쉬움',
  easy: '쉬움',
  보통: '보통',
  normal: '보통',
  어려움: '어려움',
  hard: '어려움',
};

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function lookupAlias<T extends string>(value: string, aliases: Record<string, T>): T | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (aliases[trimmed]) return aliases[trimmed]!;
  const key = normalizeToken(trimmed);
  return aliases[key] ?? null;
}

export function mapStartZoneToCoreKeyword(zone: StartZone | null | undefined): SpomoveCoreStartPosition {
  if (!zone || zone === 'onMat') return '매트 위';
  return '매트 밖';
}

export function mapMovementStartToCoreKeyword(
  position: MovementStartPosition | null | undefined,
): SpomoveCoreStartPosition {
  return position === 'behindMat' ? '매트 밖' : '매트 위';
}

export function mapParticipantScaleToCoreKeyword(
  scale: ParticipantScale | null | undefined,
): SpomoveCoreParticipation {
  return !scale || scale === 'individual' ? '개인' : '그룹';
}

export function mapThinkingLevelToCoreKeyword(
  level: SpomoveThinkingLevel | null | undefined,
): SpomoveCoreDifficulty {
  if (level === 'easy') return SPOMOVE_CORE_DIFFICULTIES[0];
  if (level === 'hard') return SPOMOVE_CORE_DIFFICULTIES[2];
  return SPOMOVE_CORE_DIFFICULTIES[1];
}

/**
 * 저장/오버라이드 문자열 배열 → 축별 값.
 * 순서 고정(시작·인원·난이도)을 우선하고, 순서가 흐트러져도 별칭 매칭으로 보정.
 */
export function parseSpomoveCoreKeywordsOverride(
  values: string[] | null | undefined,
): Partial<SpomoveCoreKeywords> {
  const list = (values ?? []).map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return {};

  const byOrder: Partial<SpomoveCoreKeywords> = {};
  const startByOrder = lookupAlias(list[0] ?? '', START_ALIASES);
  const participationByOrder = lookupAlias(list[1] ?? '', PARTICIPATION_ALIASES);
  const difficultyByOrder = lookupAlias(list[2] ?? '', DIFFICULTY_ALIASES);
  if (startByOrder) byOrder.startPosition = startByOrder;
  if (participationByOrder) byOrder.participation = participationByOrder;
  if (difficultyByOrder) byOrder.difficulty = difficultyByOrder;

  const byScan: Partial<SpomoveCoreKeywords> = {};
  for (const item of list) {
    const start = lookupAlias(item, START_ALIASES);
    if (start && !byScan.startPosition) byScan.startPosition = start;
    const participation = lookupAlias(item, PARTICIPATION_ALIASES);
    if (participation && !byScan.participation) byScan.participation = participation;
    const difficulty = lookupAlias(item, DIFFICULTY_ALIASES);
    if (difficulty && !byScan.difficulty) byScan.difficulty = difficulty;
  }

  return {
    startPosition: byOrder.startPosition ?? byScan.startPosition,
    participation: byOrder.participation ?? byScan.participation,
    difficulty: byOrder.difficulty ?? byScan.difficulty,
  };
}

export function serializeSpomoveCoreKeywords(keywords: SpomoveCoreKeywords): string[] {
  return [keywords.startPosition, keywords.participation, keywords.difficulty];
}

/** 저장용 — 허용 어휘만 남기고 최대 3개(축 순서). */
export function normalizeSpomoveCoreKeywordsList(values: unknown): string[] {
  const raw = Array.isArray(values)
    ? values.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : typeof values === 'string'
      ? values
          .split(/\r?\n|,/u)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  const parsed = parseSpomoveCoreKeywordsOverride(raw);
  const next: string[] = [];
  if (parsed.startPosition) next.push(parsed.startPosition);
  if (parsed.participation) next.push(parsed.participation);
  if (parsed.difficulty) next.push(parsed.difficulty);
  return next.slice(0, 3);
}

export function resolveSpomoveCoreKeywords(args: {
  override?: string[] | null;
  startZone?: StartZone | null;
  participantScale?: ParticipantScale | null;
  thinkingLevel?: SpomoveThinkingLevel | null;
  /** 추천 움직임 시작 위치 — operation이 onMat 기본값이어도 매트 밖이면 이쪽 우선 */
  movementStartPosition?: MovementStartPosition | null;
}): SpomoveCoreKeywords {
  const override = parseSpomoveCoreKeywordsOverride(args.override);

  const fromMovement = args.movementStartPosition
    ? mapMovementStartToCoreKeyword(args.movementStartPosition)
    : null;
  const fromZone = args.startZone ? mapStartZoneToCoreKeyword(args.startZone) : null;
  // 움직임이 매트 밖이면 표시도 매트 밖 (operation 기본 onMat 오표기 방지)
  const derivedStart =
    fromMovement === '매트 밖' || fromZone === '매트 밖'
      ? '매트 밖'
      : fromMovement ?? fromZone ?? '매트 위';

  return {
    startPosition: override.startPosition ?? derivedStart,
    participation: override.participation ?? mapParticipantScaleToCoreKeyword(args.participantScale),
    difficulty: override.difficulty ?? mapThinkingLevelToCoreKeyword(args.thinkingLevel),
  };
}

export function buildSpomoveCoreKeywordTags(keywords: SpomoveCoreKeywords): SpomoveCoreKeywordTag[] {
  return [
    { key: 'startPosition', label: '시작 위치', value: keywords.startPosition },
    { key: 'participation', label: '참여 인원', value: keywords.participation },
    { key: 'difficulty', label: '난이도', value: keywords.difficulty },
  ];
}
