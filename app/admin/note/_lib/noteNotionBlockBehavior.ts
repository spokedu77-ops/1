import type { NoteEditorEnterContext } from '../_components/NoteEditor';
import { getBlocksInParent } from '@/app/lib/note/noteBlockTree';
import { INLINE_DECORATED_BLOCK_TYPES } from './noteBlockTypes';
import type { NoteBlock } from './types';
export function readToggleTitleText(
  content: Record<string, unknown> | null | undefined,
): string {
  if (!content) return '';
  if (typeof content.title === 'string') return content.title;
  if (typeof content.text === 'string') return content.text;
  return '';
}

export function isFirstChildAmongSiblings(
  blocks: NoteBlock[],
  blockId: string,
  parentId: string,
): boolean {
  const siblings = getBlocksInParent(blocks, parentId);
  return siblings[0]?.id === blockId;
}

export type NotionToggleChildBackspaceAtStartAction =
  | { kind: 'focus-toggle-title' }
  | { kind: 'default' };

/** 토글 첫 자식 맨 앞 Backspace — Notion: 제목 끝으로 커서 */
export function resolveToggleChildBackspaceAtStartAction(options: {
  parentBlockType: NoteBlock['type'] | null;
  isFirstChildInToggle: boolean;
}): NotionToggleChildBackspaceAtStartAction {
  if (options.parentBlockType === 'toggle' && options.isFirstChildInToggle) {
    return { kind: 'focus-toggle-title' };
  }
  return { kind: 'default' };
}

export type NotionToggleChildEmptyBackspaceAction =
  | { kind: 'delete-and-focus-toggle-title' }
  | { kind: 'delete-block' }
  | { kind: 'merge-with-previous' };

/** 토글 자식 빈 블록 Backspace — Notion: 자식 제거 후 제목으로 */
export function resolveToggleChildEmptyBackspaceAction(options: {
  parentBlockType: NoteBlock['type'] | null;
  isFirstChildInToggle: boolean;
  canMergeWithPrevious: boolean;
}): NotionToggleChildEmptyBackspaceAction {
  if (options.parentBlockType === 'toggle' && options.isFirstChildInToggle) {
    return { kind: 'delete-and-focus-toggle-title' };
  }
  // decorated(todo 등)는 호출 측에서 convert-to-text를 먼저 적용한다.
  return options.canMergeWithPrevious
    ? { kind: 'merge-with-previous' }
    : { kind: 'delete-block' };
}

/** Notion 스타일 인라인 블록(todo·bullet 등) Enter 결과 */
export type NotionInlineEnterAction =
  | { kind: 'add-below'; followType: NoteBlock['type']; content?: Record<string, unknown> }
  | { kind: 'outdent' }
  | { kind: 'convert-to-text' };

/** 토글 제목 Enter 결과 */
export type NotionToggleTitleEnterAction =
  | { kind: 'add-sibling'; blockType: 'toggle' }
  | { kind: 'add-child'; blockType: 'text' };

export type NotionToggleTitleBackspaceAction =
  | { kind: 'convert-to-text' }
  | { kind: 'navigate-previous' }
  | { kind: 'default' };

/** 페이지 블록 키보드 결과 */
export type NotionPageKeyAction =
  | { kind: 'open-page' };

/** Shift+Enter — 같은 블록 안 줄바꿈 */
export type NotionShiftEnterAction = { kind: 'hard-break' };

export type EditorShiftEnterContext = {
  tabBehavior?: 'block-indent' | 'insert-text-indent' | 'table-cell-nav';
};

/** 표 셀 Enter — Notion: 셀 안 줄바꿈(Shift+Enter 동일), Tab/화살표로 셀 이동 */
export type NotionTableCellEnterAction =
  | { kind: 'hard-break' }
  | { kind: 'defer' };

export function resolveTableCellEnterAction(shiftKey: boolean): NotionTableCellEnterAction {
  if (shiftKey) return { kind: 'hard-break' };
  return { kind: 'defer' };
}

export function shouldEditorShiftEnterHardBreak(shiftKey: boolean): boolean {
  return shiftKey;
}

export function resolveEditorShiftEnterAction(
  shiftKey: boolean,
  context?: EditorShiftEnterContext,
): NotionShiftEnterAction | null {
  void context;
  if (!shouldEditorShiftEnterHardBreak(shiftKey)) return null;
  return { kind: 'hard-break' };
}

