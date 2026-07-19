import { buildChildrenByParentBlock } from '@/app/lib/note/noteBlockTree';
import { hasToggleBodyContent, resolveToggleBodyForDisplay } from '@/app/lib/note/toggleBody';
import { TOGGLE_LEGACY_CONTENT_KEYS } from './noteBlockTypes';
import type { NoteBlock } from './types';

export type ToggleLegacyMigrationResult = {
  blocks: NoteBlock[];
  created: NoteBlock[];
  updatedChildPatches: Array<{ id: string; content: Record<string, unknown> }>;
  updatedToggleIds: string[];
};

export function toggleBodyHasLegacyContent(content: Record<string, unknown> | null | undefined): boolean {
  return hasToggleBodyContent(content);
}

/** 토글 content 레거시(body·images) → 자식 블록 단일 모델 */
export function stripToggleLegacyContentFields(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...content };
  for (const key of TOGGLE_LEGACY_CONTENT_KEYS) {
    delete next[key];
  }
  return next;
}

/** @deprecated stripToggleLegacyContentFields 사용 */
export const stripToggleLegacyBodyFields = stripToggleLegacyContentFields;

function isEmptyToggleTextChild(block: NoteBlock): boolean {
  if (block.type !== 'text') return false;
  const content = (block.content ?? {}) as Record<string, unknown>;
  const text = typeof content.text === 'string' ? content.text.trim() : '';
  const html = typeof content.html === 'string' ? content.html.trim() : '';
  return !text && !html;
}

function hasDisplayableToggleChildren(children: NoteBlock[]): boolean {
  return children.some((child) => {
    if (child.type === 'text') return !isEmptyToggleTextChild(child);
    return true;
  });
}

/** 토글 자식 삭제 후 legacy archive가 좀비 자식을 재생성하지 않도록 부모 content 정리 */
export function buildToggleLegacyCleanupPatches(
  removedBlocks: NoteBlock[],
  nextBlocks: NoteBlock[],
): Array<{ id: string; content: Record<string, unknown> }> {
  const nextById = new Map(nextBlocks.map((block) => [block.id, block]));
  const childrenByParent = buildChildrenByParentBlock(nextBlocks);
  const patches = new Map<string, Record<string, unknown>>();

  for (const removed of removedBlocks) {
    const parentId = removed.parent_block_id ?? null;
    if (!parentId) continue;
    const parent = nextById.get(parentId);
    if (!parent || parent.type !== 'toggle') continue;

    const remainingChildren = childrenByParent.get(parentId) ?? [];
    if (hasDisplayableToggleChildren(remainingChildren)) continue;

    const parentContent = (parent.content ?? {}) as Record<string, unknown>;
    patches.set(parentId, {
      ...stripToggleLegacyContentFields(parentContent),
      bodyMigrated: true,
    });
  }

  return [...patches.entries()].map(([id, content]) => ({ id, content }));
}

function readToggleLegacyBody(content: Record<string, unknown>): { text: string; html?: string } {
  const { text, html } = resolveToggleBodyForDisplay(content);
  return {
    text,
    ...(html.trim() ? { html } : {}),
  };
}

/** 토글 content.body·images → 자식 블록 (Notion-style 단일 모델) */
export function migrateToggleLegacyToChildBlocks(blocks: NoteBlock[]): ToggleLegacyMigrationResult {
  const childrenByParent = buildChildrenByParentBlock(blocks);
  const created: NoteBlock[] = [];
  const updatedChildPatches: Array<{ id: string; content: Record<string, unknown> }> = [];
  const updatedToggleIds: string[] = [];

  const nextBlocks = blocks.map((block) => {
    if (block.type !== 'toggle') return block;

    const content = (block.content ?? {}) as Record<string, unknown>;
    const existingChildren = childrenByParent.get(block.id) ?? [];
    let workingContent = { ...content };
    let mutated = false;

    /** 이미 마이그레이션된 토글 — legacy archive로 자식 좀비 재생성 금지, 잔여 키만 정리 */
    if (content.bodyMigrated === true) {
      if (toggleBodyHasLegacyContent(content)) {
        updatedToggleIds.push(block.id);
        return {
          ...block,
          content: {
            ...stripToggleLegacyContentFields(content),
            bodyMigrated: true,
          },
        };
      }
      return block;
    }

    const shouldMigrateLegacyBody = toggleBodyHasLegacyContent(content)
      && !hasDisplayableToggleChildren(existingChildren);

    if (shouldMigrateLegacyBody) {
      const { text: bodyText, html: bodyHtml } = readToggleLegacyBody(content);
      const emptyTextChild = existingChildren.find(
        (child) => child.type === 'text' && isEmptyToggleTextChild(child),
      );
      const migratedChild = existingChildren.find(
        (child) =>
          child.type === 'text'
          && (child.content as Record<string, unknown> | undefined)?.migratedFromToggleBody === true,
      );

      if (migratedChild) {
        const prev = (migratedChild.content ?? {}) as Record<string, unknown>;
        const prevText = typeof prev.text === 'string' ? prev.text : '';
        const mergedText = prevText.trim() && bodyText.trim()
          ? `${prevText.trim()}\n${bodyText.trim()}`
          : (bodyText.trim() || prevText);
        updatedChildPatches.push({
          id: migratedChild.id,
          content: {
            ...prev,
            text: mergedText,
            ...(bodyHtml ? { html: bodyHtml } : {}),
            migratedFromToggleBody: true,
            placedInToggle: true,
          },
        });
        mutated = true;
      } else if (emptyTextChild) {
        updatedChildPatches.push({
          id: emptyTextChild.id,
          content: {
            text: bodyText,
            ...(bodyHtml ? { html: bodyHtml } : {}),
            placedInToggle: true,
            migratedFromToggleBody: true,
          },
        });
        mutated = true;
      }

      if (mutated) {
        workingContent = stripToggleLegacyContentFields(workingContent);
        delete workingContent.legacyBody;
        delete workingContent.legacyBodyHtml;
        delete workingContent.bodyMigrated;
        if (typeof workingContent.title === 'string' && workingContent.title.trim()) {
          delete workingContent.text;
          delete workingContent.html;
          delete workingContent.legacyText;
        }
      }
    }

    if (!mutated) return block;

    updatedToggleIds.push(block.id);
    return {
      ...block,
      content: workingContent,
    };
  });

  let mergedBlocks = created.length > 0 ? [...nextBlocks, ...created] : nextBlocks;
  if (updatedChildPatches.length > 0) {
    const patchById = new Map(updatedChildPatches.map((patch) => [patch.id, patch.content]));
    mergedBlocks = mergedBlocks.map((block) => {
      const patch = patchById.get(block.id);
      return patch ? { ...block, content: patch } : block;
    });
  }

  if (created.length === 0 && updatedChildPatches.length === 0 && updatedToggleIds.length === 0) {
    return { blocks, created, updatedChildPatches, updatedToggleIds };
  }

  return {
    blocks: mergedBlocks,
    created,
    updatedChildPatches,
    updatedToggleIds,
  };
}

/** @deprecated migrateToggleLegacyToChildBlocks 사용 */
export function migrateToggleBodyToChildBlocks(blocks: NoteBlock[]): ToggleLegacyMigrationResult {
  return migrateToggleLegacyToChildBlocks(blocks);
}
