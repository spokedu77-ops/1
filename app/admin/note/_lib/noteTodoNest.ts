import { getBlocksInParent } from '@/app/lib/note/noteBlockTree';
import type { NoteBlock } from './types';
import { readTodoListNestLevel, MAX_TODO_LIST_NEST_LEVEL } from './noteTodoContent';

/** Tab in 시 listNestLevel만 올리고 parent_block_id는 유지 (Notion 체크리스트) */
const TODO_NEST_TAB_PREV_TYPES = new Set<NoteBlock['type']>(['todo', 'text']);

/** 이전 형제가 컨테이너면 블록 트리 reparent(planBlockTabIndent) 사용 */
const TAB_CONTAINER_PREV_TYPES = new Set<NoteBlock['type']>([
  'toggle',
  'page',
  'column',
  'columnList',
  'bulletList',
  'numberedList',
]);

export function planTodoListNestTab(
  blocks: NoteBlock[],
  blockId: string,
  direction: 'in' | 'out',
): { listNestLevel: number } | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const moving = byId.get(blockId);
  if (!moving || moving.type !== 'todo') return null;

  const level = readTodoListNestLevel(moving.content);

  if (direction === 'out') {
    if (level <= 0) return null;
    return { listNestLevel: level - 1 };
  }

  const parentId = moving.parent_block_id ?? null;
  const siblings = getBlocksInParent(blocks, parentId);
  const idx = siblings.findIndex((block) => block.id === blockId);
  if (idx <= 0) return null;

  const prev = siblings[idx - 1]!;
  if (TAB_CONTAINER_PREV_TYPES.has(prev.type)) return null;
  if (!TODO_NEST_TAB_PREV_TYPES.has(prev.type)) return null;
  if (level >= MAX_TODO_LIST_NEST_LEVEL) return null;

  return { listNestLevel: level + 1 };
}
