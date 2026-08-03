import { getBlocksInParent } from '@/app/lib/note/noteBlockTree';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';
import { readTodoListNestLevel } from './noteTodoContent';
import { assertMigrationPreservesUserContent } from './noteDataIntegrity';

/** 로드 마이그레이션 결과를 서버에 고정할 field patch */
export function buildTodoNestMigrationPatches(
  before: NoteBlock[],
  after: NoteBlock[],
): NoteBlockFieldPatch[] {
  const beforeById = new Map(before.map((block) => [block.id, block]));
  const patches: NoteBlockFieldPatch[] = [];
  for (const block of after) {
    const prev = beforeById.get(block.id);
    if (!prev) continue;
    const parentChanged = (prev.parent_block_id ?? null) !== (block.parent_block_id ?? null);
    const orderChanged = prev.order_index !== block.order_index;
    const contentChanged = JSON.stringify(prev.content ?? {}) !== JSON.stringify(block.content ?? {});
    if (!parentChanged && !orderChanged && !contentChanged) continue;
    patches.push({
      id: block.id,
      parent_block_id: block.parent_block_id ?? null,
      order_index: block.order_index,
      content: (block.content ?? {}) as Record<string, unknown>,
    });
  }
  return patches;
}

/**
 * 레거시 content.listNestLevel → parent_block_id 트리 (노션 계약 SSOT).
 * 같은 형제 그룹 안에서만 변환. 이미 트리로 중첩된 todo는 level=0으로 보고 유지.
 */
export function migrateTodoListNestLevelsToTree(blocks: NoteBlock[]): {
  blocks: NoteBlock[];
  changed: boolean;
} {
  const byId = new Map(blocks.map((block) => [block.id, { ...block }]));
  let changed = false;

  const parentKeys = new Set<string | null>();
  for (const block of blocks) {
    parentKeys.add(block.parent_block_id ?? null);
  }

  for (const parentKey of parentKeys) {
    const siblings = getBlocksInParent(blocks, parentKey);
    const stack: string[] = [];

    for (const sibling of siblings) {
      const live = byId.get(sibling.id);
      if (!live) continue;

      if (live.type !== 'todo') {
        stack.length = 0;
        if (live.content && 'listNestLevel' in (live.content as object)) {
          const content = { ...(live.content as Record<string, unknown>) };
          delete content.listNestLevel;
          byId.set(live.id, { ...live, content });
          changed = true;
        }
        continue;
      }

      const level = readTodoListNestLevel(live.content as Record<string, unknown>);
      const content = { ...(live.content as Record<string, unknown> ?? {}) };
      const hadLevel = 'listNestLevel' in content;
      if (hadLevel) {
        delete content.listNestLevel;
        changed = true;
      }

      let nextParentId = parentKey;
      if (level > 0) {
        const parentTodoId = stack[Math.min(level, stack.length) - 1] ?? stack[stack.length - 1];
        if (parentTodoId) nextParentId = parentTodoId;
      }

      const prevParent = live.parent_block_id ?? null;
      if (nextParentId !== prevParent || hadLevel) {
        byId.set(live.id, {
          ...live,
          parent_block_id: nextParentId,
          content,
        });
        changed = true;
      } else if (hadLevel) {
        byId.set(live.id, { ...live, content });
      }

      const nestDepth = nextParentId === parentKey
        ? 0
        : (() => {
          let depth = 0;
          let cursor: string | null = nextParentId;
          const seen = new Set<string>();
          while (cursor && cursor !== parentKey) {
            if (seen.has(cursor)) break;
            seen.add(cursor);
            depth += 1;
            cursor = byId.get(cursor)?.parent_block_id ?? null;
          }
          return depth;
        })();
      stack[nestDepth] = live.id;
      stack.length = nestDepth + 1;
    }
  }

  if (!changed) return { blocks, changed: false };

  const nextBlocks = blocks.map((block) => byId.get(block.id) ?? block);
  // 형제 order_index 재부여
  const groups = new Map<string, NoteBlock[]>();
  for (const block of nextBlocks) {
    const key = block.parent_block_id ?? '__root__';
    const list = groups.get(key) ?? [];
    list.push(block);
    groups.set(key, list);
  }
  const orderById = new Map<string, number>();
  for (const list of groups.values()) {
    list
      .sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id))
      .forEach((block, index) => orderById.set(block.id, index));
  }

  const remapped = nextBlocks.map((block) => {
    const order_index = orderById.get(block.id);
    return order_index === undefined || order_index === block.order_index
      ? block
      : { ...block, order_index };
  });
  const violations = assertMigrationPreservesUserContent(blocks, remapped);
  if (violations.length > 0) {
    // 본문 손상 시 migration 자체를 롤백 — 구조만 고치려다 데이터를 잃지 않는다
    return { blocks, changed: false };
  }
  return { changed: true, blocks: remapped };
}
