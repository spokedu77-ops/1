import type { LibraryFilterGroupKey } from './libraryViewModel';
import { parseMasterSpaces, parseMasterTargets } from '../lib/programDisplayTags';
import type { Program } from '../types';
import {
  programMatchesSelectionReason,
  type LibrarySelectionReasonId,
} from './librarySelectionReasons';

export type LibraryShelfKind = 'editorial' | 'rule';

export type LibraryShelfId =
  | 'this_week'
  | 'narrow_space'
  | 'preschool'
  | 'low_equipment'
  | 'spomove';

export type LibraryShelfDefinition = {
  id: LibraryShelfId;
  kind: LibraryShelfKind;
  /** 교사가 실제로 찾는 말 — 마케팅 카피 지양 */
  title: string;
  subtitle: string;
  match: (program: Program) => boolean;
};

export type LibrarySituationEntry = {
  id: string;
  label: string;
  groupLabel: string;
  /** 라이브러리 필터로만 연결 — 선반/reason 우회 금지 */
  filter: { group: LibraryFilterGroupKey; value: string };
};

export const LIBRARY_SHELF_SIZE = 4;

export const LIBRARY_SHELVES: LibraryShelfDefinition[] = [
  {
    id: 'this_week',
    kind: 'editorial',
    title: '이번 주 바로 쓰기',
    subtitle: '편집된 우선 수업',
    match: (program) => {
      const order = program.homeSortOrder ?? 9999;
      return program.isHot === true || (order >= 1 && order <= 4);
    },
  },
  {
    id: 'narrow_space',
    kind: 'rule',
    title: '좁은 공간',
    subtitle: '교실·복도에서도 가능',
    match: (program) => programMatchesSelectionReason(program, 'narrow_space'),
  },
  {
    id: 'preschool',
    kind: 'rule',
    title: '미취학',
    subtitle: '미취학 대상 수업',
    match: (program) =>
      parseMasterTargets(program.lessonDetail?.recommendedAge || program.grade).includes('미취학'),
  },
  {
    id: 'low_equipment',
    kind: 'rule',
    title: '교구 적게',
    subtitle: '준비물 부담이 적은 수업',
    match: (program) => programMatchesSelectionReason(program, 'low_equipment'),
  },
  {
    id: 'spomove',
    kind: 'rule',
    title: 'SPOMOVE 연계',
    subtitle: '화면 활동과 함께',
    match: (program) => programMatchesSelectionReason(program, 'spomove'),
  },
];

/**
 * 상황별 빠른 진입 — 신규 선반이 아니라 필터 출발점.
 * 홈 복제 금지. 아래 6개만 유지.
 */
export const LIBRARY_SITUATION_ENTRIES: LibrarySituationEntry[] = [
  { id: 'space-classroom', groupLabel: '공간', label: '교실에서 진행', filter: { group: 'space', value: '교실' } },
  { id: 'target-preschool', groupLabel: '대상', label: '미취학 추천', filter: { group: 'target', value: '미취학' } },
  { id: 'participant-team', groupLabel: '참여', label: '팀 활동', filter: { group: 'participant', value: '팀전' } },
  { id: 'participant-pair', groupLabel: '참여', label: '2인 1조', filter: { group: 'participant', value: '2인 1조' } },
  { id: 'theme-coop', groupLabel: '테마', label: '협동 중심', filter: { group: 'theme', value: '협동형' } },
  { id: 'theme-compete', groupLabel: '테마', label: '경쟁 중심', filter: { group: 'theme', value: '경쟁형' } },
];

export function parseLibraryShelfId(value: string | null | undefined): LibraryShelfId | null {
  if (!value) return null;
  return LIBRARY_SHELVES.some((shelf) => shelf.id === value) ? (value as LibraryShelfId) : null;
}

export function getLibraryShelfDefinition(shelfId: LibraryShelfId): LibraryShelfDefinition {
  return LIBRARY_SHELVES.find((shelf) => shelf.id === shelfId)!;
}

export function selectShelfPrograms(programs: Program[], shelf: LibraryShelfDefinition, limit = LIBRARY_SHELF_SIZE) {
  const matched = programs.filter(shelf.match);
  if (shelf.id === 'this_week') {
    return [...matched]
      .sort((a, b) => (a.homeSortOrder ?? 9999) - (b.homeSortOrder ?? 9999) || a.title.localeCompare(b.title, 'ko'))
      .slice(0, limit);
  }
  return matched.slice(0, limit);
}

export function buildLibraryShelves(programs: Program[], limit = LIBRARY_SHELF_SIZE) {
  return LIBRARY_SHELVES.flatMap((shelf) => {
    const items = selectShelfPrograms(programs, shelf, limit);
    const minCount = shelf.kind === 'editorial' ? 1 : 2;
    return items.length >= minCount ? [{ shelf, programs: items, total: programs.filter(shelf.match).length }] : [];
  });
}

export function filterProgramsByShelf(programs: Program[], shelfId: LibraryShelfId) {
  const shelf = getLibraryShelfDefinition(shelfId);
  return programs.filter(shelf.match);
}

export function filterProgramsByReason(programs: Program[], reasonId: LibrarySelectionReasonId) {
  return programs.filter((program) => programMatchesSelectionReason(program, reasonId));
}

export function countProgramsBySpace(programs: Program[], space: string) {
  return programs.filter((program) => parseMasterSpaces(program.space).includes(space)).length;
}
