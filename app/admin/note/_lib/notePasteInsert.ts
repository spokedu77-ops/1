import { getBlocksInParent } from '@/app/lib/note/noteBlockTree';
import { canPlaceBlockTypeInParent } from '@/app/lib/note/noteBlockPolicy';
import { contentForPastedBlock, isStructuralHtmlPasteSpec, type PastedBlockSpec } from './notePasteBlocks';
import { textLikeContentIsBlank } from './noteInputContract';
import { mergeBlockContentWithStore } from './noteContentPatch';
import { resolveInsertIndexAfterBlock } from './noteInsertPosition';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import type { NoteBlock } from './types';

export type PasteInsertContext = {
  blocksRef: { current: NoteBlock[] };
  insertBlockAmongSiblings: (
    parentId: string | null,
    type: NoteBlock['type'],
    insertIndex: number,
    options?: {
      content?: Record<string, unknown>;
      focus?: boolean;
      registerUndo?: boolean;
      reason?: 'explicit' | 'enter' | 'paste' | 'duplicate' | 'system';
    },
  ) => Promise<NoteBlock | null>;
  changeBlockType: (
    block: NoteBlock,
    type: NoteBlock['type'],
    options?: { contentOverride?: Record<string, unknown> },
  ) => Promise<void>;
  syncBlockContent: (
    blockId: string,
    content: Record<string, unknown>,
    options?: { skipUndo?: boolean },
  ) => void;
  /** fill-anchor 후 TipTap이 store와 어긋나지 않게 본문 주입 */
  hydrateEditorContent?: (blockId: string, content: Record<string, unknown>) => void;
};

function isNestablePasteSpec(spec: PastedBlockSpec): boolean {
  return spec.type === 'bulletList'
    || spec.type === 'numberedList'
    || spec.type === 'todo';
}

function isBlankPasteSpec(spec: PastedBlockSpec): boolean {
  if (isStructuralHtmlPasteSpec(spec)) return false;
  if ((spec.children?.length ?? 0) > 0) return false;
  return textLikeContentIsBlank(contentForPastedBlock(spec, {}));
}

function parentInsertKey(parentId: string | null): string {
  return parentId ?? '__root__';
}

export function resolvePasteSourceContent(block: NoteBlock): Record<string, unknown> {
  const base = (block.content ?? {}) as Record<string, unknown>;
  const storeContent = useNoteBlockStore.getState().getBlock(block.id)?.content as
    | Record<string, unknown>
    | undefined;
  return (mergeBlockContentWithStore(base, storeContent) ?? base) as Record<string, unknown>;
}

/**
 * nest stack이 가리키는 부모가 정책상 불가면 허용 조상(또는 root)으로 승격.
 */
export function resolvePasteNestParentId(
  blocks: ReadonlyArray<Pick<NoteBlock, 'id' | 'type' | 'parent_block_id'>>,
  preferredParentId: string | null,
  movingType: string,
  fallbackParentId: string | null,
): string | null {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  let candidate: string | null = preferredParentId;
  const seen = new Set<string>();
  while (true) {
    if (candidate && seen.has(candidate)) return fallbackParentId;
    if (candidate) seen.add(candidate);
    const parentType = candidate ? (byId.get(candidate)?.type ?? null) : null;
    if (candidate == null || parentType != null) {
      if (canPlaceBlockTypeInParent(movingType, parentType)) return candidate;
    }
    if (!candidate) {
      return canPlaceBlockTypeInParent(movingType, null) ? null : fallbackParentId;
    }
    candidate = byId.get(candidate)?.parent_block_id ?? null;
  }
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
  const filled = contentForPastedBlock(first, sourceContent);
  if (first.type !== anchor.type) {
    // type-change에 paste 본문을 같이 넣어 remount flush wipe 방지
    await ctx.changeBlockType(anchor, first.type, { contentOverride: filled });
  }
  ctx.syncBlockContent(anchor.id, filled, { skipUndo: true });
  ctx.hydrateEditorContent?.(anchor.id, filled);

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

  const { parentId, insertIndex: afterIndex } = resolveInsertIndexAfterBlock(
    ctx.blocksRef.current,
    anchor,
  );

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
  const { parentId, insertIndex: afterIndex } = resolveInsertIndexAfterBlock(
    ctx.blocksRef.current,
    afterBlock,
  );
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

  const insertIndexByParent = new Map<string, number>();
  insertIndexByParent.set(parentInsertKey(parentId), startIndex);

  let lastFocusId = '';
  let lastFocusPart: 'title' | 'editor' = 'editor';
  const stack = [...listParentStack];

  for (const spec of specs) {
    if (isBlankPasteSpec(spec)) continue;

    let preferredParentId = parentId;
    if (isNestablePasteSpec(spec)) {
      const level = spec.listNestLevel ?? 0;
      preferredParentId = level === 0 ? parentId : (stack[level - 1] ?? parentId);
    }

    const targetParentId = resolvePasteNestParentId(
      ctx.blocksRef.current,
      preferredParentId,
      spec.type,
      parentId,
    );

    const parentKey = parentInsertKey(targetParentId);
    if (!insertIndexByParent.has(parentKey)) {
      insertIndexByParent.set(parentKey, 0);
    }
    const siblings = getBlocksInParent(ctx.blocksRef.current, targetParentId);
    const rawIndex = insertIndexByParent.get(parentKey) ?? 0;
    const clampedIndex = Math.max(0, Math.min(rawIndex, siblings.length));

    const content = contentForPastedBlock(spec, sourceContent);
    const created = await ctx.insertBlockAmongSiblings(
      targetParentId,
      spec.type,
      clampedIndex,
      { content, focus: false, registerUndo: false, reason: 'paste' },
    );
    if (!created) {
      throw new Error(`[Note] paste create failed: ${spec.type} under ${targetParentId ?? 'root'}`);
    }

    lastFocusId = created.id;
    lastFocusPart = created.type === 'toggle' ? 'title' : 'editor';
    insertIndexByParent.set(parentKey, clampedIndex + 1);

    if (isNestablePasteSpec(spec)) {
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
        isNestablePasteSpec(spec) ? stack : [],
      );
      if (nested) {
        lastFocusId = nested.lastFocusId;
        lastFocusPart = nested.lastFocusPart;
      }
    }
  }

  return lastFocusId ? { lastFocusId, lastFocusPart } : null;
}
