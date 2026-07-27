import { LESSON_TAG_PREFIX, parseTaggedValues } from '../lib/lessonDisplay';
import { hasExplicitSpomoveLink } from '../lib/program-meta';
import {
  getMasterParticipantFormat,
  parseMasterSpaces,
  parseMasterTargets,
} from '../lib/programDisplayTags';
import type { Program } from '../types';

/**
 * 카드용 선택 이유 — 통제 어휘.
 * 장식이 아니라 교사가 믿고 고르는 계약. 자동 매핑 근거가 있을 때만 노출한다.
 * P0: 근거 없는 칩 금지 원칙. P1.5: 어휘/매핑 표준.
 * P3: 구 ID·문자열 태그 단독 금지. SPOMOVE는 공식 preset 교차 또는 명시 플래그만.
 */

/** 근거 품질 — P1.5 표준. UI 칩 종류를 늘리지 않는다. */
export type SelectionReasonEvidenceLevel =
  | 'structured'
  | 'structured_with_text_fallback'
  | 'text_only'
  | 'legacy_mixed';

export const LIBRARY_SELECTION_REASON_IDS = [
  'narrow_space',
  'ready_now',
  'low_equipment',
  'team',
  'solo',
  'reaction',
  'balance',
  'agility',
  'spomove',
] as const;

export type LibrarySelectionReasonId = (typeof LIBRARY_SELECTION_REASON_IDS)[number];

export type SelectionReasonStandard = {
  id: LibrarySelectionReasonId;
  label: string;
  evidenceLevel: SelectionReasonEvidenceLevel;
  /** 자동 칩 노출 허용(원칙). false면 editorial 전용 예약 */
  autoAllowed: boolean;
  /** P3에서 매칭을 더 엄격히 할 항목 */
  pendingP3Tighten: boolean;
  /** 사람이 읽는 근거 설명 — 계약 문서 */
  requiredEvidence: string;
};

export type LibrarySelectionReason = {
  id: LibrarySelectionReasonId;
  label: string;
  /** auto: 데이터로 판정 / editorial: 편집 지정 전용(현재 스프린트는 auto만 사용) */
  source: 'auto' | 'editorial';
};

export const LIBRARY_SELECTION_REASONS: Record<LibrarySelectionReasonId, LibrarySelectionReason> = {
  narrow_space: { id: 'narrow_space', label: '좁은 공간', source: 'auto' },
  ready_now: { id: 'ready_now', label: '바로 진행', source: 'auto' },
  low_equipment: { id: 'low_equipment', label: '교구 적음', source: 'auto' },
  team: { id: 'team', label: '팀전', source: 'auto' },
  solo: { id: 'solo', label: '개인전', source: 'auto' },
  reaction: { id: 'reaction', label: '반응 훈련', source: 'auto' },
  balance: { id: 'balance', label: '균형', source: 'auto' },
  agility: { id: 'agility', label: '민첩성', source: 'auto' },
  spomove: { id: 'spomove', label: 'SPOMOVE 연계', source: 'auto' },
};

/**
 * P1.5 어휘·매핑 표준 (강제 적용은 P3).
 * - structured: 구조화 필드만으로 충분
 * - structured_with_text_fallback: 구조화 우선, 텍스트는 임시
 * - text_only: 텍스트 blob — 근거 약함, 남용 주의
 * - legacy_mixed: 플래그·구 ID·태그 혼재 — P3에서 official preset 교차로 정리
 */
export const LIBRARY_SELECTION_REASON_STANDARD: Record<
  LibrarySelectionReasonId,
  SelectionReasonStandard
> = {
  narrow_space: {
    id: 'narrow_space',
    label: '좁은 공간',
    evidenceLevel: 'structured',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence: 'parseMasterSpaces(program.space)에 교실 포함',
  },
  low_equipment: {
    id: 'low_equipment',
    label: '교구 적음',
    evidenceLevel: 'structured_with_text_fallback',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence: 'equipment 비어 있음·준비물 없음·최소화 신호',
  },
  ready_now: {
    id: 'ready_now',
    label: '바로 진행',
    evidenceLevel: 'text_only',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence: '설명·태그에 즉시 운영 신호(바로 진행·준비 없이 등). 제목 단독 금지',
  },
  team: {
    id: 'team',
    label: '팀전',
    evidenceLevel: 'structured',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence: '인원:팀전 구조화 태그',
  },
  solo: {
    id: 'solo',
    label: '개인전',
    evidenceLevel: 'structured',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence: '인원:개인전 구조화 태그',
  },
  reaction: {
    id: 'reaction',
    label: '반응 훈련',
    evidenceLevel: 'structured_with_text_fallback',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence: '신체기능 태그 반응 우선, 없으면 태그 어휘만(제목·설명 blob 금지)',
  },
  balance: {
    id: 'balance',
    label: '균형',
    evidenceLevel: 'structured_with_text_fallback',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence: '신체기능 태그 평형/균형 우선',
  },
  agility: {
    id: 'agility',
    label: '민첩성',
    evidenceLevel: 'structured_with_text_fallback',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence: '신체기능 태그 민첩 우선',
  },
  spomove: {
    id: 'spomove',
    label: 'SPOMOVE 연계',
    evidenceLevel: 'structured',
    autoAllowed: true,
    pendingP3Tighten: false,
    requiredEvidence:
      'hasSpomoveConnection 또는 relatedSpomoveIds∩공식 preset. 문자열 태그·구 엔진 ID 단독 금지',
  },
};

