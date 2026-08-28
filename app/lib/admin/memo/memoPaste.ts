import { NOTE_BLOCKS_CLIPBOARD_PREFIX } from '@/app/admin/note/_lib/noteBlockClipboard';
import type { MemoBlockType } from './types';

export type MemoPasteItem = {
  type: MemoBlockType;
  content: string;
  checked?: boolean;
  collapsed?: boolean;
  children?: MemoPasteItem[];
};

type ClipboardNode = {
  type: string;
  content?: Record<string, unknown>;
  children?: ClipboardNode[];
};

type ClipboardPayload = {
  version: number;
  blocks: ClipboardNode[];
};

function htmlToPlain(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

function nodeText(content: Record<string, unknown> | undefined): string {
  if (!content) return '';
  if (typeof content.text === 'string' && content.text.trim()) return content.text;
  if (typeof content.html === 'string' && content.html.trim()) return htmlToPlain(content.html);
  if (typeof content.title === 'string' && content.title.trim()) return content.title;
  return '';
}

function nodeToMemoItem(node: ClipboardNode): MemoPasteItem | null {
  if (node.type === 'todo') {
    return {
      type: 'checklist',
      content: nodeText(node.content),
      checked: !!node.content?.checked,
    };
  }
  if (node.type === 'toggle') {
    const children: MemoPasteItem[] = [];
    for (const child of node.children ?? []) {
      const mapped = nodeToMemoItem(child);
      if (mapped && mapped.type !== 'toggle') children.push(mapped);
    }
    return {
      type: 'toggle',
      content: nodeText(node.content),
      collapsed: !!node.content?.collapsed,
      children,
    };
  }
  if (node.type === 'divider') {
    return { type: 'text', content: '---' };
  }
  if (node.type === 'image' || node.type === 'table' || node.type === 'page') {
    const caption =
      typeof node.content?.caption === 'string'
        ? node.content.caption
        : typeof node.content?.title === 'string'
          ? node.content.title
          : '';
    return caption ? { type: 'text', content: caption } : null;
  }
  const text = nodeText(node.content);
  if (!text && !(node.children?.length)) return null;
  return { type: 'text', content: text };
}

function payloadToMemoItems(payload: ClipboardPayload): MemoPasteItem[] {
  if (payload.version !== 1 || !Array.isArray(payload.blocks)) return [];
  const items: MemoPasteItem[] = [];
  for (const node of payload.blocks) {
    const mapped = nodeToMemoItem(node);
    if (mapped) items.push(mapped);
  }
  return items;
}

function parsePayloadText(text: string): MemoPasteItem[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(NOTE_BLOCKS_CLIPBOARD_PREFIX)) return null;
  try {
    const payload = JSON.parse(trimmed.slice(NOTE_BLOCKS_CLIPBOARD_PREFIX.length)) as ClipboardPayload;
    const items = payloadToMemoItems(payload);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

/** 노트 클립보드·일반 텍스트에서 메모장 블록 목록 추출 */
export function parseMemoPasteFromClipboard(data: DataTransfer): MemoPasteItem[] | null {
  const mime = data.getData('application/x-note-blocks+json');
  if (mime) {
    try {
      const items = payloadToMemoItems(JSON.parse(mime) as ClipboardPayload);
      if (items.length > 0) return items;
    } catch {
      // fall through
    }
  }

  const plain = data.getData('text/plain');
  if (plain) {
    const fromPrefix = parsePayloadText(plain);
    if (fromPrefix) return fromPrefix;
  }

  return null;
}

/** 저장된 content가 NOTE_BLOCKS_JSON이면 본문만 추출 (기존 잘못 붙은 데이터 복구용) */
export function normalizeMemoBlockContent(raw: string): string {
  const parsed = parsePayloadText(raw);
  if (!parsed || parsed.length !== 1) {
    if (parsed && parsed.length > 1) {
      return parsed.map((item) => item.content).filter(Boolean).join('\n');
    }
    return raw;
  }
  return parsed[0].content;
}

/** 붙여넣기 항목을 API 생성용 평탄 목록으로 (토글 자식 포함) */
export function flattenPasteItems(
  items: MemoPasteItem[],
  parentBlockId: string | null = null,
): Array<{
  type: MemoBlockType;
  content: string;
  checked: boolean;
  collapsed: boolean;
  parentBlockId: string | null;
  childItems?: MemoPasteItem[];
}> {
  const out: Array<{
    type: MemoBlockType;
    content: string;
    checked: boolean;
    collapsed: boolean;
    parentBlockId: string | null;
    childItems?: MemoPasteItem[];
  }> = [];

  for (const item of items) {
    if (item.type === 'toggle') {
      out.push({
        type: 'toggle',
        content: item.content,
        checked: false,
        collapsed: item.collapsed ?? false,
        parentBlockId,
        childItems: item.children,
      });
    } else {
      out.push({
        type: item.type,
        content: item.content,
        checked: item.checked ?? false,
        collapsed: false,
        parentBlockId,
      });
    }
  }
  return out;
}