export function resolveInlineBlockEnterAction(options: {
  followType: NoteBlock['type'];
  text: string;
  parentBlockId: string | null;
  parentBlockType?: NoteBlock['type'] | null;
  listNestLevel?: number;
  enterCtx?: NoteEditorEnterContext;
  isEmpty?: (rawText: string, enterCtx?: NoteEditorEnterContext) => boolean;
  emptyRootTextBehavior?: 'add-below' | 'convert-to-text';
}): NotionInlineEnterAction {
  const resolveEmpty = options.isEmpty
    ?? ((rawText: string, enterCtx?: NoteEditorEnterContext) =>
      enterCtx?.isEmpty ?? rawText.trim().length === 0);

  if (options.enterCtx?.split) {
    return {
      kind: 'add-below',
      followType: options.followType,
      content: {
        text: options.enterCtx.split.afterText,
        html: options.enterCtx.split.afterHtml,
      },
    };
  }

  const isEmpty = resolveEmpty(options.text, options.enterCtx);
  if (!isEmpty) {
    return { kind: 'add-below', followType: options.followType };
  }

  if (options.followType === 'todo' && (options.listNestLevel ?? 0) > 0) {
    return { kind: 'outdent' };
  }

  if (options.parentBlockId) {
    if (options.parentBlockType === 'toggle') {
      return { kind: 'add-below', followType: 'text' };
    }
    return { kind: 'outdent' };
  }

  if (options.followType === 'text' && options.emptyRootTextBehavior !== 'convert-to-text') {
    return { kind: 'add-below', followType: 'text' };
  }

  return { kind: 'convert-to-text' };
}

export function resolveToggleTitleEnterAction(collapsed: boolean): NotionToggleTitleEnterAction {
  if (collapsed) {
    return { kind: 'add-sibling', blockType: 'toggle' };
  }
  return { kind: 'add-child', blockType: 'text' };
}

export function resolveToggleTitleBackspaceAction(options: {
  title: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}): NotionToggleTitleBackspaceAction {
  if (options.selectionStart !== 0 || options.selectionEnd !== 0) {
    return { kind: 'default' };
  }
  if (options.title.trim().length === 0) {
    return { kind: 'convert-to-text' };
  }
  return { kind: 'navigate-previous' };
}

/** 제목(heading) Enter — 항상 아래 text 블록, 빈 줄이면 text로 전환 */
export function resolveHeadingEnterAction(options: {
  text: string;
  parentBlockId: string | null;
  enterCtx?: NoteEditorEnterContext;
}): NotionInlineEnterAction {
  return resolveInlineBlockEnterAction({
    followType: 'text',
    text: options.text,
    parentBlockId: options.parentBlockId,
    enterCtx: options.enterCtx,
    emptyRootTextBehavior: 'convert-to-text',
  });
}

export function resolveQuoteEnterAction(options: {
  text: string;
  parentBlockId: string | null;
  enterCtx?: NoteEditorEnterContext;
}): NotionInlineEnterAction {
  return resolveInlineBlockEnterAction({
    followType: 'quote',
    text: options.text,
    parentBlockId: options.parentBlockId,
    enterCtx: options.enterCtx,
  });
}

export function resolveCalloutEnterAction(options: {
  text: string;
  parentBlockId: string | null;
  enterCtx?: NoteEditorEnterContext;
}): NotionInlineEnterAction {
  return resolveInlineBlockEnterAction({
    followType: 'callout',
    text: options.text,
    parentBlockId: options.parentBlockId,
    enterCtx: options.enterCtx,
  });
}

export function resolveCodeEnterAction(options: {
  text: string;
  parentBlockId: string | null;
  enterCtx?: NoteEditorEnterContext;
}): NotionInlineEnterAction {
  return resolveInlineBlockEnterAction({
    followType: 'code',
    text: options.text,
    parentBlockId: options.parentBlockId,
    enterCtx: options.enterCtx,
  });
}

/** 편집기 없는 블록(divider·image·video 등) 키보드 */
export type NotionChromeBlockKeyAction =
  | { kind: 'add-text-below' }
  | { kind: 'delete-block' };

export function resolveChromeBlockKeyAction(
  key: string,
  shiftKey: boolean,
): NotionChromeBlockKeyAction | null {
  if (key === 'Enter' && !shiftKey) return { kind: 'add-text-below' };
  if (key === 'Backspace' || key === 'Delete') return { kind: 'delete-block' };
  return null;
}

