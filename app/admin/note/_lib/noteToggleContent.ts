import { buildChildrenByParentBlock } from '@/app/lib/note/noteBlockTree';
import type { NoteBlock } from './types';

export function toggleBodyHasLegacyContent(content: Record<string, unknown> | null | undefined): boolean {
  if (!content) return false;
  const body = typeof content.body === 'string' ? content.body.trim() : '';
  const bodyHtml = typeof content.bodyHtml === 'string' ? content.bodyHtml.trim() : '';
  const legacyBody = typeof content.legacyBody === 'string' ? content.legacyBody.trim() : '';
  return body.length > 0 || bodyHtml.length > 0 || legacyBody.length > 0;
}

export function stripToggleLegacyBodyFields(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...content };
  delete next.body;
  delete next.bodyHtml;
  delete next.legacyBody;
  delete next.legacyBodyHtml;
  return next;
}

/** 토글 content.body → 자식 text 블록 단일 모델 (Notion-style) */
export function migrateToggleBodyToChildBlocks(blocks: NoteBlock[]): {
  blocks: NoteBlock[];
  created: NoteBlock[];
  updatedToggleIds: string[];
} {
  const childrenByParent = buildChildrenByParentBlock(blocks);
  const created: NoteBlock[] = [];
  const updatedToggleIds: string[] = [];
  const createdById = new Map<string, NoteBlock>();

  const nextBlocks = blocks.map((block) => {
    if (block.type !== 'toggle') return block;
    if ((childrenByParent.get(block.id) ?? []).length > 0) return block;

    const content = (block.content ?? {}) as Record<string, unknown>;
    if (!toggleBodyHasLegacyContent(content)) return block;

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

    const child: NoteBlock = {
      id: crypto.randomUUID(),
      document_id: block.document_id,
      type: 'text',
      parent_block_id: block.id,
      order_index: 0,
      content: {
        text: bodyText,
        ...(bodyHtml ? { html: bodyHtml } : {}),
        placedInToggle: true,
        createdInsideToggle: true,
      },
      created_at: block.created_at,
      updated_at: block.updated_at,
    };
    created.push(child);
    createdById.set(child.id, child);
    updatedToggleIds.push(block.id);
    return {
      ...block,
      content: stripToggleLegacyBodyFields(content),
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
