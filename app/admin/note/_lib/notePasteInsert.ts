import { getBlocksInParent } from '@/app/lib/note/noteBlockTree';
import { contentForPastedBlock, type PastedBlockSpec } from './notePasteBlocks';
import type { NoteBlock } from './types';

export type PasteInsertContext = {
  blocksRef: { current: NoteBlock[] };
  insertBlockAmongSiblings: (
    parentId: string | null,
    type: NoteBlock['type'],
    insertIndex: number,
    options?: { content?: Record<string, unknown>; focus?: boolean; registerUndo?: boolean },
  ) => Promise<NoteBlock | null>;
  changeBlockType: (block: NoteBlock, type: NoteBlock['type']) => Promise<void>;
  syncBlockContent: (blockId: string, content: Record<string, unknown>) => void;
};

function isListSpec(spec: PastedBlockSpec): boolean {
  return spec.type === 'bulletList' || spec.type === 'numberedList';
}

export async function insertPastedBlockSpecsAfterAnchor(
  ctx: PasteInsertContext,
  anchor: NoteBlock,
  specs: PastedBlockSpec[],
  sourceContent: Record<string, unknown>,
): Promise<{ lastFocusId: string; lastFocusPart: 'title' | 'editor' }> {
  if (specs.length === 0) {
    return { lastFocusId: anchor.id, lastFocusPart: 'editor' };
  }

  const [first, ...rest] = specs;
  if (first.type !== anchor.type) {
    await ctx.changeBlockType(anchor, first.type);
  }
  ctx.syncBlockContent(anchor.id, contentForPastedBlock(first, sourceContent));

  let lastFocusId = anchor.id;
  let lastFocusPart: 'title' | 'editor' = first.type === 'toggle' ? 'title' : 'editor';

  if (first.children?.length) {
    const nested = await insertSpecsAmongSiblings(
      ctx,
      anchor.id,
      0,
      first.children,
      sourceContent,
      [],
    );
    if (nested) {
      lastFocusId = nested.lastFocusId;
      lastFocusPart = nested.lastFocusPart;
    }
  }

  const parentId = anchor.parent_block_id ?? null;
  const siblings = getBlocksInParent(ctx.blocksRef.current, parentId)
    .sort((a, b) => a.order_index - b.order_index);
  const afterIndex = siblings.findIndex((item) => item.id === anchor.id) + 1;

  if (rest.length > 0) {
    const tail = await insertSpecsAmongSiblings(
      ctx,
      parentId,
      afterIndex,
      rest,
      sourceContent,
      [],
    );
    if (tail) {
      lastFocusId = tail.lastFocusId;
      lastFocusPart = tail.lastFocusPart;
    }
  }

  return { lastFocusId, lastFocusPart };
}

export async function insertPastedBlockSpecsAfterBlock(
  ctx: PasteInsertContext,
  afterBlock: NoteBlock,
  specs: PastedBlockSpec[],
  sourceContent: Record<string, unknown>,
): Promise<{ lastFocusId: string; lastFocusPart: 'title' | 'editor' }> {
  const parentId = afterBlock.parent_block_id ?? null;
  const siblings = getBlocksInParent(ctx.blocksRef.current, parentId)
    .sort((a, b) => a.order_index - b.order_index);
  const afterIndex = siblings.findIndex((item) => item.id === afterBlock.id) + 1;
  const result = await insertSpecsAmongSiblings(
    ctx,
    parentId,
    afterIndex,
    specs,
    sourceContent,
    [],
  );
  return result ?? { lastFocusId: afterBlock.id, lastFocusPart: 'editor' };
}

async function insertSpecsAmongSiblings(
  ctx: PasteInsertContext,
  parentId: string | null,
  startIndex: number,
  specs: PastedBlockSpec[],
  sourceContent: Record<string, unknown>,
  listParentStack: Array<string | null>,
): Promise<{ lastFocusId: string; lastFocusPart: 'title' | 'editor' } | null> {
  if (specs.length === 0) return null;

  let insertIndex = startIndex;
  let lastFocusId = '';
  let lastFocusPart: 'title' | 'editor' = 'editor';
  const stack = [...listParentStack];

  for (const spec of specs) {
    let targetParentId = parentId;
    if (isListSpec(spec)) {
      const level = spec.listNestLevel ?? 0;
      targetParentId = stack[level] ?? parentId;
    }

    const siblings = getBlocksInParent(ctx.blocksRef.current, targetParentId);
    const clampedIndex = Math.max(0, Math.min(insertIndex, siblings.length));

    const content = contentForPastedBlock(spec, sourceContent);
    const created = await ctx.insertBlockAmongSiblings(
      targetParentId,
      spec.type,
      clampedIndex,
      { content, focus: false, registerUndo: false },
    );
    if (!created) break;

    lastFocusId = created.id;
    lastFocusPart = created.type === 'toggle' ? 'title' : 'editor';

    if (isListSpec(spec)) {
      const level = spec.listNestLevel ?? 0;
      stack[level] = created.id;
      stack.length = level + 1;
    }

    if (spec.children?.length) {
      const nested = await insertSpecsAmongSiblings(
        ctx,
        created.id,
        0,
        spec.children,
        sourceContent,
        isListSpec(spec) ? stack : [],
      );
      if (nested) {
        lastFocusId = nested.lastFocusId;
        lastFocusPart = nested.lastFocusPart;
      }
    }

    if (targetParentId === parentId) {
      insertIndex += 1;
    }
  }

  return lastFocusId ? { lastFocusId, lastFocusPart } : null;
}
