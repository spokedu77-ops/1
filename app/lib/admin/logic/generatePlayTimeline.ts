/**
 * Play 타임라인 생성
 * 선택된 5개 ActionKey로 125초 Play 블록 시퀀스 생성
 * 규칙: intro 5s → (explain 2.5s + set1 10s + set2 10s) × 5 → outro 7.5s = 125s
 */

import type { ActionKey } from '@/app/lib/admin/constants/physics';

export interface PlayBlock {
  type: 'intro' | 'explain' | 'set' | 'outro';
  action?: ActionKey;
  setIndex?: 1 | 2;
  duration: number;
}

const INTRO_DURATION = 5;
const EXPLAIN_DURATION = 2.5;
const SET_DURATION = 10;
const OUTRO_DURATION = 7.5;
const BLOCKS_COUNT = 5;

/**
 * 선택된 5개 동작으로 125초 Play 타임라인 생성
 * @param selected - 정확히 5개의 ActionKey (순서대로 블록에 매핑)
 * @returns PlayBlock[] (intro → explain/set×5 → outro)
 */
export function generatePlayTimeline(selected: ActionKey[]): PlayBlock[] {
  if (selected.length !== BLOCKS_COUNT) {
    throw new Error(
      `정확히 ${BLOCKS_COUNT}개의 동작을 선택해야 합니다. (현재: ${selected.length}개)`
    );
  }

  const blocks: PlayBlock[] = [];

  blocks.push({ type: 'intro', duration: INTRO_DURATION });

  for (const action of selected) {
    blocks.push({ type: 'explain', action, duration: EXPLAIN_DURATION });
    blocks.push({ type: 'set', action, setIndex: 1, duration: SET_DURATION });
    blocks.push({ type: 'set', action, setIndex: 2, duration: SET_DURATION });
  }

  blocks.push({ type: 'outro', duration: OUTRO_DURATION });

  return blocks;
}
