/**
 * Admin Note 편집 DoD — 현재 범위(A/B/C1·C2) 계약 테스트.
 * Notion 전체가 아니라 "지금 구현한 편집 기능"의 회귀 방어용.
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdownPlainToBlocks, shouldSplitMarkdownPaste } from './notePasteMarkdown';
import { parseClipboardHtmlToBlocks, shouldSplitHtmlPaste } from './notePasteHtml';
import {
  buildBlockClipboardPayload,
  clipboardPayloadToPasteSpecs,
  parseBlockClipboardText,
  serializeBlockClipboardPayload,
} from './noteBlockClipboard';
import { buildContentForTypeChange, filterTurnIntoCommands } from './noteBlockTypeChange';
import { isSlashMenuActiveText, stripSlashTriggerForTypeChange } from '../_components/noteBulletInput';
import { planMoveSiblingBlockGroup } from '@/app/lib/note/noteBlockTree';
import {
  resolveEditorShiftEnterAction,
  resolveTableCellEnterAction,
  resolveInlineBlockEnterAction,
  resolveHeadingEnterAction,
  resolveToggleChildBackspaceAtStartAction,
  resolveToggleChildEmptyBackspaceAction,
  resolveToggleTitleBackspaceAction,
  resolveToggleTitleEnterAction,
} from './noteNotionBlockBehavior';
import { readImageWidthPercent, buildImageWidthPatch, snapImageWidthPercent } from './noteImageBlock';
import { parseVideoEmbedUrl } from '@/app/lib/note/videoEmbed';
import { getSiblingBlockRangeIds } from './noteDropResolver';
import { buildBlockForestTransferCommand } from './noteBlockTransfer';
import { rowSubstantiallyInMarquee } from './noteMarquee';
import {
  allowsLocalChildBlocks,
  isTodoBlock,
  isToggleBlock,
  supportsInsideDropTarget,
} from './noteBlockSemantics';
import type { NoteBlock } from './types';

const TURN_INTO_COMMANDS = [
  { type: 'text' as const },
  { type: 'heading' as const },
  { type: 'quote' as const },
  { type: 'callout' as const },
  { type: 'bulletList' as const },
  { type: 'todo' as const },
];

function block(id: string, type: NoteBlock['type'], parent: string | null = null): NoteBlock {
  return {
    id,
    document_id: 'doc',
    type,
    order_index: 0,
    parent_block_id: parent,
    content: { text: id },
    created_at: '',
    updated_at: '',
  };
}

describe('Admin Note editing DoD — Phase A paste & clipboard', () => {
  it('markdown paste splits block markers', () => {
    const specs = parseMarkdownPlainToBlocks('# Title\n- A\n- B');
    expect(specs).not.toBeNull();
    expect(shouldSplitMarkdownPaste(specs!)).toBe(true);
    expect(specs![0].type).toBe('heading');
    expect(specs![1].listNestLevel).toBe(0);
  });

  it('html paste splits structural blocks', () => {
    const specs = parseClipboardHtmlToBlocks(
      '<figure><img src="https://example.com/a.png" alt=""><figcaption>cap</figcaption></figure><p>B</p>',
    );
    expect(specs).not.toBeNull();
    expect(specs!.length).toBeGreaterThan(0);
    expect(shouldSplitHtmlPaste(specs!)).toBe(true);
    expect(specs!.some((spec) => spec.type === 'image')).toBe(true);
  });

  it('block clipboard round-trips forest', () => {
    const blocks = [
      block('a', 'page'),
      block('b', 'bulletList', 'a'),
    ];
    const payload = buildBlockClipboardPayload(blocks, ['a', 'b']);
    const serialized = serializeBlockClipboardPayload(payload!);
    const parsed = parseBlockClipboardText(serialized);
    const specs = clipboardPayloadToPasteSpecs(parsed!);
    expect(specs[0].children?.[0]?.type).toBe('bulletList');
  });

  it('page is a local child container', () => {
    expect(supportsInsideDropTarget('page')).toBe(true);
    expect(allowsLocalChildBlocks(block('page-link', 'page'))).toBe(true);
    expect(allowsLocalChildBlocks(block('toggle', 'toggle'))).toBe(true);
  });

  it('todo and toggle have named minimum block semantics', () => {
    expect(isTodoBlock(block('todo', 'todo'))).toBe(true);
    expect(isToggleBlock(block('toggle', 'toggle'))).toBe(true);
    expect(supportsInsideDropTarget('todo')).toBe(false);
    expect(supportsInsideDropTarget('toggle')).toBe(true);
  });
});

describe('Admin Note editing DoD — Phase B keyboard & turn into', () => {
  it('Shift+Enter stays in block; table Enter defers in-cell', () => {
    expect(resolveEditorShiftEnterAction(true)).toEqual({ kind: 'hard-break' });
    expect(resolveEditorShiftEnterAction(false)).toBeNull();
    expect(resolveTableCellEnterAction(true)).toEqual({ kind: 'hard-break' });
    expect(resolveTableCellEnterAction(false)).toEqual({ kind: 'defer' });
  });

  it('Enter on inline blocks follows Notion empty/outdent/convert rules', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'todo',
      text: 'x',
      parentBlockId: null,
    })).toEqual({ kind: 'add-below', followType: 'todo' });

    expect(resolveInlineBlockEnterAction({
      followType: 'bulletList',
      text: '',
      parentBlockId: 'parent-1',
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'outdent' });

    expect(resolveHeadingEnterAction({
      text: '',
      parentBlockId: null,
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'convert-to-text' });
  });

  it('toggle title Enter adds child when expanded', () => {
    expect(resolveToggleTitleEnterAction(false)).toEqual({ kind: 'add-child', blockType: 'text' });
    expect(resolveToggleTitleEnterAction(true)).toEqual({ kind: 'add-sibling', blockType: 'toggle' });
  });

  it('toggle title Backspace at start navigates up when title is non-empty', () => {
    expect(resolveToggleTitleBackspaceAction({
      title: '제목',
      selectionStart: 0,
      selectionEnd: 0,
    })).toEqual({ kind: 'navigate-previous' });
    expect(resolveToggleTitleBackspaceAction({
      title: '',
      selectionStart: 0,
      selectionEnd: 0,
    })).toEqual({ kind: 'convert-to-text' });
  });

  it('toggle child empty backspace and at-start backspace focus parent title', () => {
    expect(resolveToggleChildEmptyBackspaceAction({
      parentBlockType: 'toggle',
      isFirstChildInToggle: true,
      canMergeWithPrevious: false,
    })).toEqual({ kind: 'delete-and-focus-toggle-title' });
    expect(resolveToggleChildBackspaceAtStartAction({
      parentBlockType: 'toggle',
      isFirstChildInToggle: true,
    })).toEqual({ kind: 'focus-toggle-title' });
  });

  it('empty text inside toggle Enter adds sibling (not outdent)', () => {
    expect(resolveInlineBlockEnterAction({
      followType: 'text',
      text: '',
      parentBlockId: 'toggle-1',
      parentBlockType: 'toggle',
      enterCtx: { isEmpty: true },
    })).toEqual({ kind: 'add-below', followType: 'text' });
  });

  it('turn into preserves html and excludes current type', () => {
    const html = '<p><strong>x</strong></p>';
    const next = buildContentForTypeChange(
      { text: 'Note', html },
      'quote',
      'callout',
    );
    expect(next.html).toBe(html);
    expect(filterTurnIntoCommands('quote', TURN_INTO_COMMANDS, { text: 'x' }).map((c) => c.type))
      .not.toContain('quote');
  });

  it('slash menu trigger is line-start only and strips on type change', () => {
    expect(isSlashMenuActiveText('/todo')).toBe(true);
    expect(isSlashMenuActiveText('/체크')).toBe(true);
    expect(isSlashMenuActiveText('hello /todo')).toBe(false);
    expect(stripSlashTriggerForTypeChange('/todo')).toBe('');
    const next = buildContentForTypeChange({ text: '/todo', html: '<p>/todo</p>' }, 'text', 'todo');
    expect(next.text).toBe('');
    expect(next.html).toBe('');
  });

  it('slash-filtered turn into excludes current block type', () => {
    const filtered = filterTurnIntoCommands('text', TURN_INTO_COMMANDS, { text: '/제목' });
    expect(filtered.map((c) => c.type)).not.toContain('text');
    expect(filtered.length).toBeGreaterThan(0);
  });
});

describe('Admin Note editing DoD — Phase C1/C2 media', () => {
  it('image widthPercent snaps and syncs legacy width field', () => {
    expect(snapImageWidthPercent(10)).toBe(25);
    expect(buildImageWidthPatch(40)).toEqual({ widthPercent: 40, width: 'half' });
    expect(readImageWidthPercent({ widthPercent: 72 })).toBe(72);
  });

  it('video embed supports youtube vimeo loom allowlist', () => {
    expect(parseVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.provider).toBe('youtube');
    expect(parseVideoEmbedUrl('https://vimeo.com/123')?.provider).toBe('vimeo');
    expect(parseVideoEmbedUrl('https://www.loom.com/share/abcdef12-3456-7890-abcd-ef1234567890')?.provider).toBe('loom');
    expect(parseVideoEmbedUrl('https://evil.example/v')).toBeNull();
  });
});

describe('Admin Note editing DoD — selection, drag, marquee', () => {
  it('marquee hit-test uses overlap + center (Notion-like)', () => {
    const row = { top: 0, bottom: 40, left: 0, right: 100, height: 40, width: 100 } as DOMRect;
    expect(rowSubstantiallyInMarquee(row, { left: 0, top: 0, right: 120, bottom: 50 })).toBe(true);
  });

  it('shift-click sibling range selects contiguous siblings', () => {
    const blocks: NoteBlock[] = [
      { ...block('a', 'text'), order_index: 0 },
      { ...block('b', 'text'), order_index: 1 },
      { ...block('c', 'text'), order_index: 2 },
    ];
    expect(getSiblingBlockRangeIds(blocks, 'a', 'c').sort()).toEqual(['a', 'b', 'c']);
  });

  it('multi-block drag deduplicates nested forest roots', () => {
    const blocks: NoteBlock[] = [
      { ...block('root', 'text'), order_index: 0 },
      { ...block('child', 'text'), order_index: 0, parent_block_id: 'root' },
      { ...block('other', 'text'), order_index: 1 },
    ];
    const cmd = buildBlockForestTransferCommand(blocks, ['root', 'child'], 'doc-2');
    expect(cmd.rootIds).toEqual(['root']);
    expect(cmd.movedIds).toContain('child');
  });

  it('sibling group reorder plan moves contiguous nested siblings', () => {
    const blocks: NoteBlock[] = [
      { ...block('toggle', 'toggle'), order_index: 0 },
      { ...block('a', 'text'), order_index: 0, parent_block_id: 'toggle' },
      { ...block('b', 'text'), order_index: 1, parent_block_id: 'toggle' },
      { ...block('c', 'text'), order_index: 2, parent_block_id: 'toggle' },
    ];
    const next = planMoveSiblingBlockGroup(blocks, ['a', 'b'], 'c', 'after');
    const children = next!
      .filter((item) => item.parent_block_id === 'toggle')
      .sort((x, y) => x.order_index - y.order_index);
    expect(children.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('Admin Note editing DoD — explicit non-goals (문서화)', () => {
  it('current scope does not include Notion DB / comments / realtime', () => {
    const excluded = ['database', 'comments', 'mentions', 'realtime-cursor'];
    expect(excluded.length).toBeGreaterThan(0);
  });
});