export function handleNotionChromeBlockKeyDown(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
  handlers: { onAddBelow: () => void; onDelete: () => void },
): boolean {
  const action = resolveChromeBlockKeyAction(event.key, event.shiftKey);
  if (!action) return false;
  if (action.kind === 'add-text-below') {
    handlers.onAddBelow();
    return true;
  }
  handlers.onDelete();
  return true;
}

export function resolvePageBlockEnterAction(): NotionPageKeyAction {
  return { kind: 'open-page' };
}

/** 빈 블록 Backspace — Notion 2단계(부모·하위 문서 공통)
 * 1) todo·heading 등 decorated → text로 장식만 해제 (커서 유지)
 * 2) 빈 text → 블록 삭제 (이전 있으면 포커스만 위로)
 */
export type NotionEmptyBackspaceAction =
  | { kind: 'convert-to-text' }
  | { kind: 'delete-block' }
  | { kind: 'merge-with-previous' };

export function resolveEmptyBackspaceAction(options: {
  blockType: NoteBlock['type'];
  canMergeWithPrevious: boolean;
}): NotionEmptyBackspaceAction {
  if (INLINE_DECORATED_BLOCK_TYPES.has(options.blockType)) {
    return { kind: 'convert-to-text' };
  }
  // 빈 본문 Backspace는 블록 삭제. (비어 있지 않은 맨 앞 Backspace의 merge는 at-start 경로)
  void options.canMergeWithPrevious;
  return { kind: 'delete-block' };
}

/** 인라인 텍스트 블록 맨 앞 Backspace */
export type NotionInlineBackspaceAtStartAction =
  | { kind: 'convert-to-text' }
  | { kind: 'default' };

export function resolveInlineBackspaceAtStartAction(
  blockType: NoteBlock['type'],
): NotionInlineBackspaceAtStartAction {
  return INLINE_DECORATED_BLOCK_TYPES.has(blockType)
    ? { kind: 'convert-to-text' }
    : { kind: 'default' };
}

export function createNotionEmptyBackspaceHandler(options: {
  getBlockType: () => NoteBlock['type'];
  canMergeWithPrevious: () => boolean;
  onConvertToText: () => void;
  onMergeWithPrevious: () => void;
  onDeleteEmptyBlock: () => void;
}): () => void {
  return () => {
    const action = resolveEmptyBackspaceAction({
      blockType: options.getBlockType(),
      canMergeWithPrevious: options.canMergeWithPrevious(),
    });
    if (action.kind === 'convert-to-text') {
      options.onConvertToText();
      return;
    }
    if (action.kind === 'merge-with-previous') {
      options.onMergeWithPrevious();
      return;
    }
    options.onDeleteEmptyBlock();
  };
}

/** 목록 — 블록 맨 앞 Backspace (Notion: outdent → merge → paragraph) */
export type NotionListBackspaceAtStartAction =
  | { kind: 'outdent' }
  | { kind: 'merge-with-previous' }
  | { kind: 'convert-to-text' };

export function resolveListBackspaceAtStartAction(options: {
  itemText: string;
  parentBlockId: string | null;
  canMergeWithPrevious: boolean;
}): NotionListBackspaceAtStartAction {
  if (options.itemText.length === 0) {
    return options.parentBlockId ? { kind: 'outdent' } : { kind: 'convert-to-text' };
  }
  if (options.canMergeWithPrevious) {
    return { kind: 'merge-with-previous' };
  }
  if (options.parentBlockId) {
    return { kind: 'outdent' };
  }
  return { kind: 'convert-to-text' };
}

/** 목록 — 빈 항목 Backspace (에디터 onEmptyBackspace) */
export function resolveListEmptyBackspaceAction(
  parentBlockId: string | null,
): NotionListBackspaceAtStartAction {
  return parentBlockId ? { kind: 'outdent' } : { kind: 'convert-to-text' };
}

/** page 블록 Enter·Space — true면 이벤트를 처리했다 */
export function handleNotionPageBlockKeyDown(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
  options: { isFocused: boolean; openPage: () => void },
): boolean {
  if (event.key === 'Enter' && !event.shiftKey) {
    resolvePageBlockEnterAction();
    options.openPage();
    return true;
  }
  if (event.key === ' ' && options.isFocused) {
    options.openPage();
    return true;
  }
  return false;
}