/** 카드에 노출할 최대 개수 · 우선순위(앞일수록 우선) */
export const LIBRARY_SELECTION_REASON_PRIORITY: LibrarySelectionReasonId[] = [
  'narrow_space',
  'low_equipment',
  'ready_now',
  'spomove',
  'reaction',
  'team',
  'solo',
  'agility',
  'balance',
];

export const LIBRARY_SELECTION_REASON_MAX = 3;

function textBlob(program: Program) {
  return [
    program.title,
    program.category,
    program.space,
    program.description,
    ...(program.tags ?? []),
    ...(program.equipment ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

function isNoOrLowEquipment(program: Program): boolean {
  const items = (program.equipment ?? []).map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) return true;
  if (items.every((item) => /준비물\s*없음|교구\s*없음|없음|no\s*equipment/i.test(item))) return true;
  if (items.length === 1 && /선택|없어도|없어도\s*됨|없어도\s*가능/i.test(items[0]!)) return true;
  const blob = items.join(' ');
  return /준비물\s*적|교구\s*적|최소화/.test(blob) || (program.tags ?? []).some((tag) => /준비물\s*적|교구\s*적/.test(tag));
}

function matchesNarrowSpace(program: Program): boolean {
  return parseMasterSpaces(program.space).includes('교실');
}

function matchesSpomove(program: Program): boolean {
  if (program.hasSpomoveConnection) return true;
  return hasExplicitSpomoveLink(program);
}

function readyNowEvidenceBlob(program: Program): string {
  return [program.description, ...(program.tags ?? [])].join(' ').toLowerCase();
}

function matchesReaction(program: Program): boolean {
  const functions = parseTaggedValues(program.tags, LESSON_TAG_PREFIX.bodyFunction);
  if (functions.some((value) => /반응/.test(value))) return true;
  return (program.tags ?? []).some((tag) => /반응/.test(tag));
}

function matchesAgility(program: Program): boolean {
  const functions = parseTaggedValues(program.tags, LESSON_TAG_PREFIX.bodyFunction);
  if (functions.some((value) => /민첩/.test(value))) return true;
  return /민첩/.test(textBlob(program));
}

function matchesBalance(program: Program): boolean {
  const functions = parseTaggedValues(program.tags, LESSON_TAG_PREFIX.bodyFunction);
  if (functions.some((value) => /평형|균형/.test(value))) return true;
  return /균형|평형/.test(textBlob(program));
}

export function programMatchesSelectionReason(
  program: Program,
  reasonId: LibrarySelectionReasonId,
): boolean {
  switch (reasonId) {
    case 'narrow_space':
      return matchesNarrowSpace(program);
    case 'low_equipment':
      return isNoOrLowEquipment(program);
    case 'ready_now':
      // 교구 적음과 겹치지 않게 — 설명·태그에 즉시 운영 신호가 있을 때만(제목 단독 금지)
      return /바로\s*(진행|시작|운영|활용)|준비\s*없이|곧바로|전환에\s*바로/.test(readyNowEvidenceBlob(program));
    case 'team':
      return getMasterParticipantFormat(program.tags) === '팀전';
    case 'solo':
      return getMasterParticipantFormat(program.tags) === '개인전';
    case 'reaction':
      return matchesReaction(program);
    case 'balance':
      return matchesBalance(program);
    case 'agility':
      return matchesAgility(program);
    case 'spomove':
      return matchesSpomove(program);
    default:
      return false;
  }
}

export function getProgramSelectionReasons(program: Program): LibrarySelectionReason[] {
  const matched = LIBRARY_SELECTION_REASON_PRIORITY.filter((id) =>
    programMatchesSelectionReason(program, id),
  ).slice(0, LIBRARY_SELECTION_REASON_MAX);
  return matched.map((id) => LIBRARY_SELECTION_REASONS[id]);
}

export function formatProgramSelectionReasons(program: Program): string {
  return getProgramSelectionReasons(program)
    .map((reason) => reason.label)
    .join(' · ');
}

/** 미취학만 해당할 때 초저학년 신호로 쓰고 싶으면 호출 — 카드 어휘에는 아직 미포함 */
export function programIsPreschoolFocused(program: Program): boolean {
  const targets = parseMasterTargets(program.lessonDetail?.recommendedAge || program.grade);
  return targets.includes('미취학') && !targets.includes('초등학생 이상');
}
