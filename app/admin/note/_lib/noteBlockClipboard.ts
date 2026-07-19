import { topLevelSelectedDragIds } from '@/app/lib/note/noteBlockTree';
import { getBlocksInParent } from '@/app/lib/note/noteBlockTree';
import { allowsLocalChildBlocks, isPageLinkBlock, isTodoBlock, isToggleBlock } from './noteBlockSemantics';
import type { PastedBlockSpec } from './notePasteBlocks';
import type { NoteBlock } from './types';

export const NOTE_BLOCKS_CLIPBOARD_MIME = 'application/x-note-blocks+json';
export const NOTE_BLOCKS_CLIPBOARD_PREFIX = 'NOTE_BLOCKS_JSON:';

export type NoteBlockClipboardNode = {
  type: NoteBlock['type'];
  content: Record<string, unknown>;
  children?: NoteBlockClipboardNode[];
};

export type NoteBlockClipboardPayload = {
  version: 1;
  blocks: NoteBlockClipboardNode[];
};

function stripBlockForClipboard(block: NoteBlock): Record<string, unknown> {
  const content = { ...(block.content ?? {}) } as Record<string, unknown>;
  delete content.migratedFromToggleBody;
  delete content.migratedFromToggleImages;
  return content;
}

function buildClipboardNode(block: NoteBlock, blocks: NoteBlock[]): NoteBlockClipboardNode {
  const children = !allowsLocalChildBlocks(block)
    ? []
    : getBlocksInParent(blocks, block.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((child) => buildClipboardNode(child, blocks));
  return {
    type: block.type,
    content: stripBlockForClipboard(block),
    ...(children.length > 0 ? { children } : {}),
  };
}

export function buildBlockClipboardPayload(
  blocks: NoteBlock[],
  selectedIds: Iterable<string>,
): NoteBlockClipboardPayload | null {
  const selected = [...selectedIds];
  if (selected.length === 0) return null;
  const roots = topLevelSelectedDragIds(selected, blocks)
    .sort((left, right) => {
      const leftBlock = blocks.find((block) => block.id === left);
      const rightBlock = blocks.find((block) => block.id === right);
      return (leftBlock?.order_index ?? 0) - (rightBlock?.order_index ?? 0);
    });
  if (roots.length === 0) return null;
  return {
    version: 1,
    blocks: roots
      .map((id) => blocks.find((block) => block.id === id))
      .filter((block): block is NoteBlock => !!block)
      .map((block) => buildClipboardNode(block, blocks)),
  };
}

function clipboardNodeToPasteSpec(node: NoteBlockClipboardNode): PastedBlockSpec {
  const content = node.content ?? {};
  if (isToggleBlock(node)) {
    const title = typeof content.title === 'string'
      ? content.title
      : (typeof content.text === 'string' ? content.text : '');
    return {
      type: 'toggle',
      text: title,
      collapsed: !!content.collapsed,
      children: node.children?.map(clipboardNodeToPasteSpec),
    };
  }
  if (node.type === 'image') {
    return {
      type: 'image',
      text: '',
      imageUrl: typeof content.url === 'string' ? content.url : '',
      caption: typeof content.caption === 'string' ? content.caption : '',
    };
  }
  if (node.type === 'table') {
    return {
      type: 'table',
      text: '',
      tableContent: {
        rows: Array.isArray(content.rows) ? content.rows : [],
        hasHeaderRow: content.hasHeaderRow !== false,
        columnCount: Number(content.columnCount ?? 3) || 3,
      },
    };
  }
  if (isTodoBlock(node)) {
    return {
      type: 'todo',
      text: typeof content.text === 'string' ? content.text : '',
      html: typeof content.html === 'string' ? content.html : undefined,
      checked: !!content.checked,
      children: node.children?.map(clipboardNodeToPasteSpec),
    };
  }
  if (isPageLinkBlock(node)) {
    return {
      type: 'page',
      text: typeof content.title === 'string' ? content.title : '',
      pageDocumentId: typeof content.page_document_id === 'string' ? content.page_document_id : '',
      children: node.children?.map(clipboardNodeToPasteSpec),
    };
  }
  if (node.type === 'divider') {
    return { type: 'divider', text: '' };
  }
  return {
    type: node.type,
    text: typeof content.text === 'string' ? content.text : '',
    html: typeof content.html === 'string' ? content.html : undefined,
    language: typeof content.language === 'string' ? content.language : undefined,
    children: node.children?.map(clipboardNodeToPasteSpec),
  };
}

export function clipboardPayloadToPasteSpecs(payload: NoteBlockClipboardPayload): PastedBlockSpec[] {
  return payload.blocks.map(clipboardNodeToPasteSpec);
}

export function serializeBlockClipboardPayload(payload: NoteBlockClipboardPayload): string {
  return `${NOTE_BLOCKS_CLIPBOARD_PREFIX}${JSON.stringify(payload)}`;
}

export function parseBlockClipboardText(text: string): NoteBlockClipboardPayload | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(NOTE_BLOCKS_CLIPBOARD_PREFIX)) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(NOTE_BLOCKS_CLIPBOARD_PREFIX.length)) as NoteBlockClipboardPayload;
    if (parsed?.version !== 1 || !Array.isArray(parsed.blocks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function blockClipboardPlainText(payload: NoteBlockClipboardPayload): string {
  const lines: string[] = [];
  const walk = (nodes: NoteBlockClipboardNode[], depth = 0) => {
    for (const node of nodes) {
      const pad = '  '.repeat(depth);
      if (node.type === 'toggle') {
        lines.push(`${pad}▸ ${typeof node.content.title === 'string' ? node.content.title : ''}`);
      } else if (node.type === 'divider') {
        lines.push(`${pad}---`);
      } else if (typeof node.content.text === 'string' && node.content.text.trim()) {
        lines.push(`${pad}${node.content.text}`);
      } else {
        lines.push(`${pad}[${node.type}]`);
      }
      if (node.children?.length) walk(node.children, depth + 1);
    }
  };
  walk(payload.blocks);
  return lines.join('\n');
}
