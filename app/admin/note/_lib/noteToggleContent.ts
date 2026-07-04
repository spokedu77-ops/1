import { buildChildrenByParentBlock } from '@/app/lib/note/noteBlockTree';
import { TOGGLE_LEGACY_CONTENT_KEYS } from './noteBlockTypes';
import type { NoteBlock } from './types';

export type ToggleLegacyMigrationResult = {
  blocks: NoteBlock[];
  created: NoteBlock[];
  updatedToggleIds: string[];
};

export function toggleBodyHasLegacyContent(content: Record<string, unknown> | null | undefined): boolean {
  if (!content) return false;
  const body = typeof content.body === 'string' ? content.body.trim() : '';
  const bodyHtml = typeof content.bodyHtml === 'string' ? content.bodyHtml.trim() : '';
  const legacyBody = typeof content.legacyBody === 'string' ? content.legacyBody.trim() : '';
  return body.length > 0 || bodyHtml.length > 0 || legacyBody.length > 0;
}

function readToggleLegacyImageUrls(content: Record<string, unknown>): string[] {
  if (!Array.isArray(content.images)) return [];
  return content.images
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
    .filter(Boolean);
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

function nextChildOrderIndex(children: NoteBlock[]): number {
  if (children.length === 0) return 0;
  return Math.max(...children.map((child) => child.order_index)) + 1;
}

/** 토글 content.body·images → 자식 블록 (Notion-style 단일 모델) */
export function migrateToggleLegacyToChildBlocks(blocks: NoteBlock[]): ToggleLegacyMigrationResult {
  const childrenByParent = buildChildrenByParentBlock(blocks);
  const created: NoteBlock[] = [];
  const updatedToggleIds: string[] = [];

  const nextBlocks = blocks.map((block) => {
    if (block.type !== 'toggle') return block;

    const content = (block.content ?? {}) as Record<string, unknown>;
    const existingChildren = childrenByParent.get(block.id) ?? [];
    const pendingCreated: NoteBlock[] = [];
    let orderIndex = nextChildOrderIndex(existingChildren);
    let workingContent = { ...content };
    let mutated = false;

    if (existingChildren.length === 0 && toggleBodyHasLegacyContent(content)) {
      const bodyText =
        typeof content.body === 'string' && content.body.trim()
          ? content.body
          : typeof content.legacyBody === 'string'
            ? content.legacyBody
            : '';
      const bodyHtml =
        typeof content.bodyHtml === 'string'
          ? content.bodyHtml
          : typeof content.legacyBodyHtml === 'string'
            ? content.legacyBodyHtml
            : undefined;

      pendingCreated.push({
        id: crypto.randomUUID(),
        document_id: block.document_id,
        type: 'text',
        parent_block_id: block.id,
        order_index: orderIndex,
        content: {
          text: bodyText,
          ...(bodyHtml ? { html: bodyHtml } : {}),
          placedInToggle: true,
          createdInsideToggle: true,
          migratedFromToggleBody: true,
        },
        created_at: block.created_at,
        updated_at: block.updated_at,
      });
      orderIndex += 1;
      workingContent = stripToggleLegacyContentFields(workingContent);
      mutated = true;
    }

    for (const url of readToggleLegacyImageUrls(content)) {
      pendingCreated.push({
        id: crypto.randomUUID(),
        document_id: block.document_id,
        type: 'image',
        parent_block_id: block.id,
        order_index: orderIndex,
        content: {
          url,
          placedInToggle: true,
          migratedFromToggleImages: true,
        },
        created_at: block.created_at,
        updated_at: block.updated_at,
      });
      orderIndex += 1;
      mutated = true;
    }

    if ('images' in content) {
      workingContent = stripToggleLegacyContentFields(workingContent);
      delete workingContent.images;
      mutated = true;
    }

    if (!mutated) return block;

    created.push(...pendingCreated);
    for (const child of pendingCreated) {
      const siblings = childrenByParent.get(block.id) ?? [];
      childrenByParent.set(block.id, [...siblings, child]);
    }
    updatedToggleIds.push(block.id);
    return {
      ...block,
      content: workingContent,
    };
  });

  if (created.length === 0) {
    return { blocks, created, updatedToggleIds };
  }

  return {
    blocks: [...nextBlocks, ...created],
    created,
    updatedToggleIds,
  };
}

/** @deprecated migrateToggleLegacyToChildBlocks 사용 */
export function migrateToggleBodyToChildBlocks(blocks: NoteBlock[]): ToggleLegacyMigrationResult {
  return migrateToggleLegacyToChildBlocks(blocks);
}
